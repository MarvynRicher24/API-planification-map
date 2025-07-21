const request = require('supertest');
const express = require('express');
const geocodeRouter = require('../src/routes/geocode');

jest.mock('../src/utils/fetch');
const fetch = require('../src/utils/fetch');

describe('POST /api/geocode-address', () => {
    let app;
    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/geocode-address', geocodeRouter);
    });

    it('returns 400 if no query', async () => {
        const res = await request(app).post('/api/geocode-address').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Missing address query/);
    });

    it('returns a valid result if Nominatim returns an item', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => [{
                display_name: 'Eiffel Tower, Paris, France',
                lat: '48.8584',
                lon: '2.2945'
            }]
        });

        const res = await request(app)
            .post('/api/geocode-address')
            .send({ query: 'Eiffel Tower' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            address: 'Eiffel Tower, Paris, France',
            lat: 48.8584,
            lon: 2.2945
        });
    });

    it('returns 404 if Nominatim finds nothing', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        const res = await request(app)
            .post('/api/geocode-address')
            .send({ query: 'Unknown' });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Address not found/);
    });
});
