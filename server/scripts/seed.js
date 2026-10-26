/**
 * Fills the database with demo data for development and the class demo.
 * WARNING: deletes all users, restaurants, menu items and orders first.
 *
 *   npm run seed                 (development)
 *   npm run seed -- --force      (allowed against production, e.g. once after the first deploy)
 */
const { connectDB, disconnectDB } = require('../src/config/db');
const { mongoUri, isProd } = require('../src/config/env');
const { User, Restaurant, MenuItem, Order } = require('../src/models');

// Test-only credentials for the seeded demo accounts. Never reuse a real password here.
const DEMO_PASSWORD = 'NeonDemo123';

const restaurants = [
  {
    name: 'Neon Noodle Bar',
    description: 'Hand-pulled noodles, bao and late-night ramen.',
    cuisines: ['asian', 'japanese'],
    address: {
      line1: '12 Capel Street',
      city: 'Dublin 1',
      eircode: 'D01 X2Y3',
      lat: 53.3478,
      lng: -6.2701,
    },
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    menu: [
      ['Tonkotsu Ramen', 'Pork broth, chashu, soft egg, spring onion', 1450, 'Ramen'],
      ['Spicy Miso Ramen', 'Miso broth, chilli oil, corn, bamboo shoots', 1395, 'Ramen', ['spicy']],
      ['Tofu Bao (2)', 'Crispy tofu, pickled cucumber, hoisin', 750, 'Small plates', ['vegan']],
      ['Pork Gyoza (6)', 'Pan-fried dumplings with ponzu', 800, 'Small plates'],
      ['Edamame', 'Sea salt', 500, 'Small plates', ['vegan', 'gluten-free']],
      ['Matcha Cheesecake', 'Baked, with black sesame crumb', 650, 'Desserts', ['vegetarian']],
    ],
  },
  {
    name: 'Bella Napoli',
    description: 'Wood-fired Neapolitan pizza and fresh pasta.',
    cuisines: ['italian', 'pizza'],
    address: {
      line1: '44 Dame Street',
      city: 'Dublin 2',
      eircode: 'D02 R5T6',
      lat: 53.3442,
      lng: -6.2637,
    },
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
    menu: [
      ['Margherita', 'San Marzano tomato, fior di latte, basil', 1200, 'Pizza', ['vegetarian']],
      ['Diavola', 'Spicy salami, chilli honey, mozzarella', 1450, 'Pizza', ['spicy']],
      ['Funghi e Tartufo', 'Wild mushroom, truffle oil, parmesan', 1550, 'Pizza', ['vegetarian']],
      ['Tagliatelle al Ragù', 'Slow-cooked beef and pork ragù', 1600, 'Pasta'],
      ['Garlic Focaccia', 'Rosemary, sea salt, olive oil', 550, 'Sides', ['vegan']],
      ['Tiramisù', 'Classic, made in house', 700, 'Desserts', ['vegetarian']],
    ],
  },
  {
    name: 'Lagos Kitchen',
    description: 'Jollof, suya and home-style West African cooking.',
    cuisines: ['nigerian', 'african'],
    address: {
      line1: '8 Parnell Street',
      city: 'Dublin 1',
      eircode: 'D01 P7Q8',
      lat: 53.3523,
      lng: -6.2635,
    },
    imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800',
    menu: [
      [
        'Party Jollof Rice',
        'Smoky tomato rice with fried plantain',
        1300,
        'Mains',
        ['vegan', 'gluten-free'],
      ],
      [
        'Beef Suya Skewers',
        'Grilled with yaji spice, onion and tomato',
        1200,
        'Grill',
        ['spicy', 'halal'],
      ],
      ['Egusi Soup with Pounded Yam', 'Melon seed soup with spinach and goat', 1650, 'Mains'],
      ['Chicken Pepper Soup', 'Light, aromatic and spicy', 1100, 'Soups', ['spicy', 'gluten-free']],
      ['Puff-Puff (8)', 'Sweet fried dough balls', 600, 'Desserts', ['vegetarian']],
      ['Zobo', 'Hibiscus drink with ginger and pineapple', 400, 'Drinks', ['vegan']],
    ],
  },
  {
    name: 'Green Bowl',
    description: 'Plant-based bowls, wraps and smoothies.',
    cuisines: ['vegan', 'healthy'],
    address: {
      line1: '3 South William Street',
      city: 'Dublin 2',
      eircode: 'D02 H4J5',
      lat: 53.3415,
      lng: -6.2625,
    },
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    menu: [
      [
        'Buddha Bowl',
        'Quinoa, roast sweet potato, chickpeas, tahini',
        1250,
        'Bowls',
        ['vegan', 'gluten-free'],
      ],
      [
        'Falafel Wrap',
        'Hummus, pickled red onion, chilli sauce',
        1050,
        'Wraps',
        ['vegan', 'spicy'],
      ],
      ['Miso Glazed Aubergine', 'Brown rice, sesame greens', 1300, 'Bowls', ['vegan']],
      ['Sweet Potato Fries', 'Smoked paprika aioli', 550, 'Sides', ['vegan']],
      ['Berry Smoothie', 'Mixed berries, banana, oat milk', 600, 'Drinks', ['vegan']],
    ],
  },
  {
    name: 'Smoke & Grill',
    description: 'Smash burgers and wings. Awaiting admin approval (for the demo).',
    cuisines: ['burgers', 'american'],
    address: {
      line1: '21 Camden Street',
      city: 'Dublin 2',
      eircode: 'D02 K6L7',
      lat: 53.3346,
      lng: -6.265,
    },
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    isApproved: false,
    menu: [
      ['Double Smash Burger', 'Two beef patties, cheese, pickles, house sauce', 1350, 'Burgers'],
      ['Buttermilk Chicken Burger', 'Hot honey, slaw', 1250, 'Burgers', ['spicy']],
      ['Buffalo Wings (8)', 'Blue cheese dip', 1000, 'Sides', ['spicy']],
      ['Loaded Fries', 'Cheese sauce, crispy onions, jalapeños', 750, 'Sides', ['vegetarian']],
    ],
  },
];

