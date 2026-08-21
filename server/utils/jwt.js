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
      id: user.id,
      role: user.role?.name || user.role,
      phone: user.phone,
    },
    getSecret(),
    {
      expiresIn: '7d',
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = {
  generateToken,
  verifyToken,
};