const fetch = require('./fetch');
const ORS_API_KEY = process.env.ORS_API_KEY;

async function getDuration(coords, profile) {
    const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
    const body = JSON.stringify({ coordinates: coords.map(c => [c.lon, c.lat]) });
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: ORS_API_KEY,
        },
        body,
    });
    if (!res.ok) throw new Error('ORS error');
    const data = await res.json();
    return data.features[0].properties.segments.reduce((sum, s) => sum + s.duration, 0);
}

module.exports = { getDuration };