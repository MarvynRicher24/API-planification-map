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