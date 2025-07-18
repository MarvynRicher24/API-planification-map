require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const geocodeRouter = require('./routes/geocode');
const calculateRouter = require('./routes/calculateRoute');
const gpxRouter = require('./routes/exportGpx');
const mapsRouter = require('./routes/exportGoogleMaps');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

// Montée en charge des routes
app.use('/api/geocode-address', geocodeRouter);
app.use('/api/calculate-route', calculateRouter);
app.use('/api/export-gpx', gpxRouter);
app.use('/api/export-googlemaps', mapsRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});