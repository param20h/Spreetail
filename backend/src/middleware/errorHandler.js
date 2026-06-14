module.exports = (err, req, res, next) => {
  console.error(err.stack);

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || [];

  res.status(status).json({
    error: true,
    code,
    message,
    details
  });
};
