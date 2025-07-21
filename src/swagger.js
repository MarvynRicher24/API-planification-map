const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        components: {
            schemas: {
                Point: {
                    type: 'object',
                    required: ['address', 'lat', 'lon'],
                    properties: {
                        address: { type: 'string', example: 'Eiffel Tower, Paris' },
                        lat: { type: 'number', example: 48.8584 },
                        lon: { type: 'number', example: 2.2945 }
                    },
                    required: ['address', 'lat', 'lon']
                }
            }
        },
        info: {
            title: 'FastPlanEco API',
            version: '1.0.0',
            description: 'Fastplaneco API, optimisation and itinerary API'
        },
        servers: [
            { url: 'http://localhost:5000', description: 'Local Server' }
        ]
    },
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };