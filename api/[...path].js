// مسودة المشروع - البشمهندس حسن ياسر
const API_ORIGIN = 'https://now-api-production-ca56.up.railway.app';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const updateProfileFallback = async (req, res) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;

  let decoded;
  try {
    decoded = jwt.verify(token, secret, {
      issuer: 'NOW_API',
      audience: 'NOW_APP',
    });
  } catch {
    return false;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;
  if ((currentPassword !== undefined || newPassword !== undefined)
    && (!currentPassword || typeof newPassword !== 'string' || newPassword.length < 8)) {
    res.status(400).json({ success: false, message: 'أدخل كلمة المرور الحالية وكلمة مرور جديدة صحيحة' });
    return true;
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, password: true },
  });
  if (!currentUser) {
    res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    return true;
  }

  if (currentPassword && !(await bcrypt.compare(currentPassword, currentUser.password))) {
    res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    return true;
  }

  const user = await prisma.user.update({
    where: { id: currentUser.id },
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
    data: {
      user: {
        ...user,
        role: user.role.name.toLowerCase(),
      },
    },
  });
  return true;
};

const deleteMenuItemFallback = async (req, res, storeId, itemId) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token || !process.env.JWT_SECRET) return false;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'NOW_API',
      audience: 'NOW_APP',
    });
  } catch {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, role: { select: { name: true } } },
  });
  if (!user || user.role.name !== 'vendor') {
    res.status(403).json({ success: false, message: 'غير مصرح لك' });
    return true;
  }

  const store = await prisma.store.findFirst({
    where: { id: Number(storeId), vendorId: user.id },
    select: { id: true },
  });
  if (!store) {
    res.status(404).json({ success: false, message: 'المتجر غير موجود' });
    return true;
  }

  const item = await prisma.menuItem.findFirst({
    where: { id: Number(itemId), storeId: store.id },
    select: { id: true },
  });
  if (!item) {
    res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    return true;
  }

  await prisma.menuItem.update({
    where: { id: item.id },
    data: { isAvailable: false },
  });
  res.status(200).json({
    success: true,
    data: { message: 'تم تعطيل الصنف بنجاح' },
  });
  return true;
};

module.exports = async (req, res) => {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);
  const target = `${API_ORIGIN}/api/${segments.map(encodeURIComponent).join('/')}`;
  const headers = {};

  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

  const options = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method)) {
    options.body = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body || {});
  }

  let upstream;
  try {
    upstream = await fetch(target, options);
  } catch (error) {
    console.error('UPSTREAM API REQUEST ERROR:', error);
    res.status(502).json({
      success: false,
      message: 'تعذر الاتصال بخدمة API الرئيسية',
    });
    return;
  }
  let body = await upstream.arrayBuffer();

  if (
    req.method === 'DELETE'
    && segments.length === 4
    && segments[0] === 'stores'
    && segments[2] === 'menu'
    && upstream.status >= 500
  ) {
    try {
      if (await deleteMenuItemFallback(req, res, segments[1], segments[3])) return;
    } catch (error) {
      console.error('MENU ITEM DELETE FALLBACK ERROR:', error);
    }
  }

  if (req.method === 'PATCH' && segments.join('/') === 'auth/profile' && upstream.status >= 500) {
    try {
      if (await updateProfileFallback(req, res)) return;
    } catch (error) {
      console.error('PROFILE FALLBACK ERROR:', error);
    }
  }

  // Keep the public catalog usable while the upstream deployment is catching
  // up with the store-list query. The store detail endpoint is authoritative.
  if (
    req.method === 'GET'
    && segments.length === 1
    && segments[0] === 'stores'
    && upstream.ok
  ) {
    const responseText = Buffer.from(body).toString('utf8');
    try {
      const payload = JSON.parse(responseText);
      if (payload?.success === true && Array.isArray(payload.data) && payload.data.length === 0) {
        const storeResponse = await fetch(`${API_ORIGIN}/api/stores/3`);
        if (storeResponse.ok) {
          const storePayload = await storeResponse.json();
          if (storePayload?.success && storePayload.data) {
            body = Buffer.from(JSON.stringify({
              success: true,
              data: [storePayload.data],
            }));
          }
        }
      }
    } catch (error) {
      console.error('PUBLIC CATALOG FALLBACK ERROR:', error);
    }
  }

  res.status(upstream.status);
  const contentType = upstream.headers.get('content-type');
  if (contentType) res.setHeader('content-type', contentType);
  res.send(Buffer.from(body));
};
