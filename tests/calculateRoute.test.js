const request = require('supertest');
const express = require('express');
const calculateRouter = require('../src/routes/calculateRoute');

jest.mock('../src/utils/fetch');
const fetch = require('../src/utils/fetch');

describe('POST /api/calculate-route', () => {
    let app;
    const base = { address: 'A', lat: 0, lon: 0 };
    const p1 = { address: 'B', lat: 0, lon: 1 };
    const p2 = { address: 'C', lat: 1, lon: 0 };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/calculate-route', calculateRouter);
    });

    it('returns 400 if parameters missing', async () => {
        const res = await request(app).post('/api/calculate-route').send({});
        expect(res.status).toBe(400);
    });

    it('optimizes and returns distance, time and footprint', async () => {
        // 1) OSRM table
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    code: 'Ok',
                    distances: [
                        [0, 1000, 2000],
                        [1000, 0, 500],
                        [2000, 500, 0]
                    ]
                })
            })
            // 2) OSRM route
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    code: 'Ok',
                    routes: [{
                        distance: 1500,
                        geometry: { type: 'LineString', coordinates: [] }
                    }]
                })
            })
            // 3) ORS directions
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    features: [{
                        properties: {
                            segments: [{ duration: 600 }, { duration: 300 }]
                        }
                    }]
                })
            });

        const res = await request(app)
            .post('/api/calculate-route')
            .send({
                baseAddress: base,
                followingAddresses: [p1, p2],
                vehicle: 'car'
            });

        expect(res.status).toBe(200);
        expect(res.body.totalDistance).toBe('1.50');      // 1500 m → 1.50 km
        expect(parseFloat(res.body.carbonFootprint)).toBeCloseTo(1.50 * 251, 0);
        expect(res.body.optimizedPoints.length).toBe(3);
        expect(res.body.geometry).toHaveProperty('type', 'LineString');
    });
});
