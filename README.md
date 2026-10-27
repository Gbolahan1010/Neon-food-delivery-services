# Neon Food Delivery

[![CI](https://github.com/Gbolahan1010/Neon-food-delivery-services/actions/workflows/ci.yml/badge.svg)](https://github.com/Gbolahan1010/Neon-food-delivery-services/actions/workflows/ci.yml)

A full-stack food ordering platform for independent Dublin restaurants, built with the MERN stack
(MongoDB, Express, React, Node.js). Customers browse restaurants, order, pay and track their food;
restaurant owners manage their menus and incoming orders; an admin approves restaurants and
manages users.

| | Link |
| --- | --- |
| **Live website** | https://neon-food-delivery-services.vercel.app |
| **Live API** | https://neon-food-delivery-services.onrender.com |
| API health check | https://neon-food-delivery-services.onrender.com/api/health |

> The API runs on Render's free plan, which sleeps after 15 minutes without traffic.
> The first page load after a pause can take up to a minute while it wakes up.

## Try it

All demo accounts use the password `NeonDemo123`.

| Role | Email | What to try |
| --- | --- | --- |
| Customer | customer@neon.test | Search, add dishes to the basket, check out, pay, track the order |
| Restaurant owner | owner@neon.test, owner2@neon.test | Move orders along, add dishes, mark dishes sold out, open or close |
| Admin | admin@neon.test | Approve the waiting restaurant (Smoke & Grill), suspend accounts |

Payments use Stripe **test mode**; no real money is taken. Test cards:

| Card number | Result |
| --- | --- |
| 4242 4242 4242 4242 | Payment succeeds |
| 4000 0000 0000 0002 | Payment is declined |
| 4000 0025 0000 3155 | Asks for 3D Secure authentication |

Use any future expiry date (for example 12/34) and any 3-digit CVC.

## Features

**Customers**
- Browse and search restaurants by name, dish or cuisine, with pagination
- Menus grouped by category, with dietary tags (vegan, gluten-free, halal, spicy)
- A basket that persists in the browser and holds one restaurant's food at a time
- Delivery fee calculated from the real distance to the delivery address
- Secure card payment on Stripe's hosted checkout page
- Live order tracking that refreshes by itself; cancel an unpaid order

**Restaurant owners**
- Register a restaurant (it is hidden until an admin approves it)
- Kitchen order queue that refreshes every 15 seconds, with one-click status changes
- Add, hide and delete dishes; open or close the restaurant

**Admins**
- Approval queue for new restaurants
- List, suspend and reactivate user accounts

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | React 19, React Router 7, Vite, plain CSS |
| Back end | Node.js, Express 5 |
| Database | MongoDB Atlas with Mongoose |
| Auth and security | bcrypt, JWT in httpOnly cookies, express-validator, Helmet, express-rate-limit |
| External APIs | Stripe Checkout and webhooks (test mode), OpenStreetMap Nominatim geocoding |
| Testing | Jest, Supertest, mongodb-memory-server (93 automated tests) |
| CI | GitHub Actions: lint and test the API, build the website on every push |
| Hosting | Vercel (website), Render (API), MongoDB Atlas (database) |

## Architecture

```
Browser ── React app on Vercel
              │  /api/* is forwarded by Vercel to the API (same origin, so the
              │  login cookie works without cross-site cookies)
              ▼
         Express API on Render ── MongoDB Atlas (users, restaurants, menus, orders)
              │
              ├── OpenStreetMap Nominatim (address → coordinates, cached 30 days)
              └── Stripe Checkout (payment page) ──► Stripe webhook back to the API
```

The API is layered: **routes** → **validators** → **controllers** → **services** → **models**.
Controllers only deal with HTTP; business rules (pricing, ownership, the order status
state machine) live in the services.

## API

All responses use one shape: `{ "success": true, "data": …, "meta"? }` or
`{ "success": false, "message": "…", "errors"?: [{ "field", "message" }] }`.

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
| POST | /api/delivery/quote | Logged in | Distance and delivery fee for an address |
| POST | /api/orders | Customer | Place an order (prices and fee calculated on the server) |
| GET | /api/orders/mine | Customer | Order history |
| GET | /api/orders/:id | Customer (own), Owner (own restaurant), Admin | One order |
| GET | /api/orders/restaurant/:id?status= | Owner (own), Admin | Incoming orders for a restaurant |
| PATCH | /api/orders/:id/status | Owner, Admin; customer may cancel | Move an order to its next status |
| POST | /api/payments/checkout | Customer (own order) | Start a Stripe Checkout session |
| GET | /api/payments/confirm?session_id= | Customer (own order) | Check a payment with Stripe after the redirect |
| POST | /api/payments/webhook | Stripe (signed) | Stripe tells the API a payment succeeded |
| GET | /api/admin/restaurants?approved= | Admin | All restaurants, including the approval queue |
| PATCH | /api/admin/restaurants/:id/approval | Admin | Approve or unapprove a restaurant |
| GET | /api/admin/users?role= | Admin | List users |
| PATCH | /api/admin/users/:id/status | Admin | Suspend or reactivate a user |

## Security highlights

- Passwords hashed with bcrypt (cost 12) and never returned by the API
- Sessions held in an httpOnly, SameSite cookie (Secure in production), signed with HS256
- Role-based access control plus ownership checks on every write
- Input validated on every route; NoSQL injection blocked by type checks and Mongoose `sanitizeFilter`
- Prices, delivery fees and coordinates always calculated on the server, never trusted from the browser
- Card details never touch the server: Stripe's hosted page takes the payment
- Stripe webhooks accepted only with a valid signature; payment handling is idempotent
- Helmet security headers, rate limiting on login and the whole API, 10 KB request limit
- Generic login errors with equal-time password checks to prevent account enumeration
- Secrets kept in environment variables; `.env` is never committed

## Running locally

Requirements: Node.js 20 or newer, a MongoDB Atlas cluster (the free tier is fine) and,
for payments, a Stripe account in test mode.

**API**

```bash
cd server
npm install
cp .env.example .env      # then fill in MONGO_URI, JWT_SECRET and the Stripe test keys
npm run seed              # loads demo restaurants and accounts
npm run dev               # API on http://localhost:5000
```

**Website** (in a second terminal)

```bash
cd client
npm install
API_PROXY_TARGET=http://localhost:5000 npm run dev   # website on http://localhost:5173
```

Without `API_PROXY_TARGET`, the local website talks to the live API on Render.

| Folder | Script | What it does |
| --- | --- | --- |
| server | `npm run dev` | Start the API with auto-reload |
| server | `npm start` | Start the API (production) |
| server | `npm run seed` | Reset the database with demo data |
| server | `npm test` | Run the 93 tests against an in-memory MongoDB |
| server | `npm run lint` | Check code style with ESLint |
| client | `npm run dev` | Start the website with hot reload |
| client | `npm run build` | Build the website for production |

## Project structure

```
.github/workflows/ci.yml   GitHub Actions pipeline
client/                    React website (Vite)
  src/
    api/          fetch wrapper for the API
    context/      login session and basket state
    hooks/        data loading and live polling
    components/   layout, form fields, order tracker, owner tools
    pages/        one file per page
    styles.css    the neon design
  vercel.json     forwards /api to Render and serves the single-page app
server/                    Express API
  src/
    config/        environment, database and Stripe set-up
    models/        Mongoose schemas (User, Restaurant, MenuItem, Order, GeocodeCache)
    validators/    request validation rules
    routes/        Express routers
    controllers/   HTTP layer: read the request, call a service, send the response
    services/      business logic (pricing, delivery, payments, ownership, order status)
    middleware/    authentication, roles, validation, error handling
    utils/         AppError, token and pagination helpers
  scripts/seed.js  demo data
  tests/           Jest + Supertest tests
```

## Acknowledgements

Developed with the assistance of Claude (Anthropic) as a coding assistant; commits it helped
write are marked with a `Co-Authored-By` line. Restaurant photos from Unsplash. Geocoding data
© OpenStreetMap contributors.

## Licence

MIT
