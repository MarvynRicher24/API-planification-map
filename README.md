# Itinerary API Service

This project is a standalone **Node.js and Express** API for route optimization and planning, originally derived from a React-based map planning application. It provides powerful routing functionalities via HTTP endpoints, without any frontend UI.

## Key Features

* **Optimized Route Calculation**: Solve the Traveling Salesman Problem (TSP) to compute the fastest itinerary through multiple waypoints.
* **Accurate Distance & Time**: Fetch route distance and travel time using OSRM and OpenRouteService APIs, tailored to the chosen vehicle type.
* **Environmental Impact**: Calculate CO₂ emissions based on distance and vehicle-specific emission factors (g CO₂/km).
* **Google Maps Export**: Generate a shareable Google Maps Directions URL for the optimized route.
* **GPX Export**: Produce a GPX file of the optimized route for use in GPS devices and mapping software.

## Table of Contents

* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Configuration](#configuration)
* [Available Endpoints](#available-endpoints)
* [Usage Examples](#usage-examples)
* [Scripts](#scripts)
* [Contributing](#contributing)
* [License](#license)

## Prerequisites

* **Node.js** v14+
* **npm** v6+
* A valid **OpenRouteService (ORS) API key** (for precise travel time calculations)
* Internet access for API calls to OSRM and OpenRouteService

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/itinerary-api.git
   cd itinerary-api
   ```
2. Install dependencies:

   ```bash
   npm install
   ```

## Configuration

1. Create a `.env` file in the project root:

   ```ini
   PORT=5000
   ORS_API_KEY=your_openrouteservice_api_key_here
   ```
2. (Optional) Adjust the `PORT` as needed.

## Available Endpoints

### 1. **Geocode Address**

**POST** `/api/geocode-address`

* **Body** (JSON):

  ```json
  { "query": "1600 Amphitheatre Parkway, Mountain View, CA" }
  ```
* **Response** (200):

  ```json
  {
    "address": "1600 Amphitheatre Parkway, ...",
    "lat": 37.4220,
    "lon": -122.0841
  }
  ```

### 2. **Calculate Optimized Route**

**POST** `/api/calculate-route`

* **Body** (JSON):

  ```json
  {
    "baseAddress": { "address": "Paris, France", "lat": 48.8566, "lon": 2.3522 },
    "followingAddresses": [
      { "address": "Lyon, France", "lat": 45.7640, "lon": 4.8357 },
      { "address": "Toulouse, France", "lat": 43.6045, "lon": 1.4440 }
    ],
    "vehicle": "car"
  }
  ```
* **Response** (200):

  ```json
  {
    "optimizedPoints": [ /* ordered list of addresses */ ],
    "geometry": { /* GeoJSON LineString */ },
    "totalDistance": "xxx.xx", // km
    "totalTime": 123,          // minutes
    "carbonFootprint": "yyy.yy" // grams CO₂
  }
  ```

### 3. **Export to Google Maps**

**POST** `/api/export-googlemaps`

* **Same request body as `/calculate-route`**
* **Response** (200):

  ```json
  { "url": "https://www.google.com/maps/dir/?api=1&..." }
  ```

### 4. **Export GPX File**

**POST** `/api/export-gpx`

* **Same request body as `/calculate-route`**
* **Response** (200, `application/gpx+xml`): raw GPX XML content

## Usage Examples

1. **Start the server**:

   ```bash
   npm run start
   # or for development with auto-reload:
   npm run dev
   ```

2. **Test with curl**:

   ```bash
   curl -X POST http://localhost:5000/api/calculate-route \
     -H "Content-Type: application/json" \
     -d '{ "baseAddress": { "address": "Paris, France", "lat": 48.8566, "lon": 2.3522 }, "followingAddresses": [{ "address": "Lyon, France", "lat": 45.7640, "lon": 4.8357 }], "vehicle": "car" }'
   ```

## Scripts

| Command       | Description                           |
| ------------- | ------------------------------------- |
| `npm start`   | Run server in production mode         |
| `npm run dev` | Run server with nodemon (auto-reload) |