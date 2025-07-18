const express = require('express');
const { getDistanceMatrix, getRouteGeoJSON } = require('../utils/osrmClient');
const { solveTSP } = require('../utils/tsp');
const { getDuration } = require('../utils/orsClient');

const emission = { car: 218, electricCar: 103, utility: 218, electricUtility: 103, bike: 6, byFoot: 0 };
const speedFallback = { car: 60, electricCar: 60, utility: 60, electricUtility: 60, bike: 15, byFoot: 5 };
const profileMap = { car: 'driving-car', electricCar: 'driving-car', utility: 'driving-car', electricUtility: 'driving-car', bike: 'cycling-regular', byFoot: 'foot-walking' };

const router = express.Router();
router.post('/', async (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;
    if (!baseAddress || !followingAddresses.length || !vehicle)
        return res.status(400).json({ error: 'Bad request' });

    try {
        const points = [baseAddress, ...followingAddresses];
        const matrix = await getDistanceMatrix(points);
        const { order } = solveTSP(matrix);
        const optimized = [baseAddress, ...order.map(i => points[i])];

        const route = await getRouteGeoJSON(optimized);
        const distKm = (route.distance / 1000).toFixed(2);

        let durationSec;
        try {
            durationSec = await getDuration(optimized, profileMap[vehicle]);
        } catch {
            durationSec = (route.distance / 1000) / speedFallback[vehicle] * 3600;
        }

        res.json({
            optimizedPoints: optimized,
            geometry: route.geometry,
            totalDistance: distKm,
            totalTime: Math.floor(durationSec / 60),
            carbonFootprint: (route.distance / 1000) * emission[vehicle],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
module.exports = router;