async function seed() {
  if (isProd && !process.argv.includes('--force')) {
    console.error('Refusing to seed a production database. Re-run with --force if you are sure.');
    process.exit(1);
  }

  await connectDB(mongoUri);
  console.log('Connected. Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Restaurant.deleteMany({}),
    MenuItem.deleteMany({}),
    Order.deleteMany({}),
  ]);

  // create() (not insertMany) so the password-hashing hook runs for each user.
  const [, ownerA, ownerB] = await User.create([
    { name: 'Neon Admin', email: 'admin@neon.test', password: DEMO_PASSWORD, role: 'admin' },
    { name: 'Olivia Owner', email: 'owner@neon.test', password: DEMO_PASSWORD, role: 'owner' },
    { name: 'Oscar Owner', email: 'owner2@neon.test', password: DEMO_PASSWORD, role: 'owner' },
    {
      name: 'Chloe Customer',
      email: 'customer@neon.test',
      password: DEMO_PASSWORD,
      role: 'customer',
      address: {
        line1: '1 Grafton Street',
        city: 'Dublin 2',
        eircode: 'D02 AB12',
        lat: 53.3417,
        lng: -6.2596,
      },
    },
  ]);

  let itemCount = 0;
  for (const [index, r] of restaurants.entries()) {
    const { menu, ...details } = r;
    const restaurant = await Restaurant.create({
      ...details,
      owner: index % 2 === 0 ? ownerA._id : ownerB._id,
      isApproved: r.isApproved ?? true,
    });
    const items = menu.map(([name, description, priceCents, category, dietary = []]) => ({
      restaurant: restaurant._id,
      name,
      description,
      priceCents,
      category,
      dietary,
    }));
    await MenuItem.insertMany(items);
    itemCount += items.length;
  }

  console.log(`Seeded 4 users, ${restaurants.length} restaurants and ${itemCount} menu items.`);
  console.log(
    `Demo logins (password ${DEMO_PASSWORD}): admin@neon.test, owner@neon.test, owner2@neon.test, customer@neon.test`
  );
  await disconnectDB();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err);
  await disconnectDB();
  process.exit(1);
});
