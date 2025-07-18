/**
 * @swagger
 * /api/geocode-address:
 *   post:
 *     summary: Geocode
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 example: Eiffel Tower
 *     responses:
 *       200:
 *         description: Geocode address
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                 lat:
 *                   type: number
 *                 lon:
 *                   type: number
 *       400:
 *         description: Bad request
 *       404:
 *         description: Adress not find
 */
const express = require('express');
const fetch = require('../utils/fetch');
const router = express.Router();

router.post('/', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing address query' });

    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
        );
        const data = await resp.json();
        if (!data.length) return res.status(404).json({ error: 'Address not found' });

        const { display_name: address, lat, lon } = data[0];
        res.json({ address, lat: parseFloat(lat), lon: parseFloat(lon) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;