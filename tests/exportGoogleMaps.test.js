const request = require('supertest');
const express = require('express');
const mapsRouter = require('../src/routes/exportGoogleMaps');

jest.mock('../src/utils/fetch');
const fetch = require('../src/utils/fetch');

describe('POST /api/export-googlemaps', () => {
    let app;
    const base = { address: 'A', lat: 0, lon: 0 };
    const p1 = { address: 'B', lat: 0, lon: 1 };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/export-googlemaps', mapsRouter);
    });

    it('retourne une URL Google Maps bien formée', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                code: 'Ok',
                distances: [
                    [0, 1000],
                    [1000, 0]
                ]
            })
        });

        const res = await request(app)
            .post('/api/export-googlemaps')
            .send({
                baseAddress: base,
                followingAddresses: [p1],
                vehicle: 'byFoot'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('url');
        expect(res.body.url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1/);
        expect(res.body.url).toContain('origin=0,0');
        expect(res.body.url).toContain('destination=0,1');
        expect(res.body.url).toContain('travelmode=walking');
    });
});
