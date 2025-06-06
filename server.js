const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// OpenRouteService API KEY
const ORS_API_KEY = '5b3ce3597851110001cf62482990c084e35f41e1b1cdafe113a39b59';

// Address geocoding
app.post('/api/geocode-address', async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'Missing address query' });
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            const result = data[0];
            res.json({
                address: result.display_name,
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
            });
        } else {
            res.status(404).json({ error: 'Address not found' });
        }
    } catch (error) {
        console.error('Error during geocoding:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Itinerary calculation with TSP optimization
app.post('/api/calculate-route', async (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;

    if (
        !baseAddress ||
        !Array.isArray(followingAddresses) ||
        followingAddresses.length === 0 ||
        !vehicle
    ) {
        return res
            .status(400)
            .json({ error: 'Missing required parameters or followingAddresses is empty' });
    }

    try {
        const points = [baseAddress, ...followingAddresses];
        if (points.length < 2) {
            return res
                .status(400)
                .json({ error: 'At least two points needed (base + 1 following)' });
        }

        const coordsStr = points.map(pt => `${pt.lon},${pt.lat}`).join(';');
        const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?annotations=distance`;
        const tableResponse = await fetch(tableUrl);
        const tableData = await tableResponse.json();

        if (!tableData || tableData.code !== 'Ok') {
            console.error('Error fetching OSRM table:', tableData);
            return res
                .status(500)
                .json({ error: 'Error fetching distance matrix from OSRM' });
        }

        const distanceMatrix = tableData.distances;

        const followingIndices = followingAddresses.map((_, i) => i + 1);
        const permutations = arr => {
            if (arr.length === 0) return [[]];
            const result = [];
            for (let i = 0; i < arr.length; i++) {
                const current = arr[i];
                const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
                for (const perm of permutations(remaining)) {
                    result.push([current, ...perm]);
                }
            }
            return result;
        };
        const allPermutations = permutations(followingIndices);

        let bestOrder = null;
        let bestDistance = Infinity;
        allPermutations.forEach(order => {
            let distAccum = 0;
            let currentIndex = 0;
            order.forEach(idx => {
                distAccum += distanceMatrix[currentIndex][idx];
                currentIndex = idx;
            });
            if (distAccum < bestDistance) {
                bestDistance = distAccum;
                bestOrder = order;
            }
        });

        const optimizedFollowing = bestOrder.map(idx => points[idx]);
        const optimizedPoints = [baseAddress, ...optimizedFollowing];

        const routeCoordsStr = optimizedPoints.map(pt => `${pt.lon},${pt.lat}`).join(';');
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${routeCoordsStr}?overview=full&geometries=geojson`;
        const routeResponse = await fetch(routeUrl);
        const routeData = await routeResponse.json();

        if (!routeData || routeData.code !== 'Ok') {
            console.error('Error fetching OSRM route:', routeData);
            return res.status(500).json({ error: 'Error fetching route from OSRM' });
        }

        const routeInfo = routeData.routes[0];
        const osrmDistance = routeInfo.distance;

        const totalDistanceKm = (osrmDistance / 1000).toFixed(2);

        const emissionMapping = {
            car: 218,
            electricCar: 103,
            utility: 218,
            electricUtility: 103,
            bike: 6,
            byFoot: 0
        };
        const emissionPerKm = emissionMapping[vehicle] || 0;
        const carbonFootprint = (osrmDistance / 1000) * emissionPerKm;

        let totalTimeMin;
        try {
            const profileMapping = {
                car: 'driving-car',
                electricCar: 'driving-car',
                utility: 'driving-car',
                electricUtility: 'driving-car',
                bike: 'cycling-regular',
                byFoot: 'foot-walking'
            };
            const profile = profileMapping[vehicle] || 'driving-car';

            const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
            const orsBody = {
                coordinates: optimizedPoints.map(pt => [pt.lon, pt.lat])
            };

            const orsResponse = await fetch(orsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: ORS_API_KEY
                },
                body: JSON.stringify(orsBody)
            });

            if (!orsResponse.ok) {
                const errorText = await orsResponse.text();
                throw new Error(`ORS API error: ${orsResponse.status} - ${errorText}`);
            }

            const orsData = await orsResponse.json();
            if (
                orsData.features &&
                orsData.features.length > 0 &&
                orsData.features[0].properties &&
                orsData.features[0].properties.segments
            ) {
                const segments = orsData.features[0].properties.segments;
                const totalDurationSec = segments.reduce((sum, seg) => sum + seg.duration, 0);
                totalTimeMin = Math.floor(totalDurationSec / 60);
            } else {
                throw new Error('ORS did not return valid segments');
            }
        } catch (err) {
            console.error('Error fetching time from ORS:', err);
            const speedMappingFallback = {
                car: 60,
                electricCar: 60,
                utility: 60,
                electricUtility: 60,
                bike: 15,
                byFoot: 5
            };
            const fallbackSpeed = speedMappingFallback[vehicle] || 60;
            totalTimeMin = Math.floor((osrmDistance / 1000) / fallbackSpeed * 60);
        }

        return res.json({
            optimizedPoints,
            geometry: routeInfo.geometry,
            totalDistance: totalDistanceKm,
            totalTime: totalTimeMin,
            carbonFootprint: carbonFootprint.toFixed(2)
        });
    } catch (error) {
        console.error('Error calculating optimized route:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Export GPX with TSP optimization
app.post('/api/export-gpx', async (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;

    if (
        !baseAddress ||
        !Array.isArray(followingAddresses) ||
        followingAddresses.length === 0 ||
        !vehicle
    ) {
        return res
            .status(400)
            .json({ error: 'Missing required parameters or followingAddresses is empty' });
    }

    try {
        const points = [baseAddress, ...followingAddresses];
        if (points.length < 2) {
            return res
                .status(400)
                .json({ error: 'At least two points needed (base + 1 following)' });
        }

        const coordsStr = points.map(pt => `${pt.lon},${pt.lat}`).join(';');
        const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?annotations=distance`;
        const tableResponse = await fetch(tableUrl);
        const tableData = await tableResponse.json();

        if (!tableData || tableData.code !== 'Ok') {
            console.error('Error fetching OSRM table:', tableData);
            return res
                .status(500)
                .json({ error: 'Error fetching distance matrix from OSRM' });
        }

        const distanceMatrix = tableData.distances;

        const followingIndices = followingAddresses.map((_, i) => i + 1);
        const permutations = arr => {
            if (arr.length === 0) return [[]];
            const result = [];
            for (let i = 0; i < arr.length; i++) {
                const current = arr[i];
                const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
                for (const perm of permutations(remaining)) {
                    result.push([current, ...perm]);
                }
            }
            return result;
        };
        const allPermutations = permutations(followingIndices);

        let bestOrder = null;
        let bestDistance = Infinity;
        allPermutations.forEach(order => {
            let distAccum = 0;
            let currentIndex = 0;
            order.forEach(idx => {
                distAccum += distanceMatrix[currentIndex][idx];
                currentIndex = idx;
            });
            if (distAccum < bestDistance) {
                bestDistance = distAccum;
                bestOrder = order;
            }
        });

        const optimizedFollowing = bestOrder.map(idx => points[idx]);
        const optimizedPoints = [baseAddress, ...optimizedFollowing];

        let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        gpxContent += `<gpx version="1.1" creator="FastPlaneco" xmlns="http://www.topografix.com/GPX/1/1">\n`;
        gpxContent += `  <metadata>\n`;
        gpxContent += `    <name>Optimized Route</name>\n`;
        gpxContent += `    <desc>Vehicle: ${vehicle}</desc>\n`;
        gpxContent += `  </metadata>\n`;
        gpxContent += `  <trk>\n`;
        gpxContent += `    <name>FastPlaneco GPX</name>\n`;
        gpxContent += `    <trkseg>\n`;
        optimizedPoints.forEach(pt => {
            gpxContent += `      <trkpt lat="${pt.lat}" lon="${pt.lon}">\n`;
            gpxContent += `        <desc>${pt.address}</desc>\n`;
            gpxContent += `      </trkpt>\n`;
        });
        gpxContent += `    </trkseg>\n`;
        gpxContent += `  </trk>\n`;
        gpxContent += `</gpx>`;

        res.set('Content-Type', 'application/gpx+xml');
        return res.send(gpxContent);
    } catch (error) {
        console.error('Error exporting optimized GPX:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Export to Google Maps with TSP optimization
app.post('/api/export-googlemaps', async (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;

    if (
        !baseAddress ||
        !Array.isArray(followingAddresses) ||
        followingAddresses.length === 0 ||
        !vehicle
    ) {
        return res
            .status(400)
            .json({ error: 'Missing required parameters or followingAddresses is empty' });
    }

    try {
        const points = [baseAddress, ...followingAddresses];
        if (points.length < 2) {
            return res
                .status(400)
                .json({ error: 'At least two points needed (base + 1 following)' });
        }

        const coordsStr = points.map(pt => `${pt.lon},${pt.lat}`).join(';');
        const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?annotations=distance`;
        const tableResponse = await fetch(tableUrl);
        const tableData = await tableResponse.json();

        if (!tableData || tableData.code !== 'Ok') {
            console.error('Error fetching OSRM table:', tableData);
            return res
                .status(500)
                .json({ error: 'Error fetching distance matrix from OSRM' });
        }

        const distanceMatrix = tableData.distances;

        const followingIndices = followingAddresses.map((_, i) => i + 1);
        const permutations = arr => {
            if (arr.length === 0) return [[]];
            const result = [];
            for (let i = 0; i < arr.length; i++) {
                const current = arr[i];
                const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
                for (const perm of permutations(remaining)) {
                    result.push([current, ...perm]);
                }
            }
            return result;
        };
        const allPermutations = permutations(followingIndices);

        let bestOrder = null;
        let bestDistance = Infinity;
        allPermutations.forEach(order => {
            let distAccum = 0;
            let currentIndex = 0;
            order.forEach(idx => {
                distAccum += distanceMatrix[currentIndex][idx];
                currentIndex = idx;
            });
            if (distAccum < bestDistance) {
                bestDistance = distAccum;
                bestOrder = order;
            }
        });

        const optimizedFollowing = bestOrder.map(idx => points[idx]);
        const optimizedPoints = [baseAddress, ...optimizedFollowing];

        const origin = optimizedPoints[0];
        const destination = optimizedPoints[optimizedPoints.length - 1];
        const waypoints = optimizedPoints
            .slice(1, optimizedPoints.length - 1)
            .map(pt => `${pt.lat},${pt.lon}`)
            .join('|');

        const travelModeMapping = {
            car: 'driving',
            electricCar: 'driving',
            utility: 'driving',
            electricUtility: 'driving',
            bike: 'bicycling',
            byFoot: 'walking',
        };
        const travelMode = travelModeMapping[vehicle] || 'driving';

        const url = `https://www.google.com/maps/dir/?api=1`
            + `&origin=${origin.lat},${origin.lon}`
            + `&destination=${destination.lat},${destination.lon}`
            + (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '')
            + `&travelmode=${travelMode}`;

        return res.json({ url });
    } catch (error) {
        console.error('Error exporting optimized Google Maps URL:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Server start
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});