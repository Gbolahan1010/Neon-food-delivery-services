const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { getPagination, pageMeta } = require('../utils/pagination');

/** All restaurants, including ones waiting for approval: ?approved=false shows the queue. */
async function listRestaurants(query) {
  const { page, limit, skip } = getPagination(query, { defaultLimit: 20 });
  const filter = {};
  if (query.approved === 'true') filter.isApproved = true;
  if (query.approved === 'false') filter.isApproved = false;

  const [items, total] = await Promise.all([
    Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email'),
    Restaurant.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, { page, limit }) };
}

async function setRestaurantApproval(id, isApproved) {
  const restaurant = await Restaurant.findByIdAndUpdate(
    id,
    { isApproved },
    { returnDocument: 'after', runValidators: true }
  );
  if (!restaurant) throw AppError.notFound('Restaurant not found');
  return restaurant;
}

async function listUsers(query) {
  const { page, limit, skip } = getPagination(query, { defaultLimit: 20 });
  const filter = {};
  if (query.role) filter.role = query.role;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, { page, limit }) };
}

/** Suspend or reactivate an account. A suspended user is logged out on their next request. */
async function setUserActive(id, isActive, adminUser) {
  if (adminUser._id.equals(id)) {
    throw AppError.badRequest('You cannot change the status of your own account');
  }
  const user = await User.findByIdAndUpdate(
    id,
    { isActive },
    { returnDocument: 'after', runValidators: true }
  );
  if (!user) throw AppError.notFound('User not found');
  return user;
}

module.exports = { listRestaurants, setRestaurantApproval, listUsers, setUserActive };
