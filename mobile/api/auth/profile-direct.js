const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  if (req.method !== 'PATCH') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'NOW_API',
      audience: 'NOW_APP',
    });
    const body = req.body || {};
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, password: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }
    if (currentPassword && !(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.phone !== undefined ? { phone: String(body.phone).trim() } : {}),
        ...(newPassword ? { password: await bcrypt.hash(newPassword, 12) } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        latitude: true,
        longitude: true,
        role: { select: { name: true } },
      },
    });
    res.status(200).json({
      success: true,
      data: { user: { ...updated, role: updated.role.name.toLowerCase() } },
    });
  } catch (error) {
    console.error('PROFILE API ERROR:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر' });
  }
};
