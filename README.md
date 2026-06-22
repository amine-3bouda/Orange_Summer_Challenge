# Orange Summer Challenge

## Run

Frontend: `npm install` then `npm run dev`

Backend: create a `.env` file with `MONGODB_URI`, `PORT`, and `JWT_SECRET`, then run `npm run dev:server`

Auth flow: register or log in through the app, and new users start with `100 coins`.

Artwork access: only the logged-in owner can edit or delete their artwork.

## Tech

- React
- Vite
- Express
- MongoDB
- Mongoose
- JWT
- Node.js

## Known issues

- MongoDB must be running before the API starts.
- The backend needs a valid `JWT_SECRET` in `.env`.
- Ownership checks depend on the user being logged in.
