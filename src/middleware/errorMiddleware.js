function notFound(req, res, next) {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(err);
}

function friendlyMessage(err) {
  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const value = field ? err.keyValue[field] : '';
    if (field === 'slug') return `A product with this name already exists in the selected lab. Please use a different test name.`;
    if (field === 'email') return `This email address is already registered.`;
    if (field === 'name') return `"${value}" already exists. Please use a different name.`;
    return `A record with this ${field || 'value'} already exists.`;
  }
  // Mongoose validation
  if (err.name === 'ValidationError') {
    const msgs = Object.values(err.errors).map((e) => e.message);
    return msgs.join(', ');
  }
  // Mongoose cast error (bad ObjectId etc.)
  if (err.name === 'CastError') {
    return `Invalid value for field "${err.path}".`;
  }
  return err.message;
}

function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: friendlyMessage(err),
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
