This is a small JSON-storage Express API used as an external persistence layer for the Next app.

Endpoints:
- GET /intents
- POST /intents
- GET /users
- GET /users/:id
- POST /users

Usage:
- install: npm install
- start: npm start

Deploy on Render or similar and set the Next app env variable `EXTERNAL_API_URL` to the deployed URL (e.g. https://my-json-api.onrender.com).

Notes:
- Uses atomic file writes (tmp + rename) to avoid partial writes.
- For production replace with a managed DB.
