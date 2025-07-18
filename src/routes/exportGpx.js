/**
 * @swagger
 * /api/export-gpx:
 *   post:
 *     summary: GPX File
 *     tags:
 *       - Export
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [baseAddress, followingAddresses]
 *             properties:
 *               baseAddress:
 *                 $ref: '#/components/schemas/Point'
 *               followingAddresses:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Point'
 *               vehicle:
 *                 type: string
 *                 enum: [car, electricCar, utility, electricUtility, bike, byFoot]
 *     responses:
 *       200:
 *         description: GPX File
 *         content:
 *           application/gpx+xml:
 *             schema:
 *               type: string
 *               format: xml
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal error
 */
const express = require('express');
const { getDistanceMatrix } = require('../utils/osrmClient');
const { solveTSP } = require('../utils/tsp');

const router = express.Router();
router.post('/', async (req, res) => {
    const { baseAddress, followingAddresses, vehicle } = req.body;
    if (!baseAddress || !followingAddresses.length) return res.status(400).json({ error: 'Bad request' });

    try {
        const points = [baseAddress, ...followingAddresses];
        const matrix = await getDistanceMatrix(points);
        const { order } = solveTSP(matrix);
        const optimized = [baseAddress, ...order.map(i => points[i])];

        let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        gpx += `<gpx version="1.1" creator="FastPlaneco">\n<trk><trkseg>\n`;
        optimized.forEach(p => {
            gpx += `<trkpt lat="${p.lat}" lon="${p.lon}"><desc>${p.address}</desc></trkpt>\n`;
        });
        gpx += `</trkseg></trk></gpx>`;

        res.set('Content-Type', 'application/gpx+xml');
        res.send(gpx);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
module.exports = router;