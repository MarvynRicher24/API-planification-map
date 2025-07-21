# FastPlanEco API

FastPlanEco API is a lightweight Express.js service for planning optimized routes with TSP (Traveling Salesman Problem), geocoding addresses, and exporting results in GPX or Google Maps URL formats. It also includes Swagger UI documentation.

---

## Features

* **Address Geocoding**: Convert a free-text address into latitude and longitude using OpenStreetMap Nominatim.
* **Route Optimization**: Solve the TSP for up to 8 waypoints using OSRM distance matrices and a brute-force algorithm.
* **Route Calculation**: Retrieve optimized route geometry (GeoJSON) and compute distance and duration via OSRM and OpenRouteService.
* **Carbon Footprint**: Estimate CO₂ emissions for different vehicle types (car, electric car, utility, bike, foot).
* **Export to GPX**: Generate a GPX file of the optimized route for GPS devices.
* **Export to Google Maps**: Produce a `https://www.google.com/maps/dir/?api=1` URL with waypoints for interactive visualization.
* **Swagger UI**: Interactive API documentation at `/api-docs` (OpenAPI 3.0).

---

## Prerequisites

* Node.js v18+
* Docker (optional, for containerized deployment)
* OpenRouteService API key (`ORS_API_KEY`)

---

## Installation

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd fastplaneco-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file at the project root:

   ```ini
   ORS_API_KEY=your_openrouteservice_api_key
   PORT=5000
   ```

4. Start the server:

   ```bash
   npm start
   ```

Your API is now running at `http://localhost:5000`.

---

## API Endpoints

All endpoints accept and return JSON (except GPX export). Base path: `/api`.

### 1. Geocode Address

**POST** `/api/geocode-address`

Request body:

```json
{ "query": "Eiffel Tower, Paris" }
```

Success response (200):

```json
{
  "address": "Eiffel Tower, Paris, France",
  "lat": 48.8584,
  "lon": 2.2945
}
```

Errors:

* `400 Bad Request` if `query` is missing
* `404 Not Found` if address not found

### 2. Calculate Route

**POST** `/api/calculate-route`

Request body:

```json
{
  "baseAddress": { "address": "A", "lat": 0, "lon": 0 },
  "followingAddresses": [ { "address":"B","lat":0,"lon":1 } ],
  "vehicle": "car"
}
```

Success response (200):

```json
{
  "optimizedPoints": [ ...array of points... ],
  "geometry": { ...GeoJSON... },
  "totalDistance": "X.XX",
  "totalTime": minutes,
  "carbonFootprint": number
}
```

Errors:

* `400 Bad Request` if parameters missing
* `500 Internal Server Error` on failures

### 3. Export GPX

**POST** `/api/export-gpx`

Request body: same as calculate-route.

Success response (200) with `Content-Type: application/gpx+xml` containing the GPX track.

### 4. Export Google Maps URL

**POST** `/api/export-googlemaps`

Request body: same as calculate-route.

Success response (200):

```json
{ "url": "https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...&travelmode=..." }
```

---

## Running Tests

This project uses Jest and Supertest for unit and integration tests.

### Locally

```bash
npm test
```

### In Docker

1. Build the builder stage:

   ```bash
   docker build --target builder -t fastplaneco-api-builder .
   ```
2. Run tests in a ephemeral container:

   ```bash
   docker run --rm \
     -e ORS_API_KEY=your_key \
     fastplaneco-api-builder \
     npm test
   ```

---

## Docker Deployment

### Dockerfile (multistage)

```dockerfile
# Builder stage
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Runner stage
FROM node:18-alpine AS runner
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/package-lock.json ./
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/src/utils ./src/utils
COPY --from=builder /usr/src/app/src/routes ./src/routes
RUN npm ci --only=production
EXPOSE 5000
CMD ["node","src/index.js"]
```

### Build and Run

```bash
# Build image
docker build -t fastplaneco-api .

# Run container
docker run -d \
  --name fastplaneco-api \
  -p 5000:5000 \
  -e ORS_API_KEY=your_key \
  fastplaneco-api
```

Check status:

```bash
docker ps
docker logs -f fastplaneco-api
```

To stop and remove:

```bash
docker stop fastplaneco-api
docker rm fastplaneco-api
```

---

## Swagger Documentation

Swagger UI is available at `http://localhost:5000/api-docs`.

* Interactive interface to test each endpoint
* View request/response schemas
* Explore the `Point` schema under **Components**

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/XYZ`)
3. Commit your changes (`git commit -m "Add XYZ"`)
4. Push to the branch (`git push origin feature/XYZ`)
5. Open a Pull Request

Please ensure all tests pass and update documentation if needed.