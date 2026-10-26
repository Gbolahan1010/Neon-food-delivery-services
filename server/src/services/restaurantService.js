const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const AppError = require('../utils/AppError');
const { getPagination, pageMeta, escapeRegex } = require('../utils/pagination');

/** Public list: approved restaurants only, with search, cuisine filter and pagination. */
async function listPublic(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { isApproved: true };

  if (query.cuisine) filter.cuisines = query.cuisine.trim().toLowerCase();
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { cuisines: pattern }, { description: pattern }];
  }

  const [items, total] = await Promise.all([
    Restaurant.find(filter).sort({ ratingAverage: -1, name: 1 }).skip(skip).limit(limit).lean(),
    Restaurant.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, { page, limit }) };
}

/** Public detail page: the restaurant and the dishes customers can order. */
async function getPublicById(id) {
  const restaurant = await Restaurant.findOne({ _id: id, isApproved: true }).lean();
  if (!restaurant) throw AppError.notFound('Restaurant not found');

  const menu = await MenuItem.find({ restaurant: id, isAvailable: true })
    .sort({ category: 1, name: 1 })
    .lean();
  return { restaurant, menu };
}

function listMine(user) {
  return Restaurant.find({ owner: user._id }).sort({ createdAt: -1 });
}

function create(data, user) {
  // The owner always comes from the session, never from the request body.
  return Restaurant.create({ ...data, owner: user._id, isApproved: false });
}

/**
 * Ownership check used by every write operation: an owner may only manage
 * their own restaurant; an admin may manage any.
 */
async function getOwned(id, user) {
  const restaurant = await Restaurant.findById(id);
  if (!restaurant) throw AppError.notFound('Restaurant not found');
  if (user.role !== 'admin' && !restaurant.owner.equals(user._id)) {
    throw AppError.forbidden('You can only manage your own restaurant');
  }
  return restaurant;
}

async function update(id, data, user) {
  const restaurant = await getOwned(id, user);
  if (data.address) {
    // Merge so an owner can change one address field without resending the rest.
    data.address = {
      ...(restaurant.address ? restaurant.address.toObject() : {}),
      ...data.address,
    };
  }
  restaurant.set(data);
  await restaurant.save(); // runs schema validation
  return restaurant;
}

async function remove(id, user) {
  const restaurant = await getOwned(id, user);
  await MenuItem.deleteMany({ restaurant: restaurant._id });
  await restaurant.deleteOne();
}

module.exports = { listPublic, getPublicById, listMine, create, getOwned, update, remove };
