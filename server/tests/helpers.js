// Small factories so each test can set up exactly the data it needs.
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const MenuItem = require('../src/models/MenuItem');
const { signToken } = require('../src/utils/token');

let counter = 0;

/** Creates a user and returns it with a ready-made session cookie for supertest's .set('Cookie', ...). */
async function createUser(role = 'customer', overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `Test ${role}`,
    email: `${role}${counter}@example.com`,
    password: 'Password123',
    role,
    ...overrides,
  });
  return { user, cookie: `token=${signToken(user)}` };
}

function createRestaurant(owner, overrides = {}) {
  return Restaurant.create({
    owner: owner._id,
    name: 'Test Kitchen',
    description: 'Tasty test food',
    cuisines: ['italian'],
    address: { line1: '1 Main Street', city: 'Dublin' },
    isApproved: true,
    ...overrides,
  });
}

function createMenuItem(restaurant, overrides = {}) {
  return MenuItem.create({
    restaurant: restaurant._id,
    name: 'Margherita',
    priceCents: 1200,
    category: 'Pizza',
    ...overrides,
  });
}

module.exports = { createUser, createRestaurant, createMenuItem };
