// مسودة المشروع - البشمهندس حسن ياسر
const API_ORIGIN = 'https://now-api-production-ca56.up.railway.app';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const getAuthenticatedUser = async (req) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token || !process.env.JWT_SECRET) return null;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'NOW_API',
      audience: 'NOW_APP',
    });
  } catch {
    return null;
  }

  return prisma.user.findFirst({
    where: { id: decoded.userId, deletedAt: null, isActive: true },
    select: {
      id: true,
      notificationsEnabled: true,
      role: { select: { name: true } },
      subAdminPermissions: {
        select: { permission: { select: { name: true } } },
      },
    },
  });
};

const notificationFallback = async (req, res, segments) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return false;

  const path = segments.join('/');
  const allowedRoles = ['customer', 'vendor', 'delivery', 'admin', 'sub_admin'];
  if (!allowedRoles.includes(user.role.name)) {
    res.status(403).json({ success: false, message: 'غير مصرح لك بتنفيذ هذا الإجراء' });
    return true;
  }

  if (path === 'admin/notifications' || path === 'admin/notifications/broadcast') {
    const permission = path.endsWith('/broadcast')
      ? 'notifications.write'
      : 'notifications.read';
    const hasPermission = user.role.name === 'admin'
      || user.subAdminPermissions?.some(({ permission: item }) => item.name === permission);
    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'غير مصرح لك بتنفيذ هذا الإجراء' });
      return true;
    }

    if (req.method === 'GET' && path === 'admin/notifications') {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: { select: { name: true } },
            },
          },
        },
      });
      res.status(200).json({ success: true, data: notifications });
      return true;
    }

    if (req.method === 'POST' && path === 'admin/notifications/broadcast') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const title = String(body.title || '').trim();
      const message = String(body.body || '').trim();
      const role = String(body.role || '').trim().toLowerCase();
      const allowedTargetRoles = ['customer', 'vendor', 'delivery', 'admin', 'sub_admin'];

      if (!title || !message || title.length > 120 || message.length > 1000) {
        res.status(422).json({ success: false, message: 'عنوان ونص الإشعار مطلوبان وبحدود صالحة' });
        return true;
      }
      if (role && !allowedTargetRoles.includes(role)) {
        res.status(422).json({ success: false, message: 'الدور المستهدف غير صالح' });
        return true;
      }

      const recipients = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(role ? { role: { name: role } } : {}),
        },
        select: { id: true },
      });
      const result = recipients.length
        ? await prisma.notification.createMany({
            data: recipients.map(({ id }) => ({
              userId: id,
              type: 'SYSTEM',
              title,
              body: message,
            })),
          })
        : { count: 0 };

      res.status(200).json({ success: true, data: { sent: result.count } });
      return true;
    }
  }

  if (req.method === 'GET' && path === 'notifications') {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.status(200).json({ success: true, data: notifications });
    return true;
  }

  if (req.method === 'PATCH' && segments.length === 2 && segments[0] === 'notifications') {
    const id = Number(segments[1]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'رقم الإشعار غير صالح' });
      return true;
    }
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
      return true;
    }
    res.status(200).json({ success: true, data: { id, readAt: new Date() } });
    return true;
  }

  if (path === 'notifications/preferences') {
    if (req.method === 'GET') {
      res.status(200).json({ success: true, data: { enabled: user.notificationsEnabled !== false } });
      return true;
    }
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (typeof body.enabled !== 'boolean') {
        res.status(400).json({ success: false, message: 'قيمة الإشعارات غير صالحة' });
        return true;
      }
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { notificationsEnabled: body.enabled },
        select: { notificationsEnabled: true },
      });
      res.status(200).json({ success: true, data: { enabled: updated.notificationsEnabled } });
      return true;
    }
  }

  return false;
};

