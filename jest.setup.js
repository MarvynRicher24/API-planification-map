// jest.setup.js
jest.mock('node-fetch', () => jest.fn());
global.fetch = (...args) => require('node-fetch')(...args);