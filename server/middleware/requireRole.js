const AppError = require('../lib/AppError');

function requireRole(roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action.', 'FORBIDDEN'));
    }
    return next();
  };
}

module.exports = requireRole;
