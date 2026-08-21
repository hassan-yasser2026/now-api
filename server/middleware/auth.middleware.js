const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول أولًا',
      });
    }

    const token = header.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز الدخول غير موجود',
      });
    }

    const decoded = verifyToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'جلسة الدخول غير صالحة أو انتهت',
    });
  }
}

module.exports = {
  authenticate,
};