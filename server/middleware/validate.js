const AppError = require('../lib/AppError');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      return next(new AppError(422, 'Request validation failed.', 'VALIDATION_ERROR', result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))));
    }
    req[property] = result.data;
    return next();
  };
}

module.exports = validate;
