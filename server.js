// مسودة المشروع - البشمهندس حسن ياسر
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const {
  createRateLimiter,
  setSecurityHeaders,
} = require('./server/middleware/security.middleware');

const {
  isValidPhone,
  normalizePhone,
  phoneVariants,
} = require('./server/utils/phone');

const app = express();
const prisma = new PrismaClient();

const PORT = Number.parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const WEB_DIST_PATH = [
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'mobile', 'dist'),
].find((candidate) => fs.existsSync(candidate)) || path.join(__dirname, 'dist');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    '❌ JWT_SECRET غير موجود في ملف .env. أضف JWT_SECRET قبل تشغيل السيرفر.'
  );
}

const normalizeOperatingHours = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const normalized = {};
  for (let day = 0; day <= 6; day += 1) {
    const entry = value[String(day)];
    if (!entry || entry.enabled === false) {
      normalized[String(day)] = { enabled: false, start: null, end: null };
      continue;
    }

    if (
      typeof entry.start !== 'string' ||
      typeof entry.end !== 'string' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.start) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.end)
    ) {
      return null;
    }

    normalized[String(day)] = {
      enabled: true,
      start: entry.start,
      end: entry.end,
    };
  }
  return normalized;
};

const isStoreOpenBySchedule = (operatingHours, date = new Date()) => {
  const timeZone = process.env.STORE_TIMEZONE || 'Africa/Cairo';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const dayByName = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayByName[parts.find((part) => part.type === 'weekday')?.value];
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  const schedule = operatingHours?.[String(day)];
  if (!schedule?.enabled) return false;

  const currentMinutes = hour * 60 + minute;
  const [startHour, startMinute] = schedule.start.split(':').map(Number);
  const [endHour, endMinute] = schedule.end.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (start === end) return true;
  return start < end
    ? currentMinutes >= start && currentMinutes < end
    : currentMinutes >= start || currentMinutes < end;
};

const syncScheduledStoreStatuses = async () => {
  try {
    const stores = await prisma.store.findMany({
      where: { operatingHours: { not: null } },
      select: { id: true, isOpen: true, operatingHours: true },
    });

    await Promise.all(
      stores
        .filter((store) => store.isOpen !== isStoreOpenBySchedule(store.operatingHours))
        .map((store) =>
          prisma.store.update({
            where: { id: store.id },
            data: { isOpen: isStoreOpenBySchedule(store.operatingHours) },
          })
        )
    );
  } catch (error) {
    console.error('فشل تحديث حالات المتاجر حسب أوقات العمل:', error);
  }
};

// ============================================================
// App Configuration
// ============================================================

app.disable('x-powered-by');

// These controls are dependency-free. For multi-instance deployments, replace
// the in-memory limiter with a shared Redis-backed store.
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(setSecurityHeaders);
app.use(createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
}));

const defaultOrigins = [
  'https://now-api-production-ca56.up.railway.app',
  'https://now-api-21yn.vercel.app',
  ...(NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:8081',
        'http://localhost:19006',
        'http://127.0.0.1:8081',
      ]),
];

const allowedOrigins = (() => {
  const corsOrigin = (process.env.CORS_ORIGIN || '').trim();

  if (!corsOrigin || corsOrigin === 'undefined') {
    return defaultOrigins;
  }

  if (corsOrigin === '*' && (NODE_ENV === 'production' || process.env.ALLOW_ALL_CORS !== 'true')) {
    return defaultOrigins;
  }

  if (corsOrigin === '*') {
    return '*';
  }

  return corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(defaultOrigins.filter((origin) => !corsOrigin.includes(origin)));
})();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins === '*') return true;
  if (allowedOrigins.includes(origin)) return true;
  return NODE_ENV !== 'production'
    && (
      /^http:\/\/localhost(?::\d+)?$/i.test(origin)
      || /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)
    );
};

console.info('[CORS CONFIG]', {
  allowedOrigins,
  credentials: false,
  vercelPatternAllowed: true,
});

const adminTraceMiddleware = (req, res, next) => {
  const startedAt = Date.now();
  console.info('[ADMIN REQUEST]', {
    method: req.method,
    path: req.originalUrl,
    origin: req.get('origin') || null,
  });

  res.on('finish', () => {
    console.info('[ADMIN RESPONSE]', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin || 'unknown'}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

app.options('*', cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed by CORS: ${origin || 'unknown'}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use('/api/admin', adminTraceMiddleware);

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  })
);

const authRateLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  keyGenerator: (req) => `${req.ip || 'unknown'}:${String(req.body?.phone || '').trim()}`,
});

const otpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip || 'unknown'}:${normalizePhone(req.body?.phone || '')}`,
});

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const sendOtpEmail = async (email, code) => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  if (required.some((key) => !process.env[key])) {
    const error = new Error('SMTP configuration is required for email verification');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'NOW phone verification code',
    text: `Your NOW verification code is ${code}. It expires in 10 minutes.`,
  });
  return true;
};

const isSmtpConfigured = () => (
  Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_PORT
    && process.env.SMTP_USER
    && process.env.SMTP_PASSWORD
  )
);

const creditWallet = async (tx, userId, amount, type, orderId, description) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return;
  const wallet = await tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  try {
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        orderId,
        amount: value,
        type,
        description,
      },
    });
  } catch (error) {
    if (error?.code !== 'P2002') throw error;
    return;
  }
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: value } },
  });
};

// ============================================================
// Constants
// ============================================================

const ROLES = {
  ADMIN: 'admin',
  SUB_ADMIN: 'sub_admin',
  VENDOR: 'vendor',
  DELIVERY: 'delivery',
  CUSTOMER: 'customer',
};

const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

const ACTIVE_DELIVERY_STATUSES = [
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.ON_THE_WAY,
];

const ALL_ORDER_STATUSES = Object.values(ORDER_STATUS);

const SUBMISSION_STATUS = {
  PENDING_ADMIN_REVIEW: 'PENDING_ADMIN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const OFFER_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED'];

const ADMIN_PERMISSION_ALIASES = {
  'products.read': ['stores.read'],
  'products.write': ['stores.update'],
  'ratings.read': ['reports.read'],
  'ratings.delete': ['ratings.write', 'reports.read'],
  'complaints.read': ['reports.read'],
  'support.read': ['complaints.read', 'reports.read'],
  'support.reply': ['complaints.write', 'complaints.read', 'reports.read'],
  'support.status': ['complaints.write', 'complaints.read', 'reports.read'],
};

// ============================================================
// Helpers
// ============================================================

const normalizeId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const notificationRequests = new Map();
const auditAdminAction = async (req, action, entity, entityId, metadata = undefined) => {
  await prisma.auditLog.create({
    data: {
      actorId: req.user?.userId || null,
      action,
      entity,
      entityId: entityId == null ? null : String(entityId),
      metadata,
      ipAddress: req.ip || null,
    },
  });
};

// Accepts a latitude or longitude value and returns a bounded number or null.
const parseCoordinate = (value, max) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || Math.abs(parsed) > max) {
    return null;
  }

  return parsed;
};

const parseLatLng = (latitude, longitude) => {
  const lat = parseCoordinate(latitude, 90);
  const lng = parseCoordinate(longitude, 180);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

const DELIVERY_RADIUS_KM = Number.isFinite(Number(process.env.DELIVERY_RADIUS_KM))
  && Number(process.env.DELIVERY_RADIUS_KM) > 0
  ? Number(process.env.DELIVERY_RADIUS_KM)
  : 15;
const APP_BUILD_ID = process.env.APP_BUILD_ID || '151e1e4';

const distanceInKm = (from, to) => {
  if (!from || !to) return null;
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isWithinDeliveryRadius = (from, to) => {
  const distance = distanceInKm(from, to);
  return distance !== null && distance <= DELIVERY_RADIUS_KM;
};

const getNearbyDistance = (from, to) => {
  const distance = distanceInKm(from, to);
  return distance !== null && distance <= DELIVERY_RADIUS_KM ? distance : null;
};

const isValidEmail = (email) => {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPassword = (password) => {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 128
  );
};

const parsePositiveNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
};

const parsePositiveInteger = (value) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
};

const normalizeOrderStatus = (status) => {
  if (!status) {
    return null;
  }

  const value = String(status).trim();

  const aliases = {
    Pending: ORDER_STATUS.PENDING,
    pending: ORDER_STATUS.PENDING,

    Accepted: ORDER_STATUS.ACCEPTED,
    accepted: ORDER_STATUS.ACCEPTED,

    Preparing: ORDER_STATUS.PREPARING,
    preparing: ORDER_STATUS.PREPARING,

    Ready: ORDER_STATUS.READY,
    ready: ORDER_STATUS.READY,

    PickedUp: ORDER_STATUS.PICKED_UP,
    pickedUp: ORDER_STATUS.PICKED_UP,
    picked_up: ORDER_STATUS.PICKED_UP,

    OnTheWay: ORDER_STATUS.ON_THE_WAY,
    onTheWay: ORDER_STATUS.ON_THE_WAY,
    on_the_way: ORDER_STATUS.ON_THE_WAY,

    Delivered: ORDER_STATUS.DELIVERED,
    delivered: ORDER_STATUS.DELIVERED,

    Cancelled: ORDER_STATUS.CANCELLED,
    Canceled: ORDER_STATUS.CANCELLED,
    cancelled: ORDER_STATUS.CANCELLED,
    canceled: ORDER_STATUS.CANCELLED,

    PENDING: ORDER_STATUS.PENDING,
    ACCEPTED: ORDER_STATUS.ACCEPTED,
    PREPARING: ORDER_STATUS.PREPARING,
    READY: ORDER_STATUS.READY,
    PICKED_UP: ORDER_STATUS.PICKED_UP,
    ON_THE_WAY: ORDER_STATUS.ON_THE_WAY,
    DELIVERED: ORDER_STATUS.DELIVERED,
    CANCELLED: ORDER_STATUS.CANCELLED,
  };

  return aliases[value] || null;
};

// ============================================================
// API Response Helpers
// ============================================================

const successResponse = (res, data = null, statusCode = 200, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...extra,
  });
};

const errorResponse = (
  res,
  message = 'حدث خطأ في السيرفر',
  statusCode = 500,
  extra = {}
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...extra,
  });
};

// ============================================================
// JWT
// ============================================================

const generateToken = (userId, role) => {
  return jwt.sign(
    {
      userId,
      role,
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'NOW_API',
      audience: 'NOW_APP',
    }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'NOW_API',
      audience: 'NOW_APP',
    });
  } catch {
    return null;
  }
};

// ============================================================
// Authentication Middleware
// ============================================================

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(
        res,
        'يجب تسجيل الدخول أولاً',
        401
      );
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return errorResponse(
        res,
        'صيغة Authorization غير صحيحة',
        401
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(
        res,
        'جلسة الدخول غير صالحة أو منتهية',
        401
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        isActive: true,
        approvalStatus: true,
        deletedAt: true,
        role: { select: { name: true } },
      },
    });

    if (!user || user.deletedAt || !user.isActive || user.role.name !== decoded.role) {
      return errorResponse(
        res,
        'الحساب غير نشط أو تغيرت صلاحياته',
        401
      );
    }

    if (user.approvalStatus !== SUBMISSION_STATUS.APPROVED) {
      return errorResponse(
        res,
        user.approvalStatus === SUBMISSION_STATUS.REJECTED
          ? 'تم رفض الحساب من الإدارة'
          : 'حسابك في انتظار مراجعة الإدارة',
        403
      );
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.error('AUTH ERROR:', error);

    return errorResponse(
      res,
      'فشل التحقق من المستخدم',
      401
    );
  }
};

// ============================================================
// Role Middleware
// ============================================================

const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(
        res,
        'يجب تسجيل الدخول',
        401
      );
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        'غير مصرح لك بتنفيذ هذا الإجراء',
        403
      );
    }

    next();
  };
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'يجب تسجيل الدخول', 401);
  }

  if (req.user.role !== ROLES.ADMIN) {
    return errorResponse(res, 'غير مصرح لك بتنفيذ هذا الإجراء', 403);
  }

  return next();
};

const adminPermissionMiddleware = (permissionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'يجب تسجيل الدخول', 401);
    }

    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (req.user.role !== ROLES.SUB_ADMIN) {
      return errorResponse(res, 'غير مصرح لك بتنفيذ هذا الإجراء', 403);
    }

    try {
      // Keep the original store/report permissions backwards compatible while
      // allowing the Admin API to expose independent section permissions.
      const acceptedPermissionNames = [
        permissionName,
        ...(ADMIN_PERMISSION_ALIASES[permissionName] || []),
      ];
      const permission = await prisma.subAdminPermission.findFirst({
        where: {
          subAdminId: req.user.userId,
          permission: { name: { in: acceptedPermissionNames } },
        },
        select: { subAdminId: true },
      });

      if (!permission) {
        return errorResponse(res, 'لا تملك الصلاحية المطلوبة', 403);
      }

      return next();
    } catch (error) {
      return handlePrismaError(error, res);
    }
  };
};

const canViewUserContacts = (req) => req.user?.role === ROLES.ADMIN;
const privateContactFields = (req, user) => canViewUserContacts(req)
  ? { phone: user.phone, email: user.email }
  : { phone: null, email: null };

// ============================================================
// Prisma Error Helper
// ============================================================

// Keep database errors explicit while allowing the API to return a stable response.
const handlePrismaError = (error, res) => {
  console.error('PRISMA ERROR:', {
    code: error?.code,
    meta: error?.meta,
    message: error?.message,
    stack: error?.stack,
  });

  if (
    error?.code === 'SMTP_NOT_CONFIGURED'
    || error?.code === 'EAUTH'
    || error?.code === 'ECONNECTION'
    || error?.code === 'ETIMEDOUT'
  ) {
    return errorResponse(
      res,
      'تعذر إرسال رمز التحقق بالبريد. راجع إعدادات SMTP في السيرفر.',
      503
    );
  }

  if (error?.code === 'P2002') {
    return errorResponse(
      res,
      'البيانات موجودة بالفعل',
      409
    );
  }

  if (error?.code === 'P2025') {
    return errorResponse(
      res,
      'العنصر المطلوب غير موجود',
      404
    );
  }

  if (NODE_ENV !== 'production' && error?.code === 'P2022') {
    return errorResponse(
      res,
      `مخطط قاعدة البيانات غير متزامن: ${error.meta?.column || error.message}`,
      500
    );
  }

  return errorResponse(
    res,
    'حدث خطأ في قاعدة البيانات',
    500
  );
};

// ============================================================
// Health Check
// ============================================================

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return successResponse(
      res,
      {
        name: 'NOW API',
        build: APP_BUILD_ID,
        status: 'online',
        environment: NODE_ENV,
        database: 'connected',
        deliveryRadiusKm: DELIVERY_RADIUS_KM,
        smtpConfigured: Boolean(
          process.env.SMTP_HOST
          && process.env.SMTP_PORT
          && process.env.SMTP_USER
          && process.env.SMTP_PASSWORD
        ),
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('HEALTH ERROR:', error);

    return errorResponse(
      res,
      'قاعدة البيانات غير متصلة',
      503,
      {
        status: 'degraded',
      }
    );
  }
});

// ============================================================
// Root Path & API Info
// ============================================================

app.get('/', (req, res) => {
  if (fs.existsSync(path.join(WEB_DIST_PATH, 'index.html'))) {
    return res.sendFile(path.join(WEB_DIST_PATH, 'index.html'));
  }

  return successResponse(
    res,
    {
      name: 'NOW Delivery API',
      version: '1.0.1',
      description: 'Backend API for NOW delivery application',
      status: 'online',
      endpoints: {
        health: '/api/health',
        info: '/api',
        auth: '/api/auth/login, /api/auth/register',
        stores: '/api/stores',
        orders: '/api/orders',
      },
    }
  );
});

app.get('/api', (req, res) => {
  return successResponse(
    res,
    {
      name: 'NOW',
      version: '1.0.1',
      description: 'NOW Delivery API',
      environment: NODE_ENV,
      status: 'online',
      timestamp: new Date().toISOString(),
    }
  );
});

// ============================================================
// AUTH
// ============================================================

// ------------------------------------------------------------
// Login
// ------------------------------------------------------------

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  if (String(req.body.phone || '').includes('@')) {
    return errorResponse(res, 'تسجيل الدخول متاح برقم الهاتف فقط', 400);
  }

  const phone = normalizePhone(req.body.phone);
  const password = req.body.password;
  if (!phone || !password) {
    return errorResponse(
      res,
      'رقم الهاتف وكلمة المرور مطلوبة',
      400
    );
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        // Accept E.164 and the legacy national forms of the same number.
        phone: { in: phoneVariants(phone) },
      },
      include: {
        role: true,
        store: true,
        deliveryProfile: true,
        subAdminPermissions: {
          include: { permission: true },
        },
      },
    });

    if (!user) {
      return errorResponse(
        res,
        'رقم الهاتف أو كلمة المرور غير صحيحة',
        401
      );
    }

    if (user.approvalStatus === SUBMISSION_STATUS.REJECTED) {
      return errorResponse(
        res,
        user.rejectionReason
          ? `تم رفض الحساب من الإدارة. السبب: ${user.rejectionReason}`
          : 'تم رفض الحساب من الإدارة',
        403
      );
    }

    if (
      !user.isActive
      && user.suspendedUntil
      && new Date(user.suspendedUntil).getTime() <= Date.now()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          suspensionReason: null,
          suspendedUntil: null,
        },
      });
      user.isActive = true;
      user.suspensionReason = null;
      user.suspendedUntil = null;
    }

    if (user.approvalStatus === SUBMISSION_STATUS.PENDING_ADMIN_REVIEW) {
      return errorResponse(
        res,
        'حسابك في انتظار مراجعة الإدارة',
        403
      );
    }

    if (!user.isActive) {
      const suspensionMessage = user.suspensionReason
        ? `تم تعطيل الحساب. السبب: ${user.suspensionReason}`
        : 'تم تعطيل الحساب من الإدارة';
      const openingMessage = user.suspendedUntil
        ? ` يمكن محاولة الدخول بعد: ${new Date(user.suspendedUntil).toLocaleString('ar-EG')}.`
        : ' يرجى التواصل مع الدعم لإعادة التفعيل.';
      return errorResponse(res, `${suspensionMessage}.${openingMessage}`, 403);
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        'الحساب غير نشط',
        403
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordValid) {
      return errorResponse(
        res,
        'كلمة المرور غير صحيحة',
        401
      );
    }

    const token = generateToken(
      user.id,
      user.role.name
    );

    return successResponse(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role.name,
          approvalStatus: user.approvalStatus,
          rejectionReason: user.rejectionReason,
          storeId: user.store?.id || null,
          store: user.store,
          deliveryProfile: user.deliveryProfile,
          permissions: user.subAdminPermissions.map(
            (item) => item.permission.name
          ),
        },
      }
    );
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.post('/api/auth/verify-phone', otpRateLimiter, async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    return errorResponse(res, 'رقم الهاتف ورمز التحقق غير صالحين', 400);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { phone: { in: phoneVariants(phone) }, role: { name: ROLES.CUSTOMER } },
      select: { id: true, phoneVerified: true },
    });
    if (!user) return errorResponse(res, 'المستخدم غير موجود', 404);
    if (user.phoneVerified) return successResponse(res, { phoneVerified: true });

    const verification = await prisma.otpVerification.findFirst({
      where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification || verification.attempts >= 5) {
      return errorResponse(res, 'رمز التحقق منتهي أو غير متاح', 422);
    }
    const valid = await bcrypt.compare(code, verification.codeHash);
    if (!valid) {
      await prisma.otpVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      return errorResponse(res, 'رمز التحقق غير صحيح', 422);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } }),
      prisma.otpVerification.update({ where: { id: verification.id }, data: { consumedAt: new Date() } }),
    ]);
    return successResponse(res, { phoneVerified: true }, 200, {
      message: 'تم تأكيد رقم الهاتف بنجاح',
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.post('/api/auth/resend-phone-otp', otpRateLimiter, async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) return errorResponse(res, 'رقم الهاتف مطلوب', 400);
  try {
    const user = await prisma.user.findFirst({
      where: { phone: { in: phoneVariants(phone) }, role: { name: ROLES.CUSTOMER } },
      select: { id: true, email: true, phoneVerified: true },
    });
    if (!user) return errorResponse(res, 'المستخدم غير موجود', 404);
    if (user.phoneVerified) return successResponse(res, { phoneVerified: true });
    const code = createOtp();
    const verification = await prisma.otpVerification.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    let delivered;
    try {
      delivered = await sendOtpEmail(user.email, code);
    } catch (error) {
      console.error('OTP EMAIL ERROR:', {
        code: error?.code,
        message: error?.message,
        responseCode: error?.responseCode,
      });
      await prisma.otpVerification.delete({ where: { id: verification.id } });
      throw error;
    }
    return successResponse(res, { otpDeliveryConfigured: delivered });
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

// ------------------------------------------------------------
// Register
// ------------------------------------------------------------

app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  const name = normalizeString(req.body.name);
  const phone = normalizePhone(req.body.phone);
  const password = req.body.password;
  const email = normalizeString(req.body.email);
  const role = normalizeString(req.body.role).toLowerCase();
  const storeName = normalizeString(req.body.storeName);
  const profileImage = normalizeString(req.body.profileImage);
  const idImage = normalizeString(req.body.idImage);
  const motorcycleImage = normalizeString(req.body.motorcycleImage);
  const motorcycleCardImage = normalizeString(req.body.motorcycleCardImage);

  if (!name || name.length < 2) {
    return errorResponse(
      res,
      'اسم المستخدم غير صالح',
      400
    );
  }

  if (!phone) {
    return errorResponse(
      res,
      'رقم الهاتف مطلوب',
      400
    );
  }

  if (!isValidPhone(phone)) {
    return errorResponse(
      res,
      'رقم الهاتف غير صحيح',
      400
    );
  }

  if (!isValidPassword(password)) {
    return errorResponse(
      res,
      'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      400
    );
  }

  if (email && !isValidEmail(email)) {
    return errorResponse(
      res,
      'البريد الإلكتروني غير صالح',
      400
    );
  }

  const isCustomer = role === ROLES.CUSTOMER;
  const allowedRegistrationRoles = [
    ROLES.CUSTOMER,
    ROLES.VENDOR,
    ROLES.DELIVERY,
  ];

  if (!allowedRegistrationRoles.includes(role)) {
    return errorResponse(
      res,
      'الدور المطلوب غير صالح',
      400
    );
  }

  if (role === ROLES.VENDOR && !storeName) {
    return errorResponse(
      res,
      'اسم المتجر مطلوب للبائع',
      400
    );
  }

  if (role !== ROLES.CUSTOMER && (!profileImage || !idImage)) {
    return errorResponse(
      res,
      'الصورة الشخصية وصورة البطاقة مطلوبتان للشريك',
      400
    );
  }

  if (role === ROLES.DELIVERY && (!motorcycleImage || !motorcycleCardImage)) {
    return errorResponse(
      res,
      'صورة المتوسكل وصورة بطاقة المتوسكل مطلوبتان للمندوب',
      400
    );
  }

  try {
    const existingPhone = await prisma.user.findFirst({
      where: { phone: { in: phoneVariants(phone) } },
      select: { id: true },
    });
    const existingEmail = email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        })
      : null;

    if (existingPhone || existingEmail) {
      return errorResponse(
        res,
        existingPhone
          ? 'رقم الهاتف موجود بالفعل'
          : 'البريد الإلكتروني موجود بالفعل',
        409
      );
    }

    const roleRecord = await prisma.role.findUnique({
      where: {
        name: role,
      },
    });

    if (!roleRecord) {
      return errorResponse(
        res,
        'الدور المطلوب غير موجود في قاعدة البيانات',
        400
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            phone,
            password: hashedPassword,
            email: email || null,
            roleId: roleRecord.id,
            profileImage: profileImage || null,
            idImage: idImage || null,
            motorcycleImage: motorcycleImage || null,
            motorcycleCardImage: motorcycleCardImage || null,
            latitude: parseCoordinate(req.body.latitude, 90),
            longitude: parseCoordinate(req.body.longitude, 180),
            isActive: isCustomer,
            approvalStatus: isCustomer
              ? SUBMISSION_STATUS.APPROVED
              : SUBMISSION_STATUS.PENDING_ADMIN_REVIEW,
            phoneVerified: true,
          },
        });

        let store = null;

        if (role === ROLES.VENDOR) {
          store = await tx.store.create({
            data: {
              name: storeName,
              vendorId: user.id,
              isOpen: true,
              isActive: true,
              approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW,
            },
          });
        }

        return {
          user,
          store,
        };
      }
    );

    if (result.user.approvalStatus !== SUBMISSION_STATUS.APPROVED) {
      const admins = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          role: { name: ROLES.ADMIN },
        },
        select: { id: true },
      });
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map(({ id }) => ({
            userId: id,
            type: 'SYSTEM',
            title: 'طلب شريك جديد للمراجعة',
            body: `${role === ROLES.DELIVERY ? 'مندوب' : 'بائع'} جديد باسم ${name} أرسل بياناته وصوره وينتظر مراجعة الإدارة.`,
            data: {
              submissionType: 'partner_user',
              submissionId: result.user.id,
              submissionRole: role,
              name: result.user.name,
              phone: result.user.phone,
              email: result.user.email,
              profileImage: result.user.profileImage,
              idImage: result.user.idImage,
              motorcycleImage: result.user.motorcycleImage,
              motorcycleCardImage: result.user.motorcycleCardImage,
              latitude: result.user.latitude == null ? null : Number(result.user.latitude),
              longitude: result.user.longitude == null ? null : Number(result.user.longitude),
              store: result.store
                ? { id: result.store.id, name: result.store.name, image: result.store.image }
                : null,
            },
          })),
        });
      }
      return successResponse(
        res,
        {
          pendingApproval: true,
          user: {
            id: result.user.id,
            name: result.user.name,
            phone: result.user.phone,
            role,
            approvalStatus: result.user.approvalStatus,
            storeId: result.store?.id || null,
            store: result.store,
          },
        },
        201
      );
    }

    const token = generateToken(result.user.id, role);

    return successResponse(
      res,
      {
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
          role,
          approvalStatus: result.user.approvalStatus,
          storeId: result.store?.id || null,
          store: result.store,
        },
      },
      201
    );
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

// ------------------------------------------------------------
// Current User
// ------------------------------------------------------------

app.get(
  '/api/auth/me',
  authMiddleware,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
        include: {
          role: true,
          store: true,
          deliveryProfile: true,
          subAdminPermissions: {
            include: { permission: true },
          },
        },
      });

      if (!user) {
        return errorResponse(
          res,
          'المستخدم غير موجود',
          404
        );

      }

      return successResponse(
        res,
        {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role.name,
          approvalStatus: user.approvalStatus,
          rejectionReason: user.rejectionReason,
          storeId: user.store?.id || null,
          store: user.store,
          deliveryProfile: user.deliveryProfile,
          permissions: user.subAdminPermissions.map(
            (item) => item.permission.name
          ),
        }
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get('/api/wallet', authMiddleware, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 } },
    });
    return successResponse(res, {
      balance: Number(wallet?.balance || 0),
      transactions: (wallet?.transactions || []).map((item) => ({
        ...item,
        amount: Number(item.amount),
      })),
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
});
app.patch(
  '/api/auth/profile',
  authMiddleware,
  async (req, res) => {
    const name = req.body.name === undefined
      ? undefined
      : normalizeString(req.body.name);
    const phone = req.body.phone === undefined
      ? undefined
      : normalizePhone(req.body.phone);
    const email = req.body.email === undefined
      ? undefined
      : normalizeString(req.body.email) || null;
    const profileImage = req.body.profileImage === undefined
      ? undefined
      : normalizeString(req.body.profileImage) || null;
    const { currentPassword, newPassword } = req.body;

    if (name !== undefined && name.length < 2) {
      return errorResponse(res, 'اسم المستخدم غير صالح', 400);
    }

    if (phone !== undefined && !isValidPhone(phone)) {
      return errorResponse(res, 'رقم الهاتف غير صحيح', 400);
    }

    if (email !== undefined && email !== null && !isValidEmail(email)) {
      return errorResponse(res, 'البريد الإلكتروني غير صالح', 400);
    }

    const changingPassword =
      currentPassword !== undefined || newPassword !== undefined;

    if (changingPassword && (!currentPassword || !isValidPassword(newPassword))) {
      return errorResponse(
        res,
        'أدخل كلمة المرور الحالية وكلمة مرور جديدة صحيحة',
        400
      );
    }

    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, password: true },
      });

      if (!currentUser) {
        return errorResponse(res, 'المستخدم غير موجود', 404);
      }

      if (changingPassword) {
        const passwordValid = await bcrypt.compare(
          currentPassword,
          currentUser.password
        );

        if (!passwordValid) {
          return errorResponse(res, 'كلمة المرور الحالية غير صحيحة', 400);
        }
      }

      if (phone !== undefined || email !== undefined) {
        const duplicate = await prisma.user.findFirst({
          where: {
            id: { not: req.user.userId },
            OR: [
              ...(phone ? [{ phone: { in: phoneVariants(phone) } }] : []),
              ...(email ? [{ email }] : []),
            ],
          },
        });

        if (duplicate) {
          return errorResponse(res, 'رقم الهاتف أو البريد الإلكتروني مستخدم بالفعل', 409);
        }
      }

      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(profileImage !== undefined ? { profileImage } : {}),
          ...(changingPassword
            ? { password: await bcrypt.hash(newPassword, 12) }
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

      return successResponse(res, {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          latitude: user.latitude,
          longitude: user.longitude,
          role: user.role.name.toLowerCase(),
        },
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.delete(
  '/api/auth/profile',
  authMiddleware,
  async (req, res) => {
    try {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          name: 'حساب محذوف',
          phone: `deleted_${req.user.userId}_${Date.now()}`,
          email: null,
          password: await bcrypt.hash(`deleted_${Date.now()}`, 12),
          isActive: false,
        },
      });

      return successResponse(res, null, 200, {
        message: 'تم حذف الحساب بنجاح',
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// STORE ROUTES
// ============================================================

// ------------------------------------------------------------
// Get Stores
// ------------------------------------------------------------

app.get('/api/stores', async (req, res) => {
  try {
    const customerPoint = parseLatLng(req.query.latitude, req.query.longitude);
    const storeWhere = {
      isActive: true,
      ...(req.query.includeClosed === 'true' ? {} : { isOpen: true }),
    };
    const stores = await prisma.store.findMany({
      where: {
        ...storeWhere,
      },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
        menuItems: {
          where: {
            isAvailable: true,
            approvalStatus: SUBMISSION_STATUS.APPROVED,
            OR: [
              { categoryId: null },
              { category: { isActive: true } },
            ],
          },
          orderBy: { id: 'desc' },
        },
        offers: {
          where: {
            approvalStatus: SUBMISSION_STATUS.APPROVED,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        ratings: { select: { stars: true } },
      },
      orderBy: {
        id: 'desc',
      },
    });
    const nearbyStores = customerPoint
      ? stores.filter((store) => isWithinDeliveryRadius(customerPoint, parseLatLng(store.latitude, store.longitude)))
      : stores;

    return successResponse(res, nearbyStores.map((store) => {
      const total = store.ratings.reduce((sum, rating) => sum + rating.stars, 0);
      const { ratings, ...storeData } = store;
      return {
        ...storeData,
        ratingAverage: ratings.length ? Number((total / ratings.length).toFixed(1)) : 0,
        ratingCount: ratings.length,
        distanceKm: customerPoint
          ? Number(getNearbyDistance(customerPoint, parseLatLng(store.latitude, store.longitude)).toFixed(2))
          : null,
      };
    }));
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.get(
  '/api/vendor/:vendorId/store',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const vendorId = normalizeId(req.params.vendorId);
    if (!vendorId || vendorId !== req.user.userId) {
      return errorResponse(res, 'غير مصرح لك', 403);
    }

    try {
      const store = await prisma.store.findUnique({
        where: { vendorId },
        include: { offers: true },
      });
      if (!store) return errorResponse(res, 'المتجر غير موجود', 404);
      return successResponse(res, {
        ...store,
        vendor: store.vendor
          ? {
              ...store.vendor,
              ...(canViewUserContacts(req) ? {} : { phone: null }),
            }
          : store.vendor,
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Get Store
// ------------------------------------------------------------

app.get(
  '/api/stores/:id',
  async (req, res) => {
    const storeId = normalizeId(
      req.params.id
    );

    if (!storeId) {
      return errorResponse(
        res,
        'رقم المتجر غير صالح',
        400
      );
    }

    try {
      const store = await prisma.store.findFirst({
        where: {
          id: storeId,
          isActive: true,
          approvalStatus: SUBMISSION_STATUS.APPROVED,
          isOpen: true,
        },
        include: {
          vendor: {
            select: {
              name: true,
            },
          },
          menuItems: {
            where: {
              isAvailable: true,
              approvalStatus: SUBMISSION_STATUS.APPROVED,
              OR: [
                { categoryId: null },
                { category: { isActive: true, storeId } },
              ],
            },
            include: {
              ratings: {
                select: {
                  stars: true,
                  comment: true,
                  createdAt: true,
                  customer: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          offers: {
            where: {
              approvalStatus: SUBMISSION_STATUS.APPROVED,
              isActive: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          ratings: { select: { stars: true } },
        },
      });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      const totalRating = store.ratings.reduce((sum, rating) => sum + rating.stars, 0);
      const { ratings, ...storeData } = store;
      const menuItems = storeData.menuItems.map((item) => {
        const itemRatings = item.ratings || [];
        const originalPrice = Number(item.originalPrice ?? item.price);
        const discountValue = Number(item.discountValue || 0);
        const effectivePrice = Number(item.price);
        const { ratings: ignoredRatings, ...itemData } = item;
        return {
          ...itemData,
          price: effectivePrice,
          originalPrice,
          discountValue,
          discountPercentage: item.discountType === 'PERCENTAGE' ? discountValue : (
            originalPrice > 0 ? Number(((discountValue / originalPrice) * 100).toFixed(2)) : 0
          ),
          discount: discountValue > 0 ? {
            type: item.discountType || 'PERCENTAGE',
            value: discountValue,
          } : null,
          averageRating: itemRatings.length
            ? Number((itemRatings.reduce((sum, rating) => sum + rating.stars, 0) / itemRatings.length).toFixed(1))
            : 0,
          ratingsCount: itemRatings.length,
          ratingDetails: itemRatings.map((rating) => ({
            stars: rating.stars,
            comment: rating.comment,
            createdAt: rating.createdAt,
            customerName: rating.customer?.name || null,
          })),
          isAvailable: Boolean(item.isAvailable),
        };
      });
      return successResponse(res, {
        ...storeData,
        menuItems,
        ratingAverage: ratings.length ? Number((totalRating / ratings.length).toFixed(1)) : 0,
        ratingCount: ratings.length,
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Create Store
// ------------------------------------------------------------

app.post(
  '/api/stores',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const name = normalizeString(req.body.name);

    if (!name) {
      return errorResponse(res, 'اسم المتجر مطلوب', 422);
    }

    try {
      const existingStore = await prisma.store.findUnique({
        where: { vendorId: req.user.userId },
      });

      if (existingStore) {
        return errorResponse(res, 'يوجد متجر مرتبط بهذا الحساب بالفعل', 409);
      }

      const store = await prisma.store.create({
        data: {
          vendorId: req.user.userId,
          name,
          description: normalizeString(req.body.description) || null,
          image: normalizeString(req.body.image) || null,
          isOpen: req.body.isOpen !== false,
          approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW,
        },
      });

      return successResponse(res, store, 201);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Update Store
// ------------------------------------------------------------

app.put(
  '/api/stores/:id',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR, ROLES.ADMIN),
  async (req, res) => {
    const storeId = normalizeId(req.params.id);

    if (!storeId) {
      return errorResponse(res, 'رقم المتجر غير صالح', 400);
    }

    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        return errorResponse(res, 'المتجر غير موجود', 404);
      }

      if (req.user.role === ROLES.VENDOR && store.vendorId !== req.user.userId) {
        return errorResponse(res, 'غير مصرح لك بإدارة هذا المتجر', 403);
      }

      const data = {};

      if (req.body.name !== undefined) {
        const name = normalizeString(req.body.name);
        if (!name) {
          return errorResponse(res, 'اسم المتجر غير صالح', 422);
        }
        data.name = name;
      }

      if (req.body.description !== undefined) {
        data.description = normalizeString(req.body.description) || null;
      }

      if (req.body.image !== undefined) {
        data.image = normalizeString(req.body.image) || null;
      }

      if (req.body.operatingHours !== undefined) {
        if (req.body.operatingHours === null) {
          data.operatingHours = null;
        } else {
          const operatingHours = normalizeOperatingHours(req.body.operatingHours);
          if (!operatingHours) {
            return errorResponse(res, 'أوقات العمل غير صالحة', 422);
          }
          data.operatingHours = operatingHours;
          data.isOpen = isStoreOpenBySchedule(operatingHours);
        }
      }

      if (typeof req.body.isOpen === 'boolean') {
        data.isOpen = req.body.isOpen;
      }

      if (
        req.body.latitude !== undefined ||
        req.body.longitude !== undefined
      ) {
        // كلا الإحداثيين معًا، أو مسحهما معًا بإرسال null.
        if (req.body.latitude === null && req.body.longitude === null) {
          data.latitude = null;
          data.longitude = null;
        } else {
          const point = parseLatLng(req.body.latitude, req.body.longitude);

          if (!point) {
            return errorResponse(res, 'إحداثيات الموقع غير صالحة', 422);
          }

          data.latitude = point.lat;
          data.longitude = point.lng;
        }
      }

      if (
        req.user.role === ROLES.VENDOR &&
        Object.keys(data).some((key) => ['name', 'description', 'image', 'latitude', 'longitude'].includes(key))
      ) {
        data.approvalStatus = SUBMISSION_STATUS.PENDING_ADMIN_REVIEW;
        data.rejectionReason = null;
      }

      const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data,
      });

      return successResponse(res, updatedStore);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Disable Store
// ------------------------------------------------------------

app.delete(
  '/api/stores/:id',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR, ROLES.ADMIN),
  async (req, res) => {
    const storeId = normalizeId(req.params.id);

    if (!storeId) {
      return errorResponse(res, 'رقم المتجر غير صالح', 400);
    }

    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        return errorResponse(res, 'المتجر غير موجود', 404);
      }

      if (req.user.role === ROLES.VENDOR && store.vendorId !== req.user.userId) {
        return errorResponse(res, 'غير مصرح لك بإدارة هذا المتجر', 403);
      }

      await prisma.store.update({
        where: { id: storeId },
        data: { isActive: false, isOpen: false },
      });

      return successResponse(res, null, 200, {
        message: 'تم تعطيل المتجر بنجاح',
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Get Menu
// ------------------------------------------------------------

app.get(
  '/api/stores/:storeId/menu',
  async (req, res) => {
    const storeId = normalizeId(
      req.params.storeId
    );

    if (!storeId) {
      return errorResponse(
        res,
        'رقم المتجر غير صالح',
        400
      );
    }

    try {
      const items = await prisma.menuItem.findMany({
        where: {
          store: {
            id: storeId,
            isActive: true,
            isOpen: true,
          },
          isAvailable: true,
          approvalStatus: SUBMISSION_STATUS.APPROVED,
          OR: [
            { categoryId: null },
            { category: { isActive: true, storeId } },
          ],
        },
        include: {
          ratings: {
            select: {
              stars: true,
              comment: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: {
          id: 'desc',
        },
      });

      return successResponse(res, items.map((item) => {
        const originalPrice = Number(item.originalPrice || item.price);
        const discountValue = Number(item.discountValue || 0);
        const effectivePrice = Number(item.price);
        const itemRatings = item.ratings || [];
        const { ratings, ...itemData } = item;
        return {
          ...itemData,
          price: effectivePrice,
          originalPrice,
          discountValue,
          effectivePrice,
          discountPercentage: item.discountType === 'PERCENTAGE' ? discountValue : (
            originalPrice > 0 ? Number(((discountValue / originalPrice) * 100).toFixed(2)) : 0
          ),
          discount: discountValue > 0 ? {
            type: item.discountType || 'PERCENTAGE',
            value: discountValue,
          } : null,
          averageRating: itemRatings.length
            ? Number((itemRatings.reduce((sum, rating) => sum + rating.stars, 0) / itemRatings.length).toFixed(1))
            : 0,
          ratingsCount: itemRatings.length,
          ratingDetails: itemRatings.map((rating) => ({
            stars: rating.stars,
            comment: rating.comment,
            createdAt: rating.createdAt,
            customerName: rating.customer?.name || null,
          })),
          isAvailable: Boolean(item.isAvailable),
        };
      }));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// Vendors can review pending and rejected listings; customers only receive
// approved listings from the public route above.
app.get(
  '/api/vendor/:vendorId/menu',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const vendorId = normalizeId(req.params.vendorId);
    if (!vendorId || vendorId !== req.user.userId) {
      return errorResponse(res, 'غير مصرح لك', 403);
    }

    try {
      const store = await prisma.store.findUnique({ where: { vendorId } });
      if (!store) return errorResponse(res, 'المتجر غير موجود', 404);
      const items = await prisma.menuItem.findMany({
        where: { storeId: store.id },
        orderBy: { id: 'desc' },
      });
      return successResponse(res, items);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Add Menu Item
// ------------------------------------------------------------

app.post(
  '/api/stores/:storeId/menu',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const storeId = normalizeId(
      req.params.storeId
    );

    const name = normalizeString(
      req.body.name
    );

    const description = normalizeString(
      req.body.description
    );

    const image = normalizeString(
      req.body.image
    );

    const price = parsePositiveNumber(
      req.body.price
    );

    if (!storeId) {
      return errorResponse(
        res,
        'رقم المتجر غير صالح',
        400
      );
    }

    if (!name) {
      return errorResponse(
        res,
        'اسم الصنف مطلوب',
        400
      );
    }

    if (price === null) {
      return errorResponse(
        res,
        'السعر غير صالح',
        400
      );
    }

    try {
      const store = await prisma.store.findUnique({
        where: {
          id: storeId,
        },
      });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      if (store.vendorId !== req.user.userId) {
        return errorResponse(
          res,
          'غير مصرح لك بإدارة هذا المتجر',
          403
        );
      }

      const item = await prisma.menuItem.create({
        data: {
          name,
          price,
          description: description || null,
          image: image || null,
          isAvailable:
            typeof req.body.isAvailable === 'boolean'
              ? req.body.isAvailable
              : true,
          approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW,
          storeId,
        },
      });

      return successResponse(
        res,
        item,
        201,
        { message: 'تم إرسال الصنف للمراجعة' }
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Update Menu Item
// ------------------------------------------------------------

app.patch(
  '/api/stores/:storeId/menu/:itemId',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const storeId = normalizeId(
      req.params.storeId
    );

    const itemId = normalizeId(
      req.params.itemId
    );

    if (!storeId || !itemId) {
      return errorResponse(
        res,
        'بيانات الصنف غير صالحة',
        400
      );
    }

    try {
      const store = await prisma.store.findUnique({
        where: {
          id: storeId,
        },
      });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      if (store.vendorId !== req.user.userId) {
        return errorResponse(
          res,
          'غير مصرح لك',
          403
        );
      }

      const existingItem =
        await prisma.menuItem.findUnique({
          where: {
            id: itemId,
          },
        });

      if (!existingItem) {
        return errorResponse(
          res,
          'الصنف غير موجود',
          404
        );
      }

      if (existingItem.storeId !== storeId) {
        return errorResponse(
          res,
          'الصنف لا يتبع هذا المتجر',
          403
        );
      }

      const data = {};

      if (req.body.name !== undefined) {
        const name = normalizeString(
          req.body.name
        );

        if (!name) {
          return errorResponse(
            res,
            'اسم الصنف غير صالح',
            400
          );
        }

        data.name = name;
      }

      if (req.body.price !== undefined) {
        const price = parsePositiveNumber(
          req.body.price
        );

        if (price === null) {
          return errorResponse(
            res,
            'السعر غير صالح',
            400
          );
        }

        data.price = price;
      }

      if (req.body.description !== undefined) {
        data.description =
          normalizeString(
            req.body.description
          ) || null;
      }

      if (req.body.image !== undefined) {
        data.image =
          normalizeString(
            req.body.image
          ) || null;
      }

      if (
        typeof req.body.isAvailable ===
        'boolean'
      ) {
        data.isAvailable =
          req.body.isAvailable;
      }

      data.approvalStatus = SUBMISSION_STATUS.PENDING_ADMIN_REVIEW;
      data.rejectionReason = null;

      const updatedItem =
        await prisma.menuItem.update({
          where: {
            id: itemId,
          },
          data,
        });

      return successResponse(
        res,
        updatedItem,
        200,
        { message: 'تم إرسال التعديل للمراجعة' }
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ------------------------------------------------------------
// Delete Menu Item
// ------------------------------------------------------------

app.delete(
  '/api/stores/:storeId/menu/:itemId',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const storeId = normalizeId(
      req.params.storeId
    );

    const itemId = normalizeId(
      req.params.itemId
    );

    if (!storeId || !itemId) {
      return errorResponse(
        res,
        'بيانات الصنف غير صالحة',
        400
      );
    }

    try {
      const store = await prisma.store.findUnique({
        where: {
          id: storeId,
        },
      });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      if (store.vendorId !== req.user.userId) {
        return errorResponse(
          res,
          'غير مصرح لك',
          403
        );
      }

      const item =
        await prisma.menuItem.findUnique({
          where: {
            id: itemId,
          },
        });

      if (!item) {
        return errorResponse(
          res,
          'الصنف غير موجود',
          404
        );
      }

      if (item.storeId !== storeId) {
        return errorResponse(
          res,
          'الصنف لا يتبع هذا المتجر',
          403
        );
      }

      // Keep historical orders and related records intact by hiding the item
      // instead of physically deleting a potentially referenced row.
      await prisma.menuItem.update({
        where: {
          id: itemId,
        },
        data: {
          isAvailable: false,
        },
      });

      return successResponse(
        res,
        {
          message: 'تم حذف الصنف بنجاح',
        }
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// VENDOR OFFERS / DISCOUNTS
// ============================================================

app.get('/api/stores/:storeId/offers', async (req, res) => {
  const storeId = normalizeId(req.params.storeId);
  if (!storeId) return errorResponse(res, 'رقم المتجر غير صالح', 400);
  try {
    const offers = await prisma.offer.findMany({
      where: {
        storeId,
        approvalStatus: SUBMISSION_STATUS.APPROVED,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, offers);
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

const getVendorStore = async (vendorId) => prisma.store.findUnique({
  where: { vendorId },
  select: { id: true },
});

app.get(
  '/api/vendor/:vendorId/offers',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const vendorId = normalizeId(req.params.vendorId);
    if (!vendorId || vendorId !== req.user.userId) return errorResponse(res, 'غير مصرح لك', 403);
    try {
      const store = await getVendorStore(vendorId);
      if (!store) return errorResponse(res, 'المتجر غير موجود', 404);
      const offers = await prisma.offer.findMany({
        where: { storeId: store.id },
        orderBy: { id: 'desc' },
      });
      return successResponse(res, offers);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.post(
  '/api/vendor/:vendorId/offers',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const vendorId = normalizeId(req.params.vendorId);
    const title = normalizeString(req.body.title);
    const discountType = normalizeString(req.body.discountType || 'PERCENTAGE').toUpperCase();
    const discountValue = parsePositiveNumber(req.body.discountValue);
    if (!vendorId || vendorId !== req.user.userId) return errorResponse(res, 'غير مصرح لك', 403);
    if (!title) return errorResponse(res, 'عنوان العرض مطلوب', 422);
    if (!OFFER_DISCOUNT_TYPES.includes(discountType) || discountValue === null) {
      return errorResponse(res, 'بيانات الخصم غير صالحة', 422);
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return errorResponse(res, 'نسبة الخصم يجب ألا تتجاوز 100', 422);
    }
    try {
      const store = await getVendorStore(vendorId);
      if (!store) return errorResponse(res, 'المتجر غير موجود', 404);
      const offer = await prisma.offer.create({
        data: {
          storeId: store.id,
          title,
          description: normalizeString(req.body.description) || null,
          discountType,
          discountValue,
          image: normalizeString(req.body.image) || null,
          startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null,
          endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
          isActive: req.body.isActive !== false,
          approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW,
        },
      });
      return successResponse(res, offer, 201, { message: 'تم إرسال العرض للمراجعة' });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/vendor/:vendorId/offers/:offerId',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const vendorId = normalizeId(req.params.vendorId);
    const offerId = normalizeId(req.params.offerId);
    if (!vendorId || !offerId || vendorId !== req.user.userId) return errorResponse(res, 'غير مصرح لك', 403);
    try {
      const store = await getVendorStore(vendorId);
      const offer = await prisma.offer.findFirst({ where: { id: offerId, storeId: store?.id } });
      if (!offer) return errorResponse(res, 'العرض غير موجود', 404);
      const data = {};
      if (req.body.title !== undefined) data.title = normalizeString(req.body.title);
      if (req.body.description !== undefined) data.description = normalizeString(req.body.description) || null;
      if (req.body.image !== undefined) data.image = normalizeString(req.body.image) || null;
      if (req.body.discountType !== undefined) data.discountType = normalizeString(req.body.discountType).toUpperCase();
      if (req.body.discountValue !== undefined) data.discountValue = parsePositiveNumber(req.body.discountValue);
      if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
      if (req.body.startsAt !== undefined) data.startsAt = req.body.startsAt ? new Date(req.body.startsAt) : null;
      if (req.body.endsAt !== undefined) data.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;
      if (data.title === '') return errorResponse(res, 'عنوان العرض مطلوب', 422);
      if (data.discountType && !OFFER_DISCOUNT_TYPES.includes(data.discountType)) return errorResponse(res, 'نوع الخصم غير صالح', 422);
      if (data.discountValue === null) return errorResponse(res, 'قيمة الخصم غير صالحة', 422);
      if (
        (data.discountType || offer.discountType) === 'PERCENTAGE' &&
        Number(data.discountValue ?? offer.discountValue) > 100
      ) {
        return errorResponse(res, 'نسبة الخصم يجب ألا تتجاوز 100', 422);
      }
      data.approvalStatus = SUBMISSION_STATUS.PENDING_ADMIN_REVIEW;
      data.rejectionReason = null;
      const updated = await prisma.offer.update({ where: { id: offerId }, data });
      return successResponse(res, updated, 200, { message: 'تم إرسال التعديل للمراجعة' });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.delete(
  '/api/vendor/:vendorId/offers/:offerId',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const vendorId = normalizeId(req.params.vendorId);
    const offerId = normalizeId(req.params.offerId);
    if (!vendorId || !offerId || vendorId !== req.user.userId) return errorResponse(res, 'غير مصرح لك', 403);
    try {
      const store = await getVendorStore(vendorId);
      const offer = await prisma.offer.findFirst({ where: { id: offerId, storeId: store?.id } });
      if (!offer) return errorResponse(res, 'العرض غير موجود', 404);
      await prisma.offer.delete({ where: { id: offerId } });
      return successResponse(res, { message: 'تم حذف العرض' });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// ORDER HELPERS
// ============================================================

const orderInclude = {
  customer: {
    select: {
      name: true,
      phone: true,
    },
  },

  store: {
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      ratings: { select: { stars: true } },
    },
  },

  delivery: {
    select: {
      name: true,
      phone: true,
      deliveryProfile: {
        select: {
          status: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  },

  items: {
    include: {
      menuItem: {
        select: {
          name: true,
        },
      },
    },
  },
  rating: true,
};

// ============================================================
// CREATE ORDER
// ============================================================

app.post(
  '/api/orders',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  async (req, res) => {
    const storeId = normalizeId(
      req.body.storeId
    );

    const address = normalizeString(
      req.body.address
    );

    const items = Array.isArray(
      req.body.items
    )
      ? req.body.items
      : [];

    const scheduledAt =
      req.body.scheduledAt;
    const paymentMethod = normalizeString(req.body.paymentMethod).toUpperCase();
    const deliveryFee = 25;

    // إحداثيات التوصيل اختيارية — تأتي من اختيار العميل على الخريطة.
    const deliveryPoint = parseLatLng(
      req.body.latitude,
      req.body.longitude
    );

    if (!storeId) {
      return errorResponse(
        res,
        'رقم المتجر غير صالح',
        400
      );
    }

    if (!address) {
      return errorResponse(
        res,
        'عنوان التوصيل مطلوب',
        400
      );
    }

    if (!deliveryPoint) {
      return errorResponse(
        res,
        'موقع التوصيل مطلوب',
        400
      );
    }

    if (items.length === 0) {
      return errorResponse(
        res,
        'يجب إضافة صنف واحد على الأقل',
        400
      );
    }

    if (items.length > 100) {
      return errorResponse(
        res,
        'عدد الأصناف كبير جدًا',
        400
      );
    }

    if (paymentMethod !== 'CASH_ON_DELIVERY') {
      return errorResponse(
        res,
        'طريقة الدفع غير متاحة حاليًا',
        400
      );
    }

    try {
      const store =
        await prisma.store.findUnique({
          where: {
            id: storeId,
          },
        });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      if (store.isOpen === false) {
        return errorResponse(
          res,
          'المتجر مغلق حاليًا',
          400
        );
      }

      const customerPoint = parseLatLng(req.body.latitude, req.body.longitude);
      const storePoint = parseLatLng(store.latitude, store.longitude);
      const outOfRange = !storePoint || !isWithinDeliveryRadius(customerPoint, storePoint);
      if (outOfRange && req.body.allowOutOfRange !== true) {
        return errorResponse(
          res,
          `موقع التوصيل خارج نطاق المتجر (${DELIVERY_RADIUS_KM} كم)`,
          422,
          { code: 'OUT_OF_DELIVERY_RANGE', requiresConfirmation: true }
        );
      }

      let parsedScheduledAt = null;

      if (scheduledAt) {
        parsedScheduledAt =
          new Date(scheduledAt);

        if (
          Number.isNaN(
            parsedScheduledAt.getTime()
          ) ||
          parsedScheduledAt <= new Date()
        ) {
          return errorResponse(
            res,
            'موعد الطلب غير صالح أو انتهى',
            400
          );
        }
      }

      /*
       * مهم:
       * السعر لا يتم أخذه من الموبايل.
       * السيرفر يحصل عليه من قاعدة البيانات.
       */

      const preparedItems = [];
      const seenMenuItemIds = new Set();

      for (const item of items) {
        const menuItemId = normalizeId(
          item.menuItemId ?? item.id
        );

        const quantity =
          parsePositiveInteger(
            item.quantity
          );

        if (!menuItemId) {
          return errorResponse(
            res,
            'أحد الأصناف لا يحتوي على رقم صالح',
            400
          );
        }

        if (seenMenuItemIds.has(menuItemId)) {
          return errorResponse(
            res,
            'لا يمكن تكرار الصنف نفسه في الطلب',
            400
          );
        }
        seenMenuItemIds.add(menuItemId);

        if (!quantity) {
          return errorResponse(
            res,
            'كمية أحد الأصناف غير صالحة',
            400
          );
        }

        const menuItem =
          await prisma.menuItem.findUnique({
            where: {
              id: menuItemId,
            },
          });

        if (!menuItem) {
          return errorResponse(
            res,
            `الصنف رقم ${menuItemId} غير موجود`,
            404
          );
        }

        if (menuItem.storeId !== storeId) {
          return errorResponse(
            res,
            'أحد الأصناف لا يتبع هذا المتجر',
            400
          );
        }

        if (!menuItem.isAvailable || menuItem.approvalStatus !== SUBMISSION_STATUS.APPROVED) {
          return errorResponse(
            res,
            `الصنف "${menuItem.name}" غير متاح حاليًا`,
            400
          );
        }

        const price = Number(
          menuItem.price
        );

        if (!Number.isFinite(price)) {
          return errorResponse(
            res,
            `سعر الصنف "${menuItem.name}" غير صالح`,
            500
          );
        }

        preparedItems.push({
          menuItemId,
          priceAtOrder: price,
          quantity,
        });
      }

      const totalPrice = Math.round(
        preparedItems.reduce(
          (total, item) =>
            total +
            item.priceAtOrder *
              item.quantity,
          0
        ) * 100
      ) / 100;
      const platformCommission =
        Math.round(totalPrice * 0.05 * 100) / 100;
      const orderTotal = Math.round(
        (totalPrice + deliveryFee + platformCommission) * 100
      ) / 100;

      const order =
        await prisma.$transaction(
          async (tx) => {
            const createdOrder = await tx.order.create({
              data: {
                customerId:
                  req.user.userId,

                storeId,

                address,

                deliveryLat:
                  deliveryPoint?.lat ??
                  null,

                deliveryLng:
                  deliveryPoint?.lng ??
                  null,

                deliveryFee,
                totalPrice: orderTotal,

                scheduledAt:
                  parsedScheduledAt,

                status:
                  ORDER_STATUS.PENDING,

                subtotal:
                  totalPrice,

                platformCommission,

                items: {
                  create:
                    preparedItems,
                },
                paymentTransactions: {
                  create: {
                    amount: orderTotal,
                    method: paymentMethod,
                    status: 'PENDING',
                  },
                },
              },

              include: {
                items: true,
              },
            });

            if (store.vendorId) {
              const vendor = await tx.user.findUnique({
                where: { id: store.vendorId },
                select: { notificationsEnabled: true },
              });

              if (vendor?.notificationsEnabled !== false) {
                await tx.notification.create({
                  data: {
                    userId: store.vendorId,
                    type: 'ORDER_STATUS',
                    title: 'طلب جديد',
                    body: `لديك طلب جديد رقم #${createdOrder.id}`,
                    data: { orderId: createdOrder.id, storeId },
                  },
                });
              }
            }

            return createdOrder;
          }
        );

      return successResponse(
        res,
        order,
        201
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// VENDOR NOTIFICATIONS
// ============================================================

app.get(
  '/api/notifications',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER, ROLES.VENDOR, ROLES.DELIVERY, ROLES.ADMIN, ROLES.SUB_ADMIN),
  async (req, res) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return successResponse(res, notifications);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/notifications/:id/read',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER, ROLES.VENDOR, ROLES.DELIVERY, ROLES.ADMIN, ROLES.SUB_ADMIN),
  async (req, res) => {
    const id = normalizeId(req.params.id);
    if (!id) return errorResponse(res, 'رقم الإشعار غير صالح', 400);

    try {
      const result = await prisma.notification.updateMany({
        where: { id, userId: req.user.userId },
        data: { readAt: new Date() },
      });
      if (!result.count) return errorResponse(res, 'الإشعار غير موجود', 404);
      return successResponse(res, { id, readAt: new Date() });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/notifications/preferences',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER, ROLES.VENDOR, ROLES.DELIVERY, ROLES.ADMIN, ROLES.SUB_ADMIN),
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { notificationsEnabled: true },
      });
      return successResponse(res, { enabled: user?.notificationsEnabled !== false });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/notifications/preferences',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER, ROLES.VENDOR, ROLES.DELIVERY, ROLES.ADMIN, ROLES.SUB_ADMIN),
  async (req, res) => {
    if (typeof req.body.enabled !== 'boolean') {
      return errorResponse(res, 'قيمة الإشعارات غير صالحة', 400);
    }

    try {
      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: { notificationsEnabled: req.body.enabled },
        select: { notificationsEnabled: true },
      });
      return successResponse(res, { enabled: user.notificationsEnabled });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// AVAILABLE DELIVERY ORDERS
// IMPORTANT: This route exists ONLY ONCE.
// ============================================================

app.get(
  '/api/orders/available',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    try {
      const orders =
        await prisma.order.findMany({
          where: {
            status: ORDER_STATUS.READY,
            deliveryId: null,
          },

          include:
            orderInclude,

          orderBy: [
            {
              createdAt: 'asc',
            },
          ],
        });

      return successResponse(
        res,
        orders
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// CUSTOMER ORDERS
// ============================================================

app.get(
  '/api/customer/:customerId/orders',
  authMiddleware,
  async (req, res) => {
    const customerId = normalizeId(
      req.params.customerId
    );

    if (!customerId) {
      return errorResponse(
        res,
        'رقم العميل غير صالح',
        400
      );
    }

    if (
      req.user.userId !== customerId &&
      req.user.role !== ROLES.ADMIN
    ) {
      return errorResponse(
        res,
        'غير مصرح لك',
        403
      );
    }

    try {
      const orders =
        await prisma.order.findMany({
          where: {
            customerId,
          },

          include:
            orderInclude,

          orderBy: {
            id: 'desc',
          },
        });

      return successResponse(
        res,
        orders
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// VENDOR ORDERS
// ============================================================

app.get(
  '/api/vendor/:vendorId/orders',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const vendorId = normalizeId(
      req.params.vendorId
    );

    if (!vendorId) {
      return errorResponse(
        res,
        'رقم البائع غير صالح',
        400
      );
    }

    if (req.user.userId !== vendorId) {
      return errorResponse(
        res,
        'غير مصرح لك',
        403
      );
    }

    try {
      const store =
        await prisma.store.findUnique({
          where: {
            vendorId,
          },
        });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      const orders =
        await prisma.order.findMany({
          where: {
            storeId:
              store.id,
          },

          include:
            orderInclude,

          orderBy: {
            id: 'desc',
          },
        });

      return successResponse(
        res,
        orders
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.post(
  '/api/orders/:orderId/rating',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  async (req, res) => {
    const orderId = normalizeId(req.params.orderId);
    const menuItemId = req.body?.menuItemId === undefined ? null : normalizeId(req.body.menuItemId);
    const stars = Number(req.body?.stars);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : null;
    if (!orderId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      return errorResponse(res, 'التقييم يجب أن يكون من نجمة إلى خمس نجوم', 400);
    }
    if (comment && comment.length > 1000) return errorResponse(res, 'التعليق طويل جداً', 400);
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, customerId: req.user.userId },
        select: { storeId: true, status: true, items: { select: { menuItemId: true } } },
      });
      if (!order) return errorResponse(res, 'الطلب غير موجود', 404);
      if (order.status !== ORDER_STATUS.DELIVERED) {
        return errorResponse(res, 'يمكن تقييم الطلبات التي تم توصيلها فقط', 400);
      }
      if (menuItemId && !order.items.some((item) => item.menuItemId === menuItemId)) {
        return errorResponse(res, 'المنتج غير موجود في هذا الطلب', 403);
      }
      const rating = await prisma.rating.create({
        data: { orderId, customerId: req.user.userId, storeId: order.storeId, menuItemId, stars, comment: comment || null },
      });
      return successResponse(res, rating, 201, { message: 'تم إرسال تقييمك بنجاح' });
    } catch (error) {
      if (error?.code === 'P2002') return errorResponse(res, 'تم تقييم هذا الطلب من قبل', 409);
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/support/complaints',
  authMiddleware,
  async (req, res) => {
    try {
      const complaints = await prisma.chatSession.findMany({
        where: { userId: req.user.userId },
        include: {
          order: { select: { id: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, sender: true, message: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return successResponse(res, complaints);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.post(
  '/api/support/complaints',
  authMiddleware,
  async (req, res) => {
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const orderId = req.body?.orderId ? normalizeId(req.body.orderId) : null;

    if (!message || message.length < 5) {
      return errorResponse(res, 'اكتب تفاصيل الشكوى بشكل أوضح', 400);
    }
    if (message.length > 2000) {
      return errorResponse(res, 'الشكوى طويلة جداً', 400);
    }

    try {
      if (orderId) {
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            OR: [
              { customerId: req.user.userId },
              { deliveryId: req.user.userId },
              { store: { vendorId: req.user.userId } },
            ],
          },
          select: { id: true },
        });
        if (!order) return errorResponse(res, 'الطلب غير موجود أو غير تابع لحسابك', 404);
      }

      const complaint = await prisma.chatSession.create({
        data: {
          userId: req.user.userId,
          orderId,
          status: 'OPEN',
          messages: {
            create: {
              sender: 'USER',
              message: category ? `[${category}] ${message}` : message,
            },
          },
        },
        include: {
          order: { select: { id: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      return successResponse(res, complaint, 201, { message: 'تم إرسال الشكوى بنجاح' });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

const supportStatusToDb = (status) => ({
  OPEN: 'OPEN',
  IN_PROGRESS: 'ESCALATED',
  CLOSED: 'RESOLVED',
}[normalizeString(status).toUpperCase()]);

const supportStatusFromDb = (status) => ({
  OPEN: 'OPEN',
  ESCALATED: 'IN_PROGRESS',
  RESOLVED: 'CLOSED',
}[status] || status);

const formatSupportSession = (session) => ({
  ...session,
  status: supportStatusFromDb(session.status),
  messages: (session.messages || []).map((item) => ({
    ...item,
    sender: item.sender === 'USER' ? 'CUSTOMER' : 'ADMIN',
  })),
});

app.get('/api/support/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        order: { select: { id: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return successResponse(res, sessions.map(formatSupportSession));
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.post('/api/support/sessions', authMiddleware, async (req, res) => {
  const message = normalizeString(req.body?.message);
  const orderId = req.body?.orderId ? normalizeId(req.body.orderId) : null;
  if (message.length < 5 || message.length > 2000) {
    return errorResponse(res, 'الرسالة مطلوبة وبطول صالح', 422);
  }
  try {
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: { id: orderId, customerId: req.user.userId },
        select: { id: true },
      });
      if (!order) return errorResponse(res, 'الطلب غير موجود أو غير تابع لحسابك', 404);
    }
    const session = await prisma.chatSession.create({
      data: {
        userId: req.user.userId,
        orderId,
        status: 'OPEN',
        messages: { create: { sender: 'USER', message } },
      },
      include: { order: { select: { id: true, status: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    return successResponse(res, formatSupportSession(session), 201);
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.get('/api/support/sessions/:id', authMiddleware, async (req, res) => {
  const id = normalizeId(req.params.id);
  if (!id) return errorResponse(res, 'رقم المحادثة غير صالح', 422);
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: req.user.userId },
      include: { order: { select: { id: true, status: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return errorResponse(res, 'المحادثة غير موجودة', 404);
    return successResponse(res, formatSupportSession(session));
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.post('/api/support/sessions/:id/messages', authMiddleware, async (req, res) => {
  const id = normalizeId(req.params.id);
  const message = normalizeString(req.body?.message);
  if (!id || message.length < 1 || message.length > 2000) {
    return errorResponse(res, 'المحادثة والرسالة مطلوبتان', 422);
  }
  try {
    const session = await prisma.chatSession.findFirst({ where: { id, userId: req.user.userId }, select: { id: true, status: true } });
    if (!session) return errorResponse(res, 'المحادثة غير موجودة', 404);
    if (session.status === 'RESOLVED') return errorResponse(res, 'لا يمكن الإرسال بعد إغلاق المحادثة', 409);
    const created = await prisma.chatMessage.create({ data: { sessionId: id, sender: 'USER', message } });
    return successResponse(res, { ...created, sender: 'CUSTOMER' }, 201);
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.get('/api/admin/support/sessions', authMiddleware, adminPermissionMiddleware('support.read'), async (req, res) => {
  const requestedStatus = normalizeString(req.query.status).toUpperCase();
  const dbStatus = requestedStatus ? supportStatusToDb(requestedStatus) : undefined;
  if (requestedStatus && !dbStatus) return errorResponse(res, 'حالة المحادثة غير صالحة', 422);
  try {
    const sessions = await prisma.chatSession.findMany({
      where: dbStatus ? { status: dbStatus } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true, role: { select: { name: true } } } },
        order: { select: { id: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return successResponse(res, sessions.map(formatSupportSession));
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.get('/api/admin/support/sessions/:id', authMiddleware, adminPermissionMiddleware('support.read'), async (req, res) => {
  const id = normalizeId(req.params.id);
  if (!id) return errorResponse(res, 'رقم المحادثة غير صالح', 422);
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, role: { select: { name: true } } } },
        order: { select: { id: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) return errorResponse(res, 'المحادثة غير موجودة', 404);
    return successResponse(res, formatSupportSession(session));
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.post('/api/admin/support/sessions/:id/messages', authMiddleware, adminPermissionMiddleware('support.reply'), async (req, res) => {
  const id = normalizeId(req.params.id);
  const message = normalizeString(req.body?.message);
  if (!id || message.length < 1 || message.length > 2000) return errorResponse(res, 'الرسالة مطلوبة', 422);
  try {
    const session = await prisma.chatSession.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!session) return errorResponse(res, 'المحادثة غير موجودة', 404);
    if (session.status === 'RESOLVED') return errorResponse(res, 'المحادثة مغلقة', 409);
    const created = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.chatMessage.create({
        data: { sessionId: id, sender: 'ADMIN', message },
      });
      await tx.chatSession.update({
        where: { id },
        data: { status: 'ESCALATED' },
      });
      return newMessage;
    });

    // Auditing must not turn a successfully stored support reply into a 500.
    try {
      await auditAdminAction(req, 'SUPPORT_REPLY', 'ChatSession', id);
    } catch (auditError) {
      console.error('SUPPORT REPLY AUDIT ERROR:', auditError);
    }

    return successResponse(res, { ...created, sender: req.user.role === ROLES.SUB_ADMIN ? 'SUBADMIN' : 'ADMIN' }, 201);
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.patch('/api/admin/support/sessions/:id/status', authMiddleware, adminPermissionMiddleware('support.status'), async (req, res) => {
  const id = normalizeId(req.params.id);
  const status = supportStatusToDb(req.body?.status);
  if (!id || !status) return errorResponse(res, 'حالة المحادثة غير صالحة', 422);
  try {
    const session = await prisma.chatSession.update({ where: { id }, data: { status }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    await auditAdminAction(req, 'SUPPORT_STATUS_UPDATE', 'ChatSession', id, { status: supportStatusFromDb(status) });
    return successResponse(res, formatSupportSession(session));
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

app.get(
  '/api/vendor/ratings',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    try {
      const store = await prisma.store.findUnique({ where: { vendorId: req.user.userId }, select: { id: true } });
      if (!store) return errorResponse(res, 'المتجر غير موجود', 404);
      const ratings = await prisma.rating.findMany({
        where: { storeId: store.id },
        include: { customer: { select: { name: true } }, order: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
      });
      const average = ratings.length
        ? Number((ratings.reduce((sum, item) => sum + item.stars, 0) / ratings.length).toFixed(1))
        : 0;
      return successResponse(res, { ratings, average, count: ratings.length });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/vendor/earnings',
  authMiddleware,
  roleMiddleware(ROLES.VENDOR),
  async (req, res) => {
    const period = String(req.query.period || 'day');
    if (!['day', 'week', 'month'].includes(period)) {
      return errorResponse(res, 'الفترة غير صالحة', 400);
    }

    const startDate = new Date();
    if (period === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    try {
      const store = await prisma.store.findUnique({
        where: { vendorId: req.user.userId },
      });
      if (!store) return errorResponse(res, 'المتجر غير موجود', 404);

      const orders = await prisma.order.findMany({
        where: {
          storeId: store.id,
          status: ORDER_STATUS.DELIVERED,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          totalPrice: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const total = orders.reduce(
        (sum, order) => sum + Number(order.totalPrice || 0),
        0
      );

      return successResponse(res, {
        total,
        count: orders.length,
        orders,
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// DELIVERY ORDERS
// Returns assigned orders + available orders.
// ============================================================

app.get(
  '/api/delivery/:deliveryId/orders',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    const deliveryId = normalizeId(
      req.params.deliveryId
    );

    if (!deliveryId) {
      return errorResponse(
        res,
        'رقم المندوب غير صالح',
        400
      );
    }

    if (
      req.user.userId !==
      deliveryId
    ) {
      return errorResponse(
        res,
        'غير مصرح لك',
        403
      );
    }

    try {
      const orders =
        await prisma.order.findMany({
          where: {
            deliveryId,
          },

          include:
            orderInclude,

          orderBy: {
            id: 'desc',
          },
        });

      return successResponse(
        res,
        orders
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// DELIVERY MOBILE API
// ============================================================

const deliveryOrderInclude = {
  store: {
    select: {
      id: true,
      name: true,
      image: true,
      latitude: true,
      longitude: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  items: {
    include: {
      menuItem: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  },
};

app.get(
  '/api/delivery/orders/available',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    try {
      const profile = await prisma.deliveryProfile.findUnique({
        where: { userId: req.user.userId },
        select: { status: true, latitude: true, longitude: true },
      });

      if (!profile || profile.status !== 'AVAILABLE') {
        return errorResponse(res, 'يجب تغيير حالتك إلى متاح لاستقبال الطلبات', 409);
      }

      const deliveryPoint = parseLatLng(profile.latitude, profile.longitude);
      if (!deliveryPoint) {
        return errorResponse(res, 'فعّل GPS وشارك موقعك لاستقبال الطلبات القريبة', 409);
      }

      const orders = await prisma.order.findMany({
        where: {
          status: ORDER_STATUS.READY,
          deliveryId: null,
        },
        include: deliveryOrderInclude,
        orderBy: { createdAt: 'asc' },
      });

      const nearbyOrders = orders.filter((order) => {
        const storePoint = parseLatLng(order.store?.latitude, order.store?.longitude);
        const customerPoint = parseLatLng(order.deliveryLat, order.deliveryLng);
        return isWithinDeliveryRadius(deliveryPoint, storePoint)
          && isWithinDeliveryRadius(deliveryPoint, customerPoint);
      });

      return successResponse(res, nearbyOrders);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/delivery/orders/my',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    try {
      const orders = await prisma.order.findMany({
        where: { deliveryId: req.user.userId },
        include: deliveryOrderInclude,
        orderBy: { createdAt: 'desc' },
      });

      return successResponse(res, orders);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/delivery/orders/:id',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    const orderId = normalizeId(req.params.id);

    if (!orderId) {
      return errorResponse(res, 'رقم الطلب غير صالح', 400);
    }

    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          deliveryId: req.user.userId,
        },
        include: deliveryOrderInclude,
      });

      if (!order) {
        return errorResponse(res, 'الطلب غير موجود أو غير مسند إليك', 404);
      }

      return successResponse(res, order);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.post(
  '/api/delivery/orders/:id/accept',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    const orderId = normalizeId(req.params.id);

    if (!orderId) {
      return errorResponse(res, 'رقم الطلب غير صالح', 400);
    }

    try {
      const claimedOrder = await prisma.$transaction(async (tx) => {
        const profile = await tx.deliveryProfile.findUnique({
          where: { userId: req.user.userId },
          select: { status: true },
        });

        if (!profile || profile.status !== 'AVAILABLE') {
          return null;
        }

        const result = await tx.order.updateMany({
          where: {
            id: orderId,
            status: ORDER_STATUS.READY,
            deliveryId: null,
          },
          data: {
            deliveryId: req.user.userId,
            status: ORDER_STATUS.PICKED_UP,
          },
        });

        if (result.count === 0) {
          return null;
        }

        await tx.deliveryProfile.update({
          where: { userId: req.user.userId },
          data: { status: 'BUSY' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: ORDER_STATUS.PICKED_UP,
            actorId: req.user.userId,
          },
        });

        return tx.order.findUnique({
          where: { id: orderId },
          include: deliveryOrderInclude,
        });
      });

      if (!claimedOrder) {
        return errorResponse(
          res,
          'الطلب غير متاح أو يجب أن تكون متاحًا لاستلامه',
          409
        );
      }

      return successResponse(res, claimedOrder);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/delivery/orders/:id/status',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    const orderId = normalizeId(req.params.id);
    const status = normalizeOrderStatus(req.body.status);

    if (!orderId || !status) {
      return errorResponse(res, 'بيانات حالة الطلب غير صالحة', 422);
    }

    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, deliveryId: req.user.userId },
        select: { id: true, status: true },
      });

      if (!order) {
        return errorResponse(res, 'الطلب غير موجود أو غير مسند إليك', 404);
      }

      const transitions = {
        [ORDER_STATUS.PICKED_UP]: [ORDER_STATUS.ON_THE_WAY],
        [ORDER_STATUS.ON_THE_WAY]: [ORDER_STATUS.DELIVERED],
      };

      if (!transitions[order.status]?.includes(status)) {
        return errorResponse(res, 'تغيير حالة الطلب غير مسموح', 409);
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: {
            id: orderId,
            deliveryId: req.user.userId,
            status: order.status,
          },
          data: { status },
        });

        if (result.count === 0) {
          return null;
        }

        const updated = await tx.order.findUnique({
          where: { id: orderId },
          include: deliveryOrderInclude,
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status,
            actorId: req.user.userId,
          },
        });

        if (status === ORDER_STATUS.DELIVERED) {
          await tx.deliveryProfile.update({
            where: { userId: req.user.userId },
            data: { status: 'AVAILABLE' },
          });
        }

        return updated;
      });

      if (!updatedOrder) {
        return errorResponse(res, 'تغيرت حالة الطلب بالفعل، أعد تحميل الطلب وحاول مرة أخرى', 409);
      }

      return successResponse(res, updatedOrder);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/delivery/availability',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    const status = normalizeString(req.body.status).toLowerCase();
    const availability = status === 'online' ? 'AVAILABLE' : status === 'offline' ? 'OFFLINE' : null;

    if (!availability) {
      return errorResponse(res, 'حالة التوفر غير صالحة', 422);
    }

    try {
      const profile = await prisma.deliveryProfile.upsert({
        where: { userId: req.user.userId },
        update: { status: availability },
        create: {
          userId: req.user.userId,
          status: availability,
        },
      });

      return successResponse(res, profile);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/delivery/profile',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    try {
      const profile = await prisma.deliveryProfile.upsert({
        where: { userId: req.user.userId },
        update: {},
        create: { userId: req.user.userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      return successResponse(res, profile);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/delivery/location',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    const point = parseLatLng(req.body.latitude, req.body.longitude);

    if (!point) {
      return errorResponse(res, 'إحداثيات الموقع غير صالحة', 422);
    }

    try {
      const profile = await prisma.deliveryProfile.upsert({
        where: { userId: req.user.userId },
        update: { latitude: point.lat, longitude: point.lng },
        create: {
          userId: req.user.userId,
          latitude: point.lat,
          longitude: point.lng,
        },
      });

      return successResponse(res, profile);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/delivery/earnings',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    try {
      const aggregate = await prisma.order.aggregate({
        where: {
          deliveryId: req.user.userId,
          status: ORDER_STATUS.DELIVERED,
        },
        _count: { id: true },
        _sum: { deliveryFee: true },
      });

      return successResponse(res, {
        completedOrders: aggregate._count.id,
        totalEarnings: aggregate._sum.deliveryFee || 0,
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/delivery/ratings',
  authMiddleware,
  roleMiddleware(ROLES.DELIVERY),
  async (req, res) => {
    try {
      const ratings = await prisma.rating.findMany({
        where: { order: { deliveryId: req.user.userId } },
        include: {
          customer: { select: { name: true } },
          order: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const average = ratings.length
        ? Number((ratings.reduce((sum, item) => sum + item.stars, 0) / ratings.length).toFixed(1))
        : 0;
      return successResponse(res, { ratings, average, count: ratings.length });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// ADMIN - ALL ORDERS
// ============================================================

app.get(
  '/api/orders',
  authMiddleware,
  adminPermissionMiddleware('orders.read'),
  async (req, res) => {
    try {
      const orders =
        await prisma.order.findMany({
          include:
            orderInclude,

          orderBy: {
            id: 'desc',
          },
        });

      return successResponse(
        res,
        orders
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// CANCEL ORDER
// ============================================================

app.put(
  '/api/orders/:id/cancel',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  async (req, res) => {
    const orderId = normalizeId(req.params.id);

    if (!orderId) {
      return errorResponse(res, 'رقم الطلب غير صالح', 400);
    }

    try {
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: {
            id: orderId,
            customerId: req.user.userId,
            status: {
              in: [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED],
            },
          },
          data: {
            status: ORDER_STATUS.CANCELLED,
          },
        });

        if (result.count === 0) {
          return null;
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: ORDER_STATUS.CANCELLED,
            actorId: req.user.userId,
            note: normalizeString(req.body.reason) || null,
          },
        });

        return tx.order.findUnique({
          where: { id: orderId },
          include: orderInclude,
        });
      });

      if (!cancelledOrder) {
        return errorResponse(
          res,
          'لا يمكن إلغاء هذا الطلب أو أنك لا تملكه',
          409
        );
      }

      return successResponse(res, cancelledOrder);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// RESCHEDULE ORDER
// ============================================================

app.put(
  '/api/orders/:id/schedule',
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  async (req, res) => {
    const orderId = normalizeId(req.params.id);
    const scheduledAt = new Date(req.body.scheduledAt);

    if (!orderId) {
      return errorResponse(res, 'رقم الطلب غير صالح', 400);
    }

    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return errorResponse(res, 'موعد الطلب غير صالح', 422);
    }

    try {
      const result = await prisma.order.updateMany({
        where: {
          id: orderId,
          customerId: req.user.userId,
          status: ORDER_STATUS.PENDING,
        },
        data: {
          scheduledAt,
        },
      });

      if (result.count === 0) {
        return errorResponse(
          res,
          'لا يمكن تعديل موعد هذا الطلب أو أنك لا تملكه',
          409
        );
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
      });

      return successResponse(res, order);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// ORDER TRACKING
// ============================================================

app.get('/api/orders/:id/tracking', authMiddleware, async (req, res) => {
  const orderId = normalizeId(req.params.id);

  if (!orderId) {
    return errorResponse(res, 'رقم الطلب غير صالح', 400);
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            image: true,
            latitude: true,
            longitude: true,
          },
        },
        delivery: {
          select: {
            id: true,
            name: true,
            phone: true,
            deliveryProfile: {
              select: {
                status: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return errorResponse(res, 'الطلب غير موجود', 404);
    }

    const isCustomer = order.customerId === req.user.userId;
    const isDelivery = order.deliveryId === req.user.userId;
    const isVendor =
      req.user.role === ROLES.VENDOR &&
      (await prisma.store.findUnique({
        where: { id: order.storeId },
        select: { vendorId: true },
      }))?.vendorId === req.user.userId;

    if (req.user.role !== ROLES.ADMIN && !isCustomer && !isDelivery && !isVendor) {
      return errorResponse(res, 'غير مصرح لك بعرض تتبع هذا الطلب', 403);
    }

    return successResponse(res, {
      orderId: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      address: order.address,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      scheduledAt: order.scheduledAt,
      store: order.store,
      delivery: order.delivery,
      items: order.items,
      timeline: order.statusHistory,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

// ============================================================
// ACCEPT / UPDATE ORDER STATUS
//
// أهم تعديل:
// قبول الطلب Pending يتم Atomic.
// أول مندوب فقط يستطيع الحصول عليه.
// ============================================================

app.put(
  '/api/orders/:id/status',
  authMiddleware,
  async (req, res) => {
    const orderId = normalizeId(
      req.params.id
    );

    if (!orderId) {
      return errorResponse(
        res,
        'رقم الطلب غير صالح',
        400
      );
    }

    const requestedStatus =
      normalizeOrderStatus(
        req.body.status
      );

    const requestedDeliveryId =
      normalizeId(
        req.body.deliveryId
      );

    if (!requestedStatus) {
      return errorResponse(
        res,
        'حالة الطلب غير صالحة',
        400
      );
    }

    if (
      !ALL_ORDER_STATUSES.includes(
        requestedStatus
      )
    ) {
      return errorResponse(
        res,
        'حالة الطلب غير مسموحة',
        400
      );
    }

    try {
      const order =
        await prisma.order.findUnique({
          where: {
            id: orderId,
          },

          include: {
            store: true,
          },
        });

      if (!order) {
        return errorResponse(
          res,
          'الطلب غير موجود',
          404
        );
      }

      const userRole =
        req.user.role;

      // ======================================================
      // Check ownership
      // ======================================================

      const isAdmin =
        userRole ===
        ROLES.ADMIN;

      const isVendor =
        userRole ===
          ROLES.VENDOR &&
        order.store.vendorId ===
          req.user.userId;

      const isDelivery =
        userRole ===
          ROLES.DELIVERY &&
        order.deliveryId ===
          req.user.userId;

      const isCustomer =
        userRole ===
          ROLES.CUSTOMER &&
        order.customerId ===
          req.user.userId;

      // ======================================================
      // Customer cannot change order status
      // ======================================================

      if (
        isCustomer &&
        !isAdmin
      ) {
        return errorResponse(
          res,
          'العميل لا يستطيع تغيير حالة الطلب مباشرة',
          403
        );
      }

      if (
        !isAdmin &&
        !isVendor &&
        !isDelivery
      ) {
        return errorResponse(
          res,
          'غير مصرح لك بتعديل هذا الطلب',
          403
        );
      }

      // ======================================================
      // Delivery must own the order
      // ======================================================

      if (
        userRole ===
          ROLES.DELIVERY &&
        !isDelivery &&
        requestedStatus !==
          ORDER_STATUS.PENDING
      ) {
        return errorResponse(
          res,
          'الطلب غير مسند إليك',
          403
        );
      }

      // ======================================================
      // Valid state transitions
      // ======================================================

      const currentStatus =
        normalizeOrderStatus(
          order.status
        );

      const allowedTransitions = {
        [ORDER_STATUS.PENDING]: [
          ORDER_STATUS.ACCEPTED,
          ORDER_STATUS.CANCELLED,
        ],

        [ORDER_STATUS.ACCEPTED]: [
          ORDER_STATUS.PREPARING,
          ORDER_STATUS.CANCELLED,
        ],

        [ORDER_STATUS.PREPARING]: [
          ORDER_STATUS.READY,
          ORDER_STATUS.CANCELLED,
        ],

        [ORDER_STATUS.READY]: [
          ORDER_STATUS.PICKED_UP,
        ],

        [ORDER_STATUS.PICKED_UP]: [
          ORDER_STATUS.ON_THE_WAY,
        ],

        [ORDER_STATUS.ON_THE_WAY]: [
          ORDER_STATUS.DELIVERED,
        ],

        [ORDER_STATUS.DELIVERED]: [],

        [ORDER_STATUS.CANCELLED]: [],
      };

      const allowed =
        allowedTransitions[
          currentStatus
        ] || [];

      const roleCanTransition =
        isAdmin ||
        (isVendor && [
          ORDER_STATUS.ACCEPTED,
          ORDER_STATUS.PREPARING,
          ORDER_STATUS.READY,
          ORDER_STATUS.CANCELLED,
        ].includes(requestedStatus)) ||
        (isDelivery && [
          ORDER_STATUS.PICKED_UP,
          ORDER_STATUS.ON_THE_WAY,
          ORDER_STATUS.DELIVERED,
        ].includes(requestedStatus));

      if (
        !isAdmin &&
        (!roleCanTransition || !allowed.includes(requestedStatus))
      ) {
        return errorResponse(
          res,
          `لا يمكن تغيير الحالة من ${currentStatus} إلى ${requestedStatus}`,
          400
        );
      }

      // ======================================================
      // Delivery cannot modify another delivery assignment
      // ======================================================

      let updateData = {
        status:
          requestedStatus,
      };

      if (
        requestedDeliveryId
      ) {
        if (
          userRole !==
            ROLES.ADMIN &&
          requestedDeliveryId !==
            req.user.userId
        ) {
          return errorResponse(
            res,
            'لا يمكنك إسناد الطلب لمندوب آخر',
            403
          );
        }

        const deliveryUser = await prisma.user.findFirst({
          where: {
            id: requestedDeliveryId,
            isActive: true,
            deletedAt: null,
            approvalStatus: SUBMISSION_STATUS.APPROVED,
            role: { name: ROLES.DELIVERY },
          },
          select: { id: true },
        });

        if (!deliveryUser) {
          return errorResponse(
            res,
            'المندوب المحدد غير صالح',
            400
          );
        }

        updateData.deliveryId =
          requestedDeliveryId;
      }

      // ======================================================
      // Vendor/Admin cancellation
      // ======================================================

      if (
        requestedStatus ===
          ORDER_STATUS.CANCELLED &&
        !isAdmin &&
        !isVendor
      ) {
        return errorResponse(
          res,
          'غير مصرح بإلغاء هذا الطلب',
          403
        );
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: {
            id: orderId,
            status: currentStatus,
            ...(isDelivery ? { deliveryId: req.user.userId } : {}),
          },
          data: updateData,
        });

        if (result.count === 0) {
          return null;
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: requestedStatus,
            actorId: req.user.userId,
          },
        });

        return tx.order.findUnique({
          where: { id: orderId },
          include: orderInclude,
        });
      });

      if (!updatedOrder) {
        return errorResponse(
          res,
          'تغيرت حالة الطلب بالفعل، أعد تحميل الطلب وحاول مرة أخرى',
          409
        );
      }

      if (requestedStatus === ORDER_STATUS.DELIVERED) {
        const commission = Number(order.platformCommission || 0);
        const vendorAmount = Math.max(0, Number(order.subtotal || 0) - commission);
        await prisma.$transaction(async (tx) => {
          await creditWallet(
            tx,
            order.store.vendorId,
            vendorAmount,
            'ORDER_SALE',
            order.id,
            `أرباح الطلب #${order.id} بعد خصم العمولة`
          );
          if (order.deliveryId) {
            await creditWallet(
              tx,
              order.deliveryId,
              order.deliveryFee,
              'DELIVERY_FEE',
              order.id,
              `رسوم توصيل الطلب #${order.id}`
            );
          }
        });
      }

      const notificationUserIds = [
        order.customerId,
        order.store.vendorId,
        order.deliveryId,
      ].filter((id, index, values) => id && values.indexOf(id) === index && id !== req.user.userId);
      if (notificationUserIds.length) {
        await prisma.notification.createMany({
          data: notificationUserIds.map((userId) => ({
            userId,
            type: 'ORDER_STATUS',
            title: 'تحديث حالة الطلب',
            body: `تم تحديث حالة الطلب #${order.id} إلى ${requestedStatus}`,
            data: { orderId: order.id, status: requestedStatus },
          })),
        });
      }

      // READY orders become available to delivery users. Notify eligible
      // delivery users so they do not have to keep reopening the orders screen.
      if (requestedStatus === ORDER_STATUS.READY && !order.deliveryId) {
        const availableDeliveryUsers = await prisma.user.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            notificationsEnabled: { not: false },
            approvalStatus: SUBMISSION_STATUS.APPROVED,
            role: { name: ROLES.DELIVERY },
            deliveryProfile: {
              status: 'AVAILABLE',
            },
          },
          select: { id: true },
        });

        if (availableDeliveryUsers.length) {
          await prisma.notification.createMany({
            data: availableDeliveryUsers
              .filter(({ id }) => id !== req.user.userId)
              .map(({ id }) => ({
                userId: id,
                type: 'ORDER_STATUS',
                title: 'طلب توصيل متاح',
                body: `طلب جديد جاهز للاستلام رقم #${order.id}`,
                data: { orderId: order.id, status: requestedStatus },
              })),
          });
        }
      }

      return successResponse(
        res,
        updatedOrder
      );
    } catch (error) {
      return handlePrismaError(
        error,
        res
      );
    }
  }
);

// ============================================================
// GET ORDER BY ID
// ============================================================

app.get(
  '/api/orders/:id',
  authMiddleware,
  async (req, res) => {
    const orderId = normalizeId(
      req.params.id
    );

    if (!orderId) {
      return errorResponse(
        res,
        'رقم الطلب غير صالح',
        400
      );
    }

    try {
      const order =
        await prisma.order.findUnique({
          where: {
            id: orderId,
          },

          include:
            orderInclude,
        });

      if (!order) {
        return errorResponse(
          res,
          'الطلب غير موجود',
          404
        );
      }

      const isAdmin =
        req.user.role ===
        ROLES.ADMIN;

      const isCustomer =
        order.customerId ===
        req.user.userId;

      const isDelivery =
        order.deliveryId ===
        req.user.userId;

      const isVendor =
        req.user.role ===
          ROLES.VENDOR &&
        order.store &&
        false;

      // نتحقق من البائع بشكل آمن
      let vendorOwnsOrder = false;

      if (
        req.user.role ===
        ROLES.VENDOR
      ) {
        const store =
          await prisma.store.findUnique({
            where: {
              id: order.storeId,
            },
          });

        vendorOwnsOrder =
          store?.vendorId ===
          req.user.userId;
      }

      if (
        !isAdmin &&
        !isCustomer &&
        !isDelivery &&
        !vendorOwnsOrder
      ) {
        return errorResponse(
          res,
          'غير مصرح لك بعرض هذا الطلب',
          403
        );
      }

      return successResponse(
        res,
        order
      );
    } catch (error) {
      return handlePrismaError(
        error,
        res
      );
    }
  }
);

// ============================================================
// ADMIN DASHBOARD
// ============================================================

app.get(
  '/api/admin/dashboard',
  authMiddleware,
  adminPermissionMiddleware('reports.read'),
  async (req, res) => {
    try {
      const activeUserWhere = { deletedAt: null };
      const roleCount = (name) => prisma.user.count({ where: { ...activeUserWhere, role: { name } } });
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 30);
      monthStart.setHours(0, 0, 0, 0);
      const [users, customers, admins, subAdmins, vendors, deliveries, orders, pendingOrders, activeOrders, completedOrders, cancelledOrders, stores, openStores, products, ratings, discounts, sales, commissions, withdrawals, recentOrders, recentUsers, recentActivities, orderHistory] = await Promise.all([
        prisma.user.count({ where: activeUserWhere }),
        roleCount(ROLES.CUSTOMER),
        roleCount(ROLES.ADMIN),
        roleCount(ROLES.SUB_ADMIN),
        roleCount(ROLES.VENDOR),
        roleCount(ROLES.DELIVERY),
        prisma.order.count(),
        prisma.order.count({ where: { status: ORDER_STATUS.PENDING } }),
        prisma.order.count({ where: { status: { in: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.PICKED_UP, ORDER_STATUS.ON_THE_WAY] } } }),
        prisma.order.count({ where: { status: ORDER_STATUS.DELIVERED } }),
        prisma.order.count({ where: { status: ORDER_STATUS.CANCELLED } }),
        prisma.store.count(),
        prisma.store.count({ where: { isOpen: true, isActive: true } }),
        prisma.menuItem.count({ where: { isDemo: false } }),
        prisma.rating.count(),
        prisma.offer.count({ where: { isActive: true } }),
        prisma.order.aggregate({ where: { status: ORDER_STATUS.DELIVERED }, _sum: { totalPrice: true } }),
        prisma.order.aggregate({ where: { status: ORDER_STATUS.DELIVERED }, _sum: { platformCommission: true } }),
        prisma.walletTransaction.aggregate({
          where: { type: { in: ['WITHDRAWAL', 'WITHDRAW', 'PAYOUT'] } },
          _sum: { amount: true },
        }),
        prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, totalPrice: true, createdAt: true, customer: { select: { name: true } }, store: { select: { name: true } } } }),
        prisma.user.findMany({ where: activeUserWhere, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, phone: true, createdAt: true, role: { select: { name: true } } } }),
        prisma.auditLog.findMany({ take: 6, orderBy: { createdAt: 'desc' }, select: { id: true, action: true, entity: true, createdAt: true, actor: { select: { name: true } } } }),
        prisma.order.findMany({ where: { createdAt: { gte: monthStart } }, select: { createdAt: true, status: true, totalPrice: true } }),
      ]);

      const monthly = Array.from({ length: 30 }, (_, index) => {
        const day = new Date(monthStart);
        day.setDate(monthStart.getDate() + index);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        const ordersForDay = orderHistory.filter((item) => item.createdAt >= day && item.createdAt < nextDay);
        const deliveredOrdersForDay = ordersForDay.filter((item) => item.status === ORDER_STATUS.DELIVERED);
        return {
          label: day.toISOString().slice(5, 10),
          orders: ordersForDay.length,
          sales: deliveredOrdersForDay.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
        };
      });

      return successResponse(res, {
        users,
        customers,
        admins,
        subAdmins,
        vendors,
        stores,
        openStores,
        products,
        ratings,
        discounts,
        orders,
        pendingOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        deliveries,
        sales: Number(sales._sum.totalPrice || 0),
        profits: Number(commissions._sum.platformCommission || 0),
        commissions: Number(commissions._sum.platformCommission || 0),
        withdrawals: Math.abs(Number(withdrawals._sum.amount || 0)),
        monthly,
        recentOrders: recentOrders.map((item) => ({ ...item, totalPrice: Number(item.totalPrice) })),
        recentUsers: recentUsers.map((item) => ({
          ...item,
          ...privateContactFields(req, item),
        })),
        recentActivities,
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// ADMIN USERS
// ============================================================

app.get(
  '/api/admin/users',
  authMiddleware,
  adminPermissionMiddleware('users.read'),
  async (req, res) => {
    try {
      const search = normalizeString(req.query.search);
      const role = normalizeString(req.query.role).toLowerCase();
      const active = normalizeString(req.query.active).toLowerCase();
      const allowedRoles = Object.values(ROLES);
      if (role && !allowedRoles.includes(role)) {
        return errorResponse(res, 'الدور غير صالح', 400);
      }
      if (active && !['true', 'false'].includes(active)) {
        return errorResponse(res, 'حالة الحساب غير صالحة', 400);
      }

      const users =
        await prisma.user.findMany({
          where: {
            deletedAt: null,
            ...(role ? { role: { name: role } } : {}),
            ...(active ? { isActive: active === 'true' } : {}),
            ...(search
              ? {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    ...(Number.isInteger(Number(search)) ? [{ id: Number(search) }] : []),
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            isActive: true,
            approvalStatus: true,
            suspensionReason: true,
            suspendedUntil: true,

            role: {
              select: {
                name: true,
              },
            },

            createdAt: true,
          },

          orderBy: {
            id: 'desc',
          },
        });

      return successResponse(
        res,
        users.map((user) => ({
          ...user,
          ...privateContactFields(req, user),
        }))
      );
    } catch (error) {
      return handlePrismaError(
        error,
        res
      );
    }
  }
);

app.patch(
  '/api/admin/users/:id',
  authMiddleware,
  adminPermissionMiddleware('users.update'),
  async (req, res) => {
    const userId = normalizeId(req.params.id);

    if (!userId) {
      return errorResponse(res, 'رقم المستخدم غير صالح', 400);
    }

    try {
      const data = {};

      if (req.body.name !== undefined) {
        const name = normalizeString(req.body.name);
        if (!name) {
          return errorResponse(res, 'اسم المستخدم غير صالح', 422);
        }
        data.name = name;
      }

      if (req.body.email !== undefined) {
        const email = normalizeString(req.body.email);
        if (email && !isValidEmail(email)) {
          return errorResponse(res, 'البريد الإلكتروني غير صالح', 422);
        }
        data.email = email || null;
      }

      const user = await prisma.user.update({
        where: { id: userId, deletedAt: null },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          suspensionReason: true,
          suspendedUntil: true,
          role: { select: { name: true } },
        },
      });

      return successResponse(res, {
        ...user,
        ...privateContactFields(req, user),
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.post(
  '/api/admin/users/:id/reset-password',
  authMiddleware,
  adminPermissionMiddleware('users.update'),
  async (req, res) => {
    const userId = normalizeId(req.params.id);
    const newPassword = typeof req.body.newPassword === 'string'
      ? req.body.newPassword
      : '';

    if (!userId || !isValidPassword(newPassword)) {
      return errorResponse(res, 'رقم المستخدم وكلمة المرور الجديدة (8 أحرف على الأقل) مطلوبة', 422);
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId, deletedAt: null },
        data: { password: await bcrypt.hash(newPassword, 12) },
        select: { id: true, name: true, isActive: true, role: { select: { name: true } } },
      });
      await auditAdminAction(req, 'RESET_PASSWORD', 'User', userId);

      return successResponse(res, {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        role: updated.role.name,
        passwordReset: true,
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

const setAdminManagedUserActive = async (req, res, isActive) => {
  const userId = normalizeId(req.params.id);

  if (!userId) {
    return errorResponse(res, 'رقم المستخدم غير صالح', 400);
  }

  if (!isActive && userId === req.user.userId) {
    return errorResponse(res, 'لا يمكنك تعطيل حسابك الحالي', 409);
  }

  let suspensionReason = null;
  let suspendedUntil = null;

  if (!isActive) {
    suspensionReason = normalizeString(req.body?.reason);
    if (!suspensionReason) {
      return errorResponse(res, 'سبب تعطيل الحساب مطلوب', 422);
    }
    if (suspensionReason.length > 500) {
      return errorResponse(res, 'سبب تعطيل الحساب طويل جدًا', 422);
    }

    if (req.body?.suspendedUntil !== undefined && req.body.suspendedUntil !== null && req.body.suspendedUntil !== '') {
      const parsedUntil = new Date(req.body.suspendedUntil);
      if (Number.isNaN(parsedUntil.getTime()) || parsedUntil.getTime() <= Date.now()) {
        return errorResponse(res, 'وقت انتهاء التعطيل يجب أن يكون وقتًا مستقبليًا صالحًا', 422);
      }
      suspendedUntil = parsedUntil;
    }
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId, deletedAt: null },
        data: {
          isActive,
          suspensionReason,
          suspendedUntil,
          ...(isActive
            ? { approvalStatus: SUBMISSION_STATUS.APPROVED, rejectionReason: null }
            : {}),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          approvalStatus: true,
          suspensionReason: true,
          suspendedUntil: true,
          role: { select: { name: true } },
        },
      });

      if (isActive && updatedUser.role.name === ROLES.VENDOR) {
        await tx.store.updateMany({
          where: { vendorId: userId },
          data: {
            isActive: true,
            approvalStatus: SUBMISSION_STATUS.APPROVED,
            rejectionReason: null,
          },
        });
      } else if (!isActive && updatedUser.role.name === ROLES.VENDOR) {
        await tx.store.updateMany({
          where: { vendorId: userId },
          data: {
            isActive: false,
            isOpen: false,
          },
        });
      }

      return updatedUser;
    });

    await auditAdminAction(req, isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER', 'User', userId, {
      reason: suspensionReason,
      suspendedUntil,
    });

    return successResponse(res, user);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

app.patch(
  '/api/admin/users/:id/suspend',
  authMiddleware,
  adminPermissionMiddleware('users.suspend'),
  (req, res) => setAdminManagedUserActive(req, res, false)
);

app.patch(
  '/api/admin/users/:id/activate',
  authMiddleware,
  adminPermissionMiddleware('users.suspend'),
  (req, res) => setAdminManagedUserActive(req, res, true)
);

app.delete(
  '/api/admin/users/:id',
  authMiddleware,
  adminPermissionMiddleware('users.suspend'),
  async (req, res) => {
    const userId = normalizeId(req.params.id);

    if (!userId) {
      return errorResponse(res, 'رقم المستخدم غير صالح', 400);
    }

    if (userId === req.user.userId) {
      return errorResponse(res, 'لا يمكنك حذف حسابك الحالي', 409);
    }

    try {
      const deletedUser = await prisma.user.update({
        where: { id: userId, deletedAt: null },
        data: {
          phone: `deleted:${userId}:${Date.now()}`,
          email: null,
          name: `حساب محذوف #${userId}`,
          password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
          profileImage: null,
          idImage: null,
          motorcycleImage: null,
          motorcycleCardImage: null,
          isActive: false,
          suspensionReason: null,
          suspendedUntil: null,
          deletedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          deletedAt: true,
        },
      });
      await auditAdminAction(req, 'DELETE_USER', 'User', userId);

      return successResponse(res, deletedUser);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// ADMIN STORES
// ============================================================

app.get(
  '/api/admin/stores',
  authMiddleware,
  adminPermissionMiddleware('stores.read'),
  async (req, res) => {
    try {
      const stores =
        await prisma.store.findMany({
          include: {
            vendor: {
              select: {
                name: true,
                phone: true,
              },
            },

            _count: {
              select: {
                orders: true,
              },
            },
          },

          orderBy: {
            id: 'desc',
          },
        });

      return successResponse(
        res,
        stores.map((store) => ({
          ...store,
          vendor: store.vendor
            ? {
                ...store.vendor,
                ...(canViewUserContacts(req) ? {} : { phone: null }),
              }
            : store.vendor,
        }))
      );
    } catch (error) {
      return handlePrismaError(
        error,
        res
      );
    }
  }
);

app.patch(
  '/api/admin/stores/:id',
  authMiddleware,
  adminPermissionMiddleware('stores.update'),
  async (req, res) => {
    const storeId = normalizeId(req.params.id);

    if (!storeId) {
      return errorResponse(res, 'رقم المتجر غير صالح', 400);
    }

    try {
      const data = {};

      if (req.body.name !== undefined) {
        const name = normalizeString(req.body.name);
        if (!name) {
          return errorResponse(res, 'اسم المتجر غير صالح', 422);
        }
        data.name = name;
      }

      if (req.body.description !== undefined) {
        data.description = normalizeString(req.body.description) || null;
      }

      if (typeof req.body.isOpen === 'boolean') {
        data.isOpen = req.body.isOpen;
      }

      const store = await prisma.store.update({
        where: { id: storeId },
        data,
        include: {
          vendor: { select: { name: true, phone: true } },
          _count: { select: { orders: true } },
        },
      });

      return successResponse(res, {
        ...store,
        vendor: store.vendor
          ? {
              ...store.vendor,
              ...(canViewUserContacts(req) ? {} : { phone: null }),
            }
          : store.vendor,
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

const setAdminManagedStoreActive = async (req, res, isActive) => {
  const storeId = normalizeId(req.params.id);

  if (!storeId) {
    return errorResponse(res, 'رقم المتجر غير صالح', 400);
  }

  try {
    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        isActive,
        ...(!isActive && { isOpen: false }),
      },
      include: {
        vendor: {
          select: { name: true, phone: true },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    return successResponse(res, {
      ...store,
      vendor: store.vendor
        ? {
            ...store.vendor,
            ...(canViewUserContacts(req) ? {} : { phone: null }),
          }
        : store.vendor,
    });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

app.patch(
  '/api/admin/stores/:id/suspend',
  authMiddleware,
  adminPermissionMiddleware('stores.suspend'),
  (req, res) => setAdminManagedStoreActive(req, res, false)
);

app.patch(
  '/api/admin/stores/:id/activate',
  authMiddleware,
  adminPermissionMiddleware('stores.suspend'),
  (req, res) => setAdminManagedStoreActive(req, res, true)
);

app.delete(
  '/api/admin/stores/:id',
  authMiddleware,
  adminPermissionMiddleware('stores.suspend'),
  (req, res) => setAdminManagedStoreActive(req, res, false)
);

// ============================================================
// ADMIN ORDERS
// ============================================================

const serializeAdminProduct = (item) => ({
  ...item,
  price: Number(item.price),
  originalPrice: item.originalPrice === null ? null : Number(item.originalPrice),
  discountValue: item.discountValue === null ? null : Number(item.discountValue),
  demoRating: item.demoRating === null ? null : Number(item.demoRating),
});

app.get(
  '/api/admin/products',
  authMiddleware,
  adminPermissionMiddleware('products.read'),
  async (req, res) => {
    try {
      const products = await prisma.menuItem.findMany({
        include: { store: { select: { id: true, name: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
      return successResponse(res, products.map(serializeAdminProduct));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

const normalizeProductPricing = (body) => {
  const originalPrice = parsePositiveNumber(body.originalPrice ?? body.price);
  if (originalPrice === null) return { error: 'السعر الأصلي غير صالح' };
  const discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
  const discountValue = body.discountValue === undefined || body.discountValue === ''
    ? 0
    : Number(body.discountValue);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return { error: 'قيمة الخصم غير صالحة' };
  }
  if (discountType === 'PERCENTAGE' && discountValue > 100) {
    return { error: 'نسبة الخصم لا يمكن أن تتجاوز 100%' };
  }
  if (discountType === 'FIXED' && discountValue > originalPrice) {
    return { error: 'الخصم الثابت لا يمكن أن يتجاوز السعر' };
  }
  const price = discountType === 'FIXED'
    ? originalPrice - discountValue
    : originalPrice - (originalPrice * discountValue / 100);
  return {
    originalPrice,
    discountType,
    discountValue,
    price: Number(price.toFixed(2)),
  };
};

app.post(
  '/api/admin/products',
  authMiddleware,
  adminPermissionMiddleware('products.write'),
  async (req, res) => {
    const storeId = normalizeId(req.body.storeId);
    const name = normalizeString(req.body.name);
    const pricing = normalizeProductPricing(req.body);
    if (!storeId || !name || pricing.error) {
      return errorResponse(res, pricing.error || 'اسم المنتج والمتجر والسعر مطلوبة', 422);
    }
    const isDemo = req.body.isDemo === true;
    const demoRating = isDemo ? Number(req.body.demoRating || 0) : null;
    const demoRatingCount = isDemo ? Number(req.body.demoRatingCount || 0) : 0;
    if (demoRating !== null && (!Number.isFinite(demoRating) || demoRating < 0 || demoRating > 5)) {
      return errorResponse(res, 'التقييم التجريبي يجب أن يكون بين 0 و5', 422);
    }
    try {
      const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
      if (!store) return errorResponse(res, 'المتجر غير موجود', 404);
      if (req.body.categoryId !== undefined && req.body.categoryId !== null && req.body.categoryId !== '') {
        const category = await prisma.menuItemCategory.findFirst({
          where: { id: normalizeId(req.body.categoryId), storeId },
          select: { id: true },
        });
        if (!category) return errorResponse(res, 'التصنيف لا ينتمي إلى المتجر المحدد', 422);
      }
      const item = await prisma.menuItem.create({
        data: {
          storeId,
          name,
          nameAr: normalizeString(req.body.nameAr) || null,
          description: normalizeString(req.body.description) || null,
          image: normalizeString(req.body.image) || null,
          categoryId: normalizeId(req.body.categoryId) || null,
          isAvailable: req.body.isAvailable !== false,
          isDemo,
          sortOrder: Number.isInteger(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0,
          originalPrice: pricing.originalPrice,
          price: pricing.price,
          discountType: pricing.discountValue > 0 ? pricing.discountType : null,
          discountValue: pricing.discountValue,
          demoRating,
          demoRatingCount,
          approvalStatus: SUBMISSION_STATUS.APPROVED,
        },
      });
      return successResponse(res, serializeAdminProduct(item), 201);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/admin/products/:id',
  authMiddleware,
  adminPermissionMiddleware('products.write'),
  async (req, res) => {
    const id = normalizeId(req.params.id);
    if (!id) return errorResponse(res, 'رقم المنتج غير صالح', 422);
    try {
      const existing = await prisma.menuItem.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'المنتج غير موجود', 404);
      const pricing = normalizeProductPricing({
        originalPrice: req.body.originalPrice ?? existing.originalPrice ?? existing.price,
        discountType: req.body.discountType ?? existing.discountType,
        discountValue: req.body.discountValue ?? existing.discountValue ?? 0,
      });
      if (pricing.error) return errorResponse(res, pricing.error, 422);
      const targetStoreId = req.body.storeId === undefined ? existing.storeId : normalizeId(req.body.storeId);
      if (!targetStoreId) return errorResponse(res, 'المتجر غير صالح', 422);
      if (req.body.storeId !== undefined) {
        const store = await prisma.store.findUnique({ where: { id: targetStoreId }, select: { id: true } });
        if (!store) return errorResponse(res, 'المتجر غير موجود', 404);
      }
      if (req.body.categoryId !== undefined && req.body.categoryId !== null && req.body.categoryId !== '') {
        const category = await prisma.menuItemCategory.findFirst({
          where: { id: normalizeId(req.body.categoryId), storeId: targetStoreId },
          select: { id: true },
        });
        if (!category) return errorResponse(res, 'التصنيف لا ينتمي إلى المتجر المحدد', 422);
      }
      const data = {
        ...(req.body.name !== undefined ? { name: normalizeString(req.body.name) } : {}),
        ...(req.body.nameAr !== undefined ? { nameAr: normalizeString(req.body.nameAr) || null } : {}),
        ...(req.body.description !== undefined ? { description: normalizeString(req.body.description) || null } : {}),
        ...(req.body.image !== undefined ? { image: normalizeString(req.body.image) || null } : {}),
        ...(req.body.storeId !== undefined ? { storeId: normalizeId(req.body.storeId) } : {}),
        ...(req.body.categoryId !== undefined ? { categoryId: normalizeId(req.body.categoryId) || null } : {}),
        ...(typeof req.body.isAvailable === 'boolean' ? { isAvailable: req.body.isAvailable } : {}),
        ...(req.body.sortOrder !== undefined ? { sortOrder: Number(req.body.sortOrder) || 0 } : {}),
        ...(req.body.isDemo !== undefined ? { isDemo: req.body.isDemo === true } : {}),
        ...(req.body.demoRating !== undefined ? { demoRating: Number(req.body.demoRating) || null } : {}),
        ...(req.body.demoRatingCount !== undefined ? { demoRatingCount: Number(req.body.demoRatingCount) || 0 } : {}),
        ...pricing,
      };
      delete data.error;
      const item = await prisma.menuItem.update({ where: { id }, data });
      return successResponse(res, serializeAdminProduct(item));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.delete(
  '/api/admin/products/:id',
  authMiddleware,
  adminPermissionMiddleware('products.write'),
  async (req, res) => {
    const id = normalizeId(req.params.id);
    if (!id) return errorResponse(res, 'رقم المنتج غير صالح', 422);
    try {
      await prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
      return successResponse(res, null, 200, { message: 'تم تعطيل المنتج' });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/orders',
  authMiddleware,
  adminPermissionMiddleware('orders.read'),
  async (req, res) => {
    try {
      const orders = await prisma.order.findMany({
        include: {
          customer: {
            select: { name: true, phone: true },
          },
          store: {
            select: { name: true },
          },
          delivery: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse(
        res,
        orders.map((order) => ({
          ...order,
          customer: order.customer
            ? {
                ...order.customer,
                ...(canViewUserContacts(req) ? {} : { phone: null }),
              }
            : order.customer,
          delivery: order.delivery
            ? {
                ...order.delivery,
                ...(canViewUserContacts(req) ? {} : { phone: null }),
              }
            : order.delivery,
        }))
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/payments',
  authMiddleware,
  adminPermissionMiddleware('orders.read'),
  async (req, res) => {
    try {
      const payments = await prisma.paymentTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalPrice: true,
              customer: { select: { name: true } },
              store: { select: { name: true } },
            },
          },
        },
      });

      return successResponse(res, payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
        order: payment.order
          ? { ...payment.order, totalPrice: Number(payment.order.totalPrice) }
          : null,
      })));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/offers',
  authMiddleware,
  adminPermissionMiddleware('stores.read'),
  async (req, res) => {
    try {
      const offers = await prisma.offer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { store: { select: { id: true, name: true, vendor: { select: { name: true } } } } },
      });
      return successResponse(res, offers.map((offer) => ({
        ...offer,
        discountValue: Number(offer.discountValue),
      })));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/wallets',
  authMiddleware,
  adminPermissionMiddleware('finance.read'),
  async (req, res) => {
    try {
      const wallets = await prisma.wallet.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: {
          user: { select: { id: true, name: true, phone: true, role: { select: { name: true } } } },
          transactions: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, amount: true, type: true, description: true, createdAt: true } },
        },
      });
      return successResponse(res, wallets.map((wallet) => ({
        ...wallet,
        balance: Number(wallet.balance),
        transactions: wallet.transactions.map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount),
        })),
      })));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/invoices',
  authMiddleware,
  adminPermissionMiddleware('finance.read'),
  async (req, res) => {
    try {
      const invoices = await prisma.order.findMany({
        where: { status: ORDER_STATUS.DELIVERED },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          subtotal: true,
          deliveryFee: true,
          totalPrice: true,
          createdAt: true,
          customer: { select: { name: true } },
          store: { select: { name: true } },
          paymentTransactions: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, method: true } },
        },
      });
      return successResponse(res, invoices.map((invoice) => ({
        ...invoice,
        subtotal: Number(invoice.subtotal),
        deliveryFee: Number(invoice.deliveryFee),
        totalPrice: Number(invoice.totalPrice),
      })));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/notifications',
  authMiddleware,
  adminPermissionMiddleware('notifications.read'),
  async (req, res) => {
    try {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { user: { select: { id: true, name: true, role: { select: { name: true } } } } },
      });
      return successResponse(res, notifications);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.post(
  '/api/admin/notifications/broadcast',
  authMiddleware,
  adminPermissionMiddleware('notifications.write'),
  async (req, res) => {
    const title = normalizeString(req.body?.title);
    const body = normalizeString(req.body?.body);
    const role = normalizeString(req.body?.role).toLowerCase();
    if (!title || !body || title.length > 120 || body.length > 1000) {
      return errorResponse(res, 'عنوان ونص الإشعار مطلوبان وبحدود صالحة', 422);
    }
    if (role && !['customer', 'vendor', 'delivery', 'admin', 'sub_admin'].includes(role)) {
      return errorResponse(res, 'الدور المستهدف غير صالح', 422);
    }
    try {
      const idempotencyKey = normalizeString(req.headers['idempotency-key']);
      const createBroadcast = async (client) => {
        const users = await client.user.findMany({
          where: { isActive: true, deletedAt: null, ...(role ? { role: { name: role } } : {}) },
          select: { id: true },
        });
        const result = users.length
          ? await client.notification.createMany({
              data: users.map(({ id }) => ({ userId: id, type: 'SYSTEM', title, body })),
            })
          : { count: 0 };
        await client.auditLog.create({
          data: {
            actorId: req.user.userId,
            action: 'BROADCAST_NOTIFICATION',
            entity: 'Notification',
            entityId: idempotencyKey || null,
            metadata: { role: role || null, sent: result.count },
            ipAddress: req.ip || null,
          },
        });
        return { sent: result.count };
      };

      if (idempotencyKey) {
        const cacheKey = `${req.user.userId}:${idempotencyKey}`;
        const previous = notificationRequests.get(cacheKey);
        if (previous) return successResponse(res, previous.body, previous.status);
        const responseBody = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cacheKey}))`;
          const previousAudit = await tx.auditLog.findFirst({
            where: { actorId: req.user.userId, action: 'BROADCAST_NOTIFICATION', entityId: idempotencyKey },
            orderBy: { createdAt: 'desc' },
            select: { metadata: true },
          });
          if (previousAudit?.metadata && typeof previousAudit.metadata.sent === 'number') {
            return { sent: previousAudit.metadata.sent };
          }
          return createBroadcast(tx);
        });
        notificationRequests.set(cacheKey, { body: responseBody, status: 201 });
        return successResponse(res, responseBody, 201);
      }

      const responseBody = await createBroadcast(prisma);
      return successResponse(res, responseBody, 201);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/ratings',
  authMiddleware,
  adminPermissionMiddleware('ratings.read'),
  async (req, res) => {
    try {
      const ratings = await prisma.rating.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          store: { select: { id: true, name: true } },
          menuItem: { select: { id: true, name: true } },
          order: { select: { id: true, status: true } },
        },
      });
      return successResponse(res, ratings.map((rating) => ({
        ...rating,
        customer: rating.customer
          ? {
              ...rating.customer,
              phone: canViewUserContacts(req) ? rating.customer.phone : null,
            }
          : rating.customer,
      })));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.delete(
  '/api/admin/ratings/:id',
  authMiddleware,
  adminPermissionMiddleware('ratings.delete'),
  async (req, res) => {
    const id = normalizeId(req.params.id);
    if (!id) return errorResponse(res, 'رقم التقييم غير صالح', 422);
    try {
      await prisma.rating.delete({ where: { id } });
      await auditAdminAction(req, 'DELETE_RATING', 'Rating', id);
      return successResponse(res, null, 200, { message: 'تم حذف التقييم' });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/complaints',
  authMiddleware,
  adminPermissionMiddleware('complaints.read'),
  async (req, res) => {
    const role = normalizeString(req.query.role).toLowerCase();
    const roleFilter = ['customer', 'vendor', 'delivery'].includes(role)
      ? { role: { name: role } }
      : undefined;

    try {
      const complaints = await prisma.chatSession.findMany({
        where: {
          status: { in: ['OPEN', 'ESCALATED'] },
          ...(roleFilter ? { user: roleFilter } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: {
          user: { select: { id: true, name: true, phone: true, role: { select: { name: true } } } },
          order: { select: { id: true, status: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      return successResponse(res, complaints.map((complaint) => ({
        ...complaint,
        user: complaint.user
          ? {
              ...complaint.user,
              phone: canViewUserContacts(req) ? complaint.user.phone : null,
            }
          : complaint.user,
      })));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// ADMIN VENDOR SUBMISSIONS
// ============================================================

app.get(
  '/api/admin/submissions',
  authMiddleware,
  adminPermissionMiddleware('stores.read'),
  async (req, res) => {
    try {
      const [stores, menuItems, offers, partnerUsers] = await Promise.all([
        prisma.store.findMany({
          where: {
            approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW,
            vendor: { approvalStatus: SUBMISSION_STATUS.APPROVED },
          },
          include: { vendor: { select: { id: true, name: true, phone: true, profileImage: true } } },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.menuItem.findMany({
          where: { approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                image: true,
                vendor: { select: { id: true, name: true, phone: true, profileImage: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.offer.findMany({
          where: { approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                image: true,
                vendor: { select: { id: true, name: true, phone: true, profileImage: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.user.findMany({
          where: {
            approvalStatus: SUBMISSION_STATUS.PENDING_ADMIN_REVIEW,
            deletedAt: null,
            role: { name: { in: [ROLES.VENDOR, ROLES.DELIVERY] } },
          },
          include: {
            role: { select: { name: true } },
            store: { select: { id: true, name: true, image: true, approvalStatus: true } },
            deliveryProfile: {
              select: { vehicleType: true, vehiclePlate: true, latitude: true, longitude: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const submissions = [
        ...partnerUsers.map((item) => ({
          ...item,
          submissionType: 'partner_user',
          submissionRole: item.role?.name || null,
        })),
        ...stores.map((item) => ({ ...item, submissionType: 'store' })),
        ...menuItems.map((item) => ({ ...item, submissionType: 'menu_item' })),
        ...offers.map((item) => ({ ...item, submissionType: 'offer' })),
      ];
      return successResponse(
        res,
        canViewUserContacts(req)
          ? submissions
          : submissions.map((item) => ({
              ...item,
              vendor: item.vendor ? { ...item.vendor, phone: null } : item.vendor,
              store: item.store
                ? {
                    ...item.store,
                    vendor: item.store.vendor
                      ? { ...item.store.vendor, phone: null }
                      : item.store.vendor,
                  }
                : item.store,
            }))
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

const updateSubmission = async (req, res, status) => {
  const id = normalizeId(req.params.id);
  const type = normalizeString(req.params.type).toLowerCase();
  if (!id || !['partner_user', 'user', 'store', 'stores', 'menu_item', 'menuitem', 'offer', 'offers'].includes(type)) {
    return errorResponse(res, 'بيانات الإرسال غير صالحة', 400);
  }

  const rejectionReason = normalizeString(req.body.rejectionReason || req.body.reason);
  if (status === SUBMISSION_STATUS.REJECTED && (!rejectionReason || rejectionReason.length > 500)) {
    return errorResponse(res, 'اكتب سبب رفض واضحًا بحد أقصى 500 حرف', 422);
  }

  const data = {
    approvalStatus: status,
    rejectionReason: status === SUBMISSION_STATUS.REJECTED ? rejectionReason : null,
  };

  try {
    let item;
    let vendorId;
    if (type === 'partner_user' || type === 'user') {
      item = await prisma.user.update({
        where: { id },
        data: {
          approvalStatus: status,
          isActive: status === SUBMISSION_STATUS.APPROVED,
          rejectionReason: status === SUBMISSION_STATUS.REJECTED ? rejectionReason : null,
        },
        include: { role: { select: { name: true } }, store: true },
      });
      vendorId = item.id;
      if (item.role?.name === ROLES.VENDOR && item.store) {
        await prisma.store.update({
          where: { id: item.store.id },
          data: {
            approvalStatus: status,
            rejectionReason: status === SUBMISSION_STATUS.REJECTED ? rejectionReason : null,
          },
        });
      }
    } else if (type === 'store' || type === 'stores') {
      item = await prisma.store.update({ where: { id }, data });
      vendorId = item.vendorId;
    } else if (type === 'menu_item' || type === 'menuitem') {
      item = await prisma.menuItem.update({ where: { id }, data });
      vendorId = (await prisma.menuItem.findUnique({ where: { id }, select: { store: { select: { vendorId: true } } } }))?.store.vendorId;
    } else {
      item = await prisma.offer.update({ where: { id }, data });
      vendorId = (await prisma.offer.findUnique({ where: { id }, select: { store: { select: { vendorId: true } } } }))?.store.vendorId;
    }

    if (vendorId) {
      const vendor = await prisma.user.findUnique({ where: { id: vendorId }, select: { notificationsEnabled: true } });
      if (vendor?.notificationsEnabled !== false) {
        const statusText = status === SUBMISSION_STATUS.APPROVED ? 'تم اعتماد ونشر' : 'تم رفض';
        const reasonText = status === SUBMISSION_STATUS.REJECTED ? ` السبب: ${rejectionReason}.` : '';
        await prisma.notification.create({
          data: {
            userId: vendorId,
            type: 'SYSTEM',
            title: status === SUBMISSION_STATUS.APPROVED ? 'تم اعتماد طلبك' : 'تم رفض طلبك',
            body: `${statusText} ${type === 'partner_user' || type === 'user' ? 'طلب الانضمام' : type === 'store' || type === 'stores' ? 'المتجر' : type === 'offer' || type === 'offers' ? 'العرض' : 'المنتج'} الخاص بك.${reasonText}`,
            data: { submissionType: type, submissionId: id, approvalStatus: status, rejectionReason: rejectionReason || null },
          },
        });
      }
    }
    return successResponse(res, item);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

app.patch(
  '/api/admin/submissions/:type/:id/approve',
  authMiddleware,
  adminPermissionMiddleware('stores.update'),
  (req, res) => updateSubmission(req, res, SUBMISSION_STATUS.APPROVED)
);

app.patch(
  '/api/admin/submissions/:type/:id/reject',
  authMiddleware,
  adminPermissionMiddleware('stores.update'),
  (req, res) => updateSubmission(req, res, SUBMISSION_STATUS.REJECTED)
);

// ============================================================
// ADMIN DELIVERY
// ============================================================

app.get(
  '/api/admin/delivery',
  authMiddleware,
  adminPermissionMiddleware('delivery.read'),
  async (req, res) => {
    try {
      const deliveries = await prisma.user.findMany({
        where: {
          role: {
            name: ROLES.DELIVERY,
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          isActive: true,
          approvalStatus: true,
          deliveryProfile: true,
          _count: {
            select: { deliveries: true },
          },
        },
        orderBy: { id: 'desc' },
      });

      return successResponse(
        res,
        deliveries.map((user) => ({
          ...user,
          ...privateContactFields(req, user),
        }))
      );
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// ADMIN REPORTS
// ============================================================

app.get(
  '/api/admin/reports',
  authMiddleware,
  adminPermissionMiddleware('reports.read'),
  async (req, res) => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalOrders, revenue, commissions, newUsers, activeStores, storeGroups, itemGroups] =
        await Promise.all([
          prisma.order.count(),
          prisma.order.aggregate({
            where: { status: ORDER_STATUS.DELIVERED },
            _sum: { totalPrice: true },
          }),
          prisma.order.aggregate({
            where: { status: ORDER_STATUS.DELIVERED },
            _sum: { platformCommission: true },
          }),
          prisma.user.count({
            where: { createdAt: { gte: startOfMonth } },
          }),
          prisma.store.count({
            where: { isActive: true },
          }),
          prisma.order.groupBy({
            by: ['storeId'],
            _count: { _all: true },
            orderBy: { _count: { storeId: 'desc' } },
            take: 3,
          }),
          prisma.orderItem.groupBy({
            by: ['menuItemId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 3,
          }),
        ]);

      const [stores, menuItems] = await Promise.all([
        prisma.store.findMany({
          where: { id: { in: storeGroups.map((item) => item.storeId) } },
          select: { id: true, name: true },
        }),
        prisma.menuItem.findMany({
          where: { id: { in: itemGroups.map((item) => item.menuItemId) } },
          select: { id: true, name: true },
        }),
      ]);

      const storeNames = new Map(stores.map((store) => [store.id, store.name]));
      const itemNames = new Map(menuItems.map((item) => [item.id, item.name]));

      return successResponse(res, {
        totalOrders,
        revenue: Number(revenue._sum.totalPrice || 0),
        commissions: Number(commissions._sum.platformCommission || 0),
        newUsers,
        activeStores,
        topStores: storeGroups.map((item) => ({
          id: item.storeId,
          name: storeNames.get(item.storeId) || 'متجر غير معروف',
          orders: item._count._all,
        })),
        topItems: itemGroups.map((item) => ({
          id: item.menuItemId,
          name: itemNames.get(item.menuItemId) || 'منتج غير معروف',
          quantity: item._sum.quantity || 0,
        })),
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.get(
  '/api/admin/audit-log',
  authMiddleware,
  adminPermissionMiddleware('audit.read'),
  async (req, res) => {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;

    try {
      const logs = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          actor: { select: { id: true, name: true, role: { select: { name: true } } } },
        },
      });

      return successResponse(res, logs);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// SUB-ADMIN MANAGEMENT
// ============================================================

const subAdminSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
  subAdminPermissions: {
    select: {
      permission: { select: { name: true } },
    },
  },
};

const serializeSubAdmin = (user) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  isActive: user.isActive,
  role: ROLES.SUB_ADMIN,
  permissions: user.subAdminPermissions.map(
    (item) => item.permission.name
  ),
});

const ADMIN_PERMISSION_CATALOG = [
  { name: 'users.read', label: 'عرض المستخدمين' },
  { name: 'users.update', label: 'تعديل المستخدمين' },
  { name: 'users.suspend', label: 'تفعيل وتعطيل المستخدمين' },
  { name: 'stores.read', label: 'عرض المتاجر' },
  { name: 'stores.update', label: 'إدارة المتاجر والمنتجات' },
  { name: 'stores.suspend', label: 'تفعيل وتعطيل المتاجر' },
  { name: 'products.read', label: 'عرض المنتجات' },
  { name: 'products.write', label: 'إدارة المنتجات' },
  { name: 'orders.read', label: 'عرض الطلبات' },
  { name: 'delivery.read', label: 'إدارة التوصيل' },
  { name: 'finance.read', label: 'عرض المالية' },
  { name: 'notifications.read', label: 'عرض الإشعارات' },
  { name: 'notifications.write', label: 'إرسال الإشعارات' },
  { name: 'ratings.read', label: 'عرض التقييمات' },
  { name: 'ratings.delete', label: 'حذف التقييمات' },
  { name: 'complaints.read', label: 'عرض الشكاوى' },
  { name: 'support.read', label: 'عرض محادثات الدعم' },
  { name: 'support.reply', label: 'الرد في محادثات الدعم' },
  { name: 'support.status', label: 'تغيير حالة محادثات الدعم' },
  { name: 'reports.read', label: 'عرض التقارير' },
  { name: 'audit.read', label: 'عرض سجل العمليات' },
];
const ADMIN_PERMISSION_NAMES = new Set(ADMIN_PERMISSION_CATALOG.map((permission) => permission.name));

app.get(
  '/api/admin/permissions',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  (req, res) => successResponse(res, ADMIN_PERMISSION_CATALOG)
);

app.get(
  '/api/admin/sub-admins',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, role: { name: ROLES.SUB_ADMIN } },
        select: subAdminSelect,
        orderBy: { id: 'desc' },
      });

      return successResponse(res, users.map(serializeSubAdmin));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.post(
  '/api/admin/sub-admins',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  async (req, res) => {
    const name = normalizeString(req.body.name);
    const phone = normalizePhone(req.body.phone);
    const email = normalizeString(req.body.email) || null;
    const password = req.body.password;
    const permissions = [...new Set(
      Array.isArray(req.body.permissions)
        ? req.body.permissions.map(normalizeString).filter(Boolean)
        : []
    )];

    if (!name || !phone || !isValidPhone(phone) || !isValidPassword(password)) {
      return errorResponse(
        res,
        'الاسم والهاتف وكلمة مرور من 8 أحرف مطلوبة',
        422
      );
    }
    if (email && !isValidEmail(email)) {
      return errorResponse(res, 'البريد الإلكتروني غير صالح', 422);
    }

    if (permissions.length === 0) {
      return errorResponse(res, 'يجب اختيار صلاحية واحدة على الأقل', 422);
    }
    if (permissions.some((permission) => !ADMIN_PERMISSION_NAMES.has(permission))) {
      return errorResponse(res, 'توجد صلاحية غير مدعومة في النظام', 422);
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
        const role = await tx.role.upsert({
          where: { name: ROLES.SUB_ADMIN },
          update: {},
          create: {
            name: ROLES.SUB_ADMIN,
            description: 'مدير فرعي',
          },
        });

        const permissionRecords = await Promise.all(
          permissions.map((permission) => tx.permission.upsert({
            where: { name: permission },
            update: {},
            create: { name: permission },
          }))
        );

        return tx.user.create({
          data: {
            name,
            phone,
            email,
            password: await bcrypt.hash(password, 12),
            roleId: role.id,
            subAdminPermissions: {
              create: permissionRecords.map((permission) => ({
                permissionId: permission.id,
                grantedById: req.user.userId,
              })),
            },
          },
          select: subAdminSelect,
        });
      });

      await auditAdminAction(req, 'CREATE_SUBADMIN', 'User', user.id, { permissions });
      return successResponse(res, serializeSubAdmin(user), 201);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.patch(
  '/api/admin/sub-admins/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  async (req, res) => {
    const userId = normalizeId(req.params.id);
    if (!userId) {
      return errorResponse(res, 'رقم المشرف غير صالح', 400);
    }

    try {
      const existing = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null, role: { name: ROLES.SUB_ADMIN } },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          subAdminPermissions: { select: { permission: { select: { name: true } } } },
        },
      });

      if (!existing) {
        return errorResponse(res, 'المشرف الفرعي غير موجود', 404);
      }

      const data = {};
      if (req.body.name !== undefined) {
        const name = normalizeString(req.body.name);
        if (!name) return errorResponse(res, 'اسم المشرف غير صالح', 422);
        data.name = name;
      }
      if (req.body.phone !== undefined) {
        const phone = normalizePhone(req.body.phone);
        if (!phone || !isValidPhone(phone)) {
          return errorResponse(res, 'رقم الهاتف غير صالح', 422);
        }
        data.phone = phone;
      }
      if (req.body.email !== undefined) {
        const email = normalizeString(req.body.email);
        if (email && !isValidEmail(email)) {
          return errorResponse(res, 'البريد الإلكتروني غير صالح', 422);
        }
        data.email = email || null;
      }
      if (req.body.password !== undefined && req.body.password !== '') {
        if (!isValidPassword(req.body.password)) {
          return errorResponse(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', 422);
        }
        data.password = await bcrypt.hash(req.body.password, 12);
      }
      if (req.body.isActive !== undefined) {
        if (typeof req.body.isActive !== 'boolean') {
          return errorResponse(res, 'حالة المشرف غير صالحة', 422);
        }
        data.isActive = req.body.isActive;
      }

      let permissions;
      if (req.body.permissions !== undefined) {
        if (!Array.isArray(req.body.permissions)) {
          return errorResponse(res, 'قائمة الصلاحيات غير صالحة', 422);
        }
        permissions = [...new Set(req.body.permissions.map(normalizeString).filter(Boolean))];
        if (!permissions.length) {
          return errorResponse(res, 'يجب اختيار صلاحية واحدة على الأقل', 422);
        }
        if (permissions.some((permission) => !ADMIN_PERMISSION_NAMES.has(permission))) {
          return errorResponse(res, 'توجد صلاحية غير مدعومة في النظام', 422);
        }
      }

      if (!Object.keys(data).length && permissions === undefined) {
        return errorResponse(res, 'لا توجد بيانات لتحديثها', 422);
      }

      const user = await prisma.$transaction(async (tx) => {
        if (permissions !== undefined) {
          const permissionRecords = await Promise.all(
            permissions.map((permission) => tx.permission.upsert({
              where: { name: permission },
              update: {},
              create: { name: permission },
            }))
          );

          await tx.subAdminPermission.deleteMany({ where: { subAdminId: userId } });
          data.subAdminPermissions = {
            create: permissionRecords.map((permission) => ({
              permissionId: permission.id,
              grantedById: req.user.userId,
            })),
          };
        }

        return tx.user.update({
          where: { id: userId },
          data,
          select: subAdminSelect,
        });
      });

      await auditAdminAction(req, permissions !== undefined ? 'UPDATE_SUBADMIN_PERMISSIONS' : 'UPDATE_SUBADMIN', 'User', userId, {
        changedFields: Object.keys(data).filter((key) => key !== 'password'),
        permissionsChanged: permissions !== undefined,
      });
      return successResponse(res, serializeSubAdmin(user));
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

app.delete(
  '/api/admin/sub-admins/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  async (req, res) => {
    const userId = normalizeId(req.params.id);

    if (!userId) {
      return errorResponse(res, 'رقم المشرف غير صالح', 400);
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id: userId, deletedAt: null, role: { name: ROLES.SUB_ADMIN } },
          data: {
            phone: `deleted:sub-admin:${userId}:${Date.now()}`,
            email: null,
            name: `حساب مشرف محذوف #${userId}`,
            password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
            isActive: false,
            deletedAt: new Date(),
          },
        });

        if (updated.count) {
          await tx.subAdminPermission.deleteMany({ where: { subAdminId: userId } });
        }
        return updated;
      });

      if (result.count === 0) {
        return errorResponse(res, 'المشرف الفرعي غير موجود', 404);
      }

      await auditAdminAction(req, 'DELETE_SUBADMIN', 'User', userId);
      return successResponse(res, null, 200, {
        message: 'تم حذف المشرف الفرعي',
      });
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
);

// ============================================================
// 404
// ============================================================

if (fs.existsSync(WEB_DIST_PATH)) {
  app.use(express.static(WEB_DIST_PATH));
}

app.use(
  (req, res) => {
    if (
      fs.existsSync(WEB_DIST_PATH) &&
      !req.path.startsWith('/api')
    ) {
      return res.sendFile(
        path.join(WEB_DIST_PATH, 'index.html')
      );
    }

    return errorResponse(
      res,
      `المسار "${req.method} ${req.path}" غير موجود`,
      404,
      {
        method: req.method,
        path: req.path,
      }
    );
  }
);

// ============================================================
// Global Error Handler
// ============================================================

app.use(
  (err, req, res, next) => {
    const isMalformedJson =
      err?.type === 'entity.parse.failed' ||
      (err instanceof SyntaxError && err?.status === 400 && err?.body !== undefined);

    if (isMalformedJson) {
      console.warn('Malformed JSON request:', {
        method: req.method,
        path: req.path,
      });

      return errorResponse(
        res,
        'صيغة JSON غير صحيحة. أرسل البيانات بصيغة JSON صالحة.',
        400
      );
    }

    console.error(
      'GLOBAL ERROR:',
      err
    );

    if (
      res.headersSent
    ) {
      return next(err);
    }

    return errorResponse(
      res,
      NODE_ENV ===
        'production'
        ? 'حدث خطأ في السيرفر'
        : err.message ||
            'حدث خطأ في السيرفر',
      500
    );
  }
);

// ============================================================
// Server Start
// ============================================================

const startServer =
  async () => {
    try {
      await prisma.$connect();

      console.log(
        '✅ Database connected'
      );

      await syncScheduledStoreStatuses();
      setInterval(syncScheduledStoreStatuses, 60 * 1000);

      app.listen(
        PORT,
        '0.0.0.0',
        () => {
          console.log('');
          console.log(
            '================================='
          );
          console.log(
            '🚀 NOW BACKEND IS RUNNING'
          );
          console.log(
            `📡 Port: ${PORT}`
          );
          console.log(
            `🌐 http://localhost:${PORT}`
          );
          console.log(
            `🌍 Environment: ${NODE_ENV}`
          );
          console.log(
            '================================='
          );
          console.log('');
        }
      );
    } catch (error) {
      console.error(
        '❌ Failed to start server:',
        error
      );

      await prisma.$disconnect();

      process.exit(1);
    }
  };

const shutdown = async (signal) => {
  console.log(
    `\n${signal} received. Shutting down...`
  );

  try {
    await prisma.$disconnect();

    console.log(
      '✅ Database disconnected'
    );

    process.exit(0);
  } catch (error) {
    console.error(
      'Shutdown error:',
      error
    );

    process.exit(1);
  }
};

if (require.main === module) {
  startServer();

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = {
  app,
  prisma,
  startServer,
};
