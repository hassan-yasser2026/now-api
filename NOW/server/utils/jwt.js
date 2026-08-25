const jwt = require('jsonwebtoken');

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
  }

  return process.env.JWT_SECRET;
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role?.name || user.role,
    },
    getSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'NOW_API',
      audience: 'NOW_APP',
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getSecret(), {
    issuer: 'NOW_API',
    audience: 'NOW_APP',
  });
}

module.exports = {
  generateToken,
  verifyToken,
};
