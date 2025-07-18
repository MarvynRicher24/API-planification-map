const request = require('supertest');
const express = require('express');
const gpxRouter = require('../src/routes/exportGpx');

jest.mock('../src/utils/fetch');
const fetch = require('../src/utils/fetch');

describe('POST /api/export-gpx', () => {
    let app;
    const base = { address: 'A', lat: 0, lon: 0 };
    const p1 = { address: 'B', lat: 0, lon: 1 };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/export-gpx', gpxRouter);
    });

    it('génère un GPX valide', async () => {
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
            .post('/api/export-gpx')
            .send({
                baseAddress: base,
                followingAddresses: [p1],
                vehicle: 'bike'
            });

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/gpx\+xml/);
        expect(res.text).toMatch(/<gpx.*creator="FastPlaneco".*<\/gpx>/s);
        expect(res.text).toContain('<trkpt lat="0" lon="0">');
        expect(res.text).toContain('<trkpt lat="0" lon="1">');
    });
});
