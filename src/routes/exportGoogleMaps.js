const express = require('express');
const { getDistanceMatrix } = require('../utils/osrmClient');
const { solveTSP } = require('../utils/tsp');

const travelMode = { car: 'driving', electricCar: 'driving', utility: 'driving', electricUtility: 'driving', bike: 'bicycling', byFoot: 'walking' };

const router = express.Router();
router.post('/', async (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;
    if (!baseAddress || !followingAddresses.length) return res.status(400).json({ error: 'Bad request' });

    try {
        const points = [baseAddress, ...followingAddresses];
        const matrix = await getDistanceMatrix(points);
        const { order } = solveTSP(matrix);
        const optimized = [baseAddress, ...order.map(i => points[i])];

        const origin = optimized[0];
        const destination = optimized.at(-1);
        const waypoints = optimized.slice(1, -1).map(p => `${p.lat},${p.lon}`).join('|');

        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}` +
            `&destination=${destination.lat},${destination.lon}` +
            (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '') +
            `&travelmode=${travelMode[vehicle]}`;

        res.json({ url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
module.exports = router;