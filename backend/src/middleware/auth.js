const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: true,
      code: 'UNAUTHORIZED',
      message: 'No authorization header provided'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: true,
      code: 'UNAUTHORIZED',
      message: 'Authorization header format must be Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeythatisverysecureandlong');
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: true,
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token'
    });
  }
};
