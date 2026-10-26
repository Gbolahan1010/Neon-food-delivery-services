const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { bcryptRounds } = require('../config/env');

// People may sign up as customers or restaurant owners. Admins are only ever created by the seed script.
const SELF_SERVICE_ROLES = ['customer', 'owner'];

// Compared against when the email does not exist, so a failed login takes the same time
// whether or not the account exists (stops attackers discovering registered emails by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', bcryptRounds);

async function register({ name, email, password, role }) {
  if (await User.exists({ email })) {
    throw AppError.conflict('An account with this email already exists');
  }
  // Fields are picked explicitly: nothing else from the request body reaches the model (mass-assignment defence).
  return User.create({
    name,
    email,
    password,
    role: SELF_SERVICE_ROLES.includes(role) ? role : 'customer',
  });
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  // One generic message for both cases, so the response never reveals which part was wrong.
  if (!user || !passwordOk) throw AppError.unauthorized('Invalid email or password');
  if (!user.isActive) throw AppError.forbidden('This account has been suspended');
  return user;
}

module.exports = { register, login, SELF_SERVICE_ROLES };
