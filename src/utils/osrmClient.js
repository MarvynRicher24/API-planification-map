const fetch = require('./fetch');

async function getDistanceMatrix(coords) {
    const coordsStr = coords.map(c => `${c.lon},${c.lat}`).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?annotations=distance`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error('OSRM table error');
    return data.distances;
}

async function getRouteGeoJSON(coords) {
    const coordsStr = coords.map(c => `${c.lon},${c.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error('OSRM route error');
    return data.routes[0];
}

module.exports = { getDistanceMatrix, getRouteGeoJSON };