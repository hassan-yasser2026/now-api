const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const API_ORIGIN = 'https://now-api-production-ca56.up.railway.app';
const prisma = new PrismaClient();

module.exports = async (req, res) => {
  if (req.method !== 'PATCH') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const headers = {
    authorization: req.headers.authorization || '',
    'content-type': req.headers['content-type'] || 'application/json',
  };

  try {
    const upstream = await fetch(`${API_ORIGIN}/api/auth/profile`, {
      method: 'PATCH',
      headers,
      body,
    });
    const upstreamBody = await upstream.text();

    if (upstream.status < 500) {
      res.status(upstream.status);
      res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
      res.send(upstreamBody);
      return;
    }

    console.error('PROFILE UPSTREAM ERROR:', upstream.status, upstreamBody);
  } catch (error) {
    console.error('PROFILE UPSTREAM REQUEST ERROR:', error);
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
    const payload = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, password: true },
    });

    if (!currentUser) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }
    if (payload.currentPassword
      && !(await bcrypt.compare(payload.currentPassword, currentUser.password))) {
      res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(payload.name !== undefined ? { name: String(payload.name).trim() } : {}),
        ...(payload.phone !== undefined ? { phone: String(payload.phone).trim() } : {}),
        ...(payload.newPassword
          ? { password: await bcrypt.hash(payload.newPassword, 12) }
          : {}),
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
      data: { user: { ...user, role: user.role.name.toLowerCase() } },
    });
  } catch (error) {
    console.error('PROFILE API ERROR:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر' });
  }
};