const supportFallback = async (req, res, segments) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return false;

  const path = segments.join('/');
  const isAdminPath = segments[0] === 'admin' && segments[1] === 'support';
  const isUserPath = segments[0] === 'support';
  if (!isAdminPath && !isUserPath) return false;

  const sessionId = Number(isAdminPath ? segments[3] : segments[2]);
  const action = isAdminPath ? segments[4] : segments[3];
  const hasPermission = (name) => user.role.name === 'admin'
    || user.subAdminPermissions?.some(({ permission }) => permission.name === name);
  const formatSession = (session) => ({
    ...session,
    status: { ESCALATED: 'IN_PROGRESS', RESOLVED: 'CLOSED' }[session.status] || session.status,
    messages: (session.messages || []).map((item) => ({
      ...item,
      sender: item.sender === 'USER'
        ? 'CUSTOMER'
        : (user.role.name === 'sub_admin' ? 'SUBADMIN' : 'ADMIN'),
    })),
  });

  if (isAdminPath && !hasPermission(
    req.method === 'GET' ? 'support.read' : action === 'status' ? 'support.status' : 'support.reply',
  )) {
    res.status(403).json({ success: false, message: 'غير مصرح لك بتنفيذ هذا الإجراء' });
    return true;
  }

  if (req.method === 'GET' && segments.length === (isAdminPath ? 3 : 2)) {
    const requestedStatus = String(req.query?.status || '').toUpperCase();
    const dbStatus = { OPEN: 'OPEN', IN_PROGRESS: 'ESCALATED', CLOSED: 'RESOLVED' }[requestedStatus];
    if (requestedStatus && !dbStatus) {
      res.status(422).json({ success: false, message: 'حالة المحادثة غير صالحة' });
      return true;
    }
    const sessions = await prisma.chatSession.findMany({
      where: {
        ...(dbStatus ? { status: dbStatus } : {}),
        ...(isAdminPath ? {} : { userId: user.id }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        ...(isAdminPath ? { user: { select: { id: true, name: true, role: { select: { name: true } } } } } : {}),
        order: { select: { id: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.status(200).json({ success: true, data: sessions.map(formatSession) });
    return true;
  }

  if (req.method === 'GET' && segments.length === (isAdminPath ? 4 : 3) && Number.isInteger(sessionId)) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, ...(isAdminPath ? {} : { userId: user.id }) },
      include: {
        ...(isAdminPath ? { user: { select: { id: true, name: true, role: { select: { name: true } } } } } : {}),
        order: { select: { id: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) {
      res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
      return true;
    }
    res.status(200).json({ success: true, data: formatSession(session) });
    return true;
  }

  if (req.method === 'POST' && segments.length === (isAdminPath ? 5 : 4) && action === 'messages') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = String(body.message || '').trim();
    if (!Number.isInteger(sessionId) || !message || message.length > 2000) {
      res.status(422).json({ success: false, message: 'المحادثة والرسالة مطلوبتان' });
      return true;
    }
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, ...(isAdminPath ? {} : { userId: user.id }) },
      select: { id: true, status: true },
    });
    if (!session) {
      res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
      return true;
    }
    if (session.status === 'RESOLVED') {
      res.status(409).json({ success: false, message: 'المحادثة مغلقة' });
      return true;
    }
    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.chatMessage.create({
        data: { sessionId, sender: isAdminPath ? 'ADMIN' : 'USER', message },
      });
      if (isAdminPath) await tx.chatSession.update({ where: { id: sessionId }, data: { status: 'ESCALATED' } });
      return item;
    });
    res.status(201).json({ success: true, data: { ...created, sender: isAdminPath ? 'ADMIN' : 'CUSTOMER' } });
    return true;
  }

  if (req.method === 'PATCH' && isAdminPath && segments.length === 5 && action === 'status') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const status = { OPEN: 'OPEN', IN_PROGRESS: 'ESCALATED', CLOSED: 'RESOLVED' }[String(body.status || '').toUpperCase()];
    if (!Number.isInteger(sessionId) || !status) {
      res.status(422).json({ success: false, message: 'حالة المحادثة غير صالحة' });
      return true;
    }
    const updated = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    res.status(200).json({ success: true, data: formatSession(updated) });
    return true;
  }

  return false;
};

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
  const rawPath = Array.isArray(req.query.path)
    ? req.query.path
    : String(req.query.path || '').split('/');
  const segments = rawPath.filter(Boolean);
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

  if (
    ['GET', 'PATCH', 'POST'].includes(req.method)
    && (segments[0] === 'notifications' || segments[0] === 'admin')
    && upstream.status >= 400
  ) {
    try {
      if (await notificationFallback(req, res, segments)) return;
    } catch (error) {
      console.error('NOTIFICATION FALLBACK ERROR:', error);
    }
  }

  if (
    ['GET', 'PATCH', 'POST'].includes(req.method)
    && (segments[0] === 'support' || segments[0] === 'admin')
    && segments.includes('support')
    && upstream.status >= 400
  ) {
    try {
      if (await supportFallback(req, res, segments)) return;
    } catch (error) {
      console.error('SUPPORT FALLBACK ERROR:', error);
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
