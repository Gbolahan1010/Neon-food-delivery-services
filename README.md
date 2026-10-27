# Neon Food Delivery

A full-stack food ordering platform for independent restaurants, built with the MERN stack
(MongoDB, Express, React, Node.js). Customers browse restaurants, order and track their food;
restaurant owners manage their menus and incoming orders; an admin approves restaurants and
manages users.

**Live API:** https://neon-food-delivery-services.onrender.com
(health check: [/api/health](https://neon-food-delivery-services.onrender.com/api/health) |
restaurants: [/api/restaurants](https://neon-food-delivery-services.onrender.com/api/restaurants))

**Live website:** _coming soon (Vercel)_

> The API runs on Render's free tier, which sleeps after 15 minutes without traffic.
> The first request after a pause can take up to a minute while it wakes up.

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | React (Vite), React Router, Tailwind CSS _(in progress)_ |
| Back end | Node.js, Express 5 |
| Database | MongoDB Atlas with Mongoose |
| Auth and security | bcrypt, JWT in httpOnly cookies, express-validator, Helmet, express-rate-limit |
| External APIs | Stripe Checkout (test mode), OpenStreetMap Nominatim _(in progress)_ |
| Testing | Jest, Supertest, mongodb-memory-server (63 automated tests) |
| Hosting | Render (API), MongoDB Atlas (database), Vercel (front end, planned) |

## Progress

- [x] Requirements, repository and tooling
- [x] Express server, MongoDB connection, data models, error handling
- [x] Authentication, authorisation and security
- [x] Restaurants, menus, orders and admin API
- [x] API deployed to Render
- [ ] Stripe payments and address geocoding
- [ ] React front end
- [ ] CI pipeline and front-end deployment

## API

All responses use one shape: `{ "success": true, "data": ... , "meta"? }` or
`{ "success": false, "message": "...", "errors"?: [ ... ] }`.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | /api/health | Public | API and database status |
| POST | /api/auth/register | Public | Create an account (customer or owner) |
| POST | /api/auth/login | Public | Log in; sets an httpOnly session cookie |
| POST | /api/auth/logout | Public | Clear the session cookie |
| GET | /api/auth/me | Logged in | Current user |
| GET | /api/restaurants?search=&cuisine=&page=&limit= | Public | Approved restaurants, searchable and paginated |
| GET | /api/restaurants/:id | Public | A restaurant and its available menu |
| GET | /api/restaurants/mine | Owner | The owner's restaurants, including pending ones |
| POST | /api/restaurants | Owner | Create a restaurant (waits for admin approval) |
| PUT | /api/restaurants/:id | Owner (own), Admin | Update a restaurant |
| DELETE | /api/restaurants/:id | Owner (own), Admin | Delete a restaurant and its menu |
| GET | /api/restaurants/:id/menu | Owner (own), Admin | Full menu, including hidden dishes |
| POST | /api/restaurants/:id/menu | Owner (own), Admin | Add a dish |
| PUT | /api/menu/:itemId | Owner (own), Admin | Edit a dish |
| DELETE | /api/menu/:itemId | Owner (own), Admin | Delete a dish |
| POST | /api/orders | Customer | Place an order (prices are calculated on the server) |
| GET | /api/orders/mine | Customer | Order history |
| GET | /api/orders/:id | Customer (own), Owner (own restaurant), Admin | One order |
| GET | /api/orders/restaurant/:id?status= | Owner (own), Admin | Incoming orders for a restaurant |
| PATCH | /api/orders/:id/status | Owner, Admin; customer may cancel | Move an order to its next status |
| GET | /api/admin/restaurants?approved= | Admin | All restaurants, including the approval queue |
| PATCH | /api/admin/restaurants/:id/approval | Admin | Approve or unapprove a restaurant |
| GET | /api/admin/users?role= | Admin | List users |
| PATCH | /api/admin/users/:id/status | Admin | Suspend or reactivate a user |

## Demo accounts (test data only)

All seeded accounts use the password `NeonDemo123`.

| Role | Email |
| --- | --- |
| Admin | admin@neon.test |
| Restaurant owner | owner@neon.test, owner2@neon.test |
| Customer | customer@neon.test |

## Security highlights

- Passwords hashed with bcrypt (cost 12) and never returned by the API
- Sessions held in an httpOnly, SameSite cookie (Secure in production), signed with HS256
- Role-based access control plus ownership checks on every write
- Input validated on every route; NoSQL injection blocked by type checks and Mongoose `sanitizeFilter`
- Prices always taken from the database, never from the client
- Helmet security headers, rate limiting on login and the whole API, 10 KB request limit
- Generic login errors with equal-time password checks to prevent account enumeration

## Running locally

Requirements: Node.js 20 or newer and a MongoDB Atlas cluster (the free tier is fine).

    cd server
    npm install
    cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
    npm run seed              # loads demo restaurants and accounts
    npm run dev               # API on http://localhost:5000

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm start` | Start the API (production) |
| `npm run seed` | Reset the database with demo data |
| `npm test` | Run the 63 tests against an in-memory MongoDB |
| `npm run lint` | Check code style with ESLint |

## Project structure

    server/
      src/
        config/        environment and database connection
        models/        Mongoose schemas (User, Restaurant, MenuItem, Order)
        validators/    request validation rules
        routes/        Express routers
        controllers/   HTTP layer: read the request, call a service, send the response
        services/      business logic (pricing, ownership, order status rules)
        middleware/    authentication, roles, validation, error handling
        utils/         AppError, token and pagination helpers
        app.js         builds the Express app
        server.js      connects to MongoDB and starts listening
      scripts/seed.js  demo data
      tests/           Jest + Supertest tests

## Licence

MIT
