const AppError = require('../utils/AppError');

/**
 * Authorisation: role-based access control. Use after protect.
 *   router.post('/', protect, authorize('owner'), createRestaurant)
 * Ownership ("is this MY restaurant?") is checked in the services, not here.
 */
function authorize(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(AppError.forbidden());
    return next();
  };
}

module.exports = { authorize };
