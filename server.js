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

// Endpoint : Address geocoding
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

// Endpoint : itinerary calculation
app.post('/api/calculate-route', async (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;

    if (!baseAddress || !followingAddresses || !vehicle) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const points = [baseAddress, ...followingAddresses];
        const coordinates = points.map(pt => [pt.lon, pt.lat]);

        // Vehicle profile mapping
        const profileMapping = {
            car: "driving-car",
            electricCar: "driving-car",
            utility: "driving-hgv",
            electricUtility: "driving-hgv",
            bike: "cycling-regular",
            byFoot: "foot-walking"
        };
        const profile = profileMapping[vehicle] || "driving-car";

        // OpenRouteService API request
        const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
        const orsResponse = await fetch(orsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ORS_API_KEY
            },
            body: JSON.stringify({ coordinates })
        });

        if (!orsResponse.ok) {
            const errorDetails = await orsResponse.text();
            throw new Error(`ORS API error: ${orsResponse.status} - ${errorDetails}`);
        }

        const orsData = await orsResponse.json();
        if (!orsData.features || orsData.features.length === 0) {
            return res.status(500).json({ error: 'No route found' });
        }

        const route = orsData.features[0];
        const summary = route.properties.summary;

        // Carbon footprint calculation
        const carbonEmission = {
            car: 218,
            electricCar: 103,
            utility: 300,
            electricUtility: 150,
            bike: 6,
            byFoot: 0
        }[vehicle] || 0; // C02 per km in grams
        const carbonFootprint = (summary.distance / 1000) * carbonEmission; // carbon footprint total

        res.json({
            optimizedPoints: points,
            geometry: route.geometry,
            totalDistance: (summary.distance / 1000).toFixed(2), // km total
            totalTime: Math.round(summary.duration / 60), // time total
            carbonFootprint: carbonFootprint.toFixed(2) // carbon footprint total in grams
        });
    } catch (error) {
        console.error('Error calculating route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint : GPX File
app.post('/api/export-gpx', (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;

    if (!baseAddress || !followingAddresses || !vehicle) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const vehicleMapping = {
            car: "Driving",
            electricCar: "Driving",
            utility: "Driving",
            electricUtility: "Driving",
            bike: "Cycling",
            byFoot: "Walking",
        };
        const vehicleDescription = vehicleMapping[vehicle] || "Driving";

        const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FastPlaneco">
  <metadata>
    <name>Exported Route</name>
    <desc>Vehicle: ${vehicleDescription}</desc>
  </metadata>
  <trk>
    <name>Route</name>
    <trkseg>
      <trkpt lat="${baseAddress.lat}" lon="${baseAddress.lon}">
        <desc>${baseAddress.address}</desc>
      </trkpt>
      ${followingAddresses.map(addr => `
      <trkpt lat="${addr.lat}" lon="${addr.lon}">
        <desc>${addr.address}</desc>
      </trkpt>`).join('')}
    </trkseg>
  </trk>
</gpx>`;

        res.setHeader('Content-Disposition', 'attachment; filename="route.gpx"');
        res.setHeader('Content-Type', 'application/gpx+xml');
        res.send(gpxContent);
    } catch (error) {
        console.error('Error exporting GPX:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export to Google maps
app.post('/api/export-googlemaps', (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;

    if (!baseAddress || !Array.isArray(followingAddresses) || followingAddresses.length === 0 || !vehicle) {
        return res.status(400).json({ error: 'Missing required parameters or followingAddresses is empty' });
    }

    const exportPoints = [baseAddress, ...followingAddresses];
    if (exportPoints.length < 2) {
        return res.status(400).json({ error: 'At least two points needed (base + 1 following)' });
    }

    const origin = exportPoints[0];
    const destination = exportPoints[exportPoints.length - 1];

    const waypoints = exportPoints
        .slice(1, exportPoints.length - 1)        // tout sauf premier et dernier
        .map(pt => `${pt.lat},${pt.lon}`)          // “lat,lon”
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

    let url = `https://www.google.com/maps/dir/?api=1`
        + `&origin=${origin.lat},${origin.lon}`
        + `&destination=${destination.lat},${destination.lon}`
        + (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '')
        + `&travelmode=${travelMode}`;

    return res.json({ url });
});



// Server start
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});