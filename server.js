require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const WEB_DIST_PATH = path.join(__dirname, 'dist');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    '❌ JWT_SECRET غير موجود في ملف .env. أضف JWT_SECRET قبل تشغيل السيرفر.'
  );
}

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

const allowedOrigins = (() => {
  // 🔹 القيمة الافتراضية الآمنة - لا تحتاج لـ build time
  const corsOrigin = (process.env.CORS_ORIGIN || '*').trim();

  // 🔹 إذا كانت فارغة أو غير معرفة، استخدم *
  if (!corsOrigin || corsOrigin === '' || corsOrigin === 'undefined') {
    return '*';
  }

  // 🔹 إذا كانت *
  if (corsOrigin === '*') {
    return '*';
  }

  // 🔹 إذا كانت قائمة origins
  return corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
})();

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

app.options('*', cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

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
        role: { select: { name: true } },
      },
    });

    if (!user || !user.isActive || user.role.name !== decoded.role) {
      return errorResponse(
        res,
        'الحساب غير نشط أو تغيرت صلاحياته',
        401
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
      const permission = await prisma.subAdminPermission.findFirst({
        where: {
          subAdminId: req.user.userId,
          permission: { name: permissionName },
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

// ============================================================
// Prisma Error Helper
// ============================================================

const handlePrismaError = (error, res) => {
  console.error('PRISMA ERROR:', error);

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
        status: 'online',
        environment: NODE_ENV,
        database: 'connected',
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
  return successResponse(
    res,
    {
      name: 'NOW Delivery API',
      version: '1.0.0',
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
      version: '1.0.0',
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
  const phone = normalizePhone(req.body.phone);
  const password = req.body.password;
  const requestedRole = normalizeString(req.body.role).toLowerCase();

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
        ...(requestedRole
          ? {
              role: {
                name: requestedRole,
              },
            }
          : {}),
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
        requestedRole
          ? 'رقم الهاتف أو الدور غير صحيح'
          : 'رقم الهاتف أو كلمة المرور غير صحيحة',
        401
      );
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
          email: user.email,
          role: user.role.name,
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

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants(phone) },
      },
    });

    if (existingUser) {
      return errorResponse(
        res,
        'رقم الهاتف موجود بالفعل',
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
          },
        });

        let store = null;

        if (role === ROLES.VENDOR) {
          store = await tx.store.create({
            data: {
              name: storeName,
              vendorId: user.id,
              isOpen: true,
            },
          });
        }

        return {
          user,
          store,
        };
      }
    );

    const token = generateToken(
      result.user.id,
      role
    );

    return successResponse(
      res,
      {
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
          email: result.user.email,
          role,
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
          email: user.email,
          role: user.role.name,
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

// ============================================================
// STORE ROUTES
// ============================================================

// ------------------------------------------------------------
// Get Stores
// ------------------------------------------------------------

app.get('/api/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    return successResponse(
      res,
      stores
    );
  } catch (error) {
    return handlePrismaError(error, res);
  }
});

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
        },
        include: {
          vendor: {
            select: {
              name: true,
              phone: true,
            },
          },
          menuItems: true,
        },
      });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      return successResponse(
        res,
        store
      );
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

app.patch(
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
          storeId,
        },
        orderBy: {
          id: 'desc',
        },
      });

      return successResponse(
        res,
        items
      );
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
          storeId,
        },
      });

      return successResponse(
        res,
        item,
        201
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

      const updatedItem =
        await prisma.menuItem.update({
          where: {
            id: itemId,
          },
          data,
        });

      return successResponse(
        res,
        updatedItem
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

      await prisma.menuItem.delete({
        where: {
          id: itemId,
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

      let parsedScheduledAt = null;

      if (scheduledAt) {
        parsedScheduledAt =
          new Date(scheduledAt);

        if (
          Number.isNaN(
            parsedScheduledAt.getTime()
          )
        ) {
          return errorResponse(
            res,
            'موعد الطلب غير صالح',
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

        if (!menuItem.isAvailable) {
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
          name: menuItem.name,
          priceAtOrder: price,
          quantity,
        });
      }

      const totalPrice =
        preparedItems.reduce(
          (total, item) =>
            total +
            item.priceAtOrder *
              item.quantity,
          0
        );

      const order =
        await prisma.$transaction(
          async (tx) => {
            return tx.order.create({
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

                totalPrice,

                scheduledAt:
                  parsedScheduledAt,

                status:
                  ORDER_STATUS.PENDING,

                items: {
                  create:
                    preparedItems,
                },
              },

              include: {
                items: true,
              },
            });
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
            status:
              ORDER_STATUS.PENDING,
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
            OR: [
              {
                deliveryId,
              },
              {
                status:
                  ORDER_STATUS.PENDING,
                deliveryId: null,
              },
            ],
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
        select: { status: true },
      });

      if (!profile || profile.status !== 'AVAILABLE') {
        return errorResponse(res, 'يجب تغيير حالتك إلى متاح لاستقبال الطلبات', 409);
      }

      const orders = await prisma.order.findMany({
        where: {
          status: ORDER_STATUS.READY,
          deliveryId: null,
        },
        include: deliveryOrderInclude,
        orderBy: { createdAt: 'asc' },
      });

      return successResponse(res, orders);
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
        const updated = await tx.order.update({
          where: { id: orderId },
          data: { status },
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
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return errorResponse(res, 'إحداثيات الموقع غير صالحة', 422);
    }

    try {
      const profile = await prisma.deliveryProfile.upsert({
        where: { userId: req.user.userId },
        update: { latitude, longitude },
        create: {
          userId: req.user.userId,
          latitude,
          longitude,
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

// ============================================================
// ADMIN - ALL ORDERS
// ============================================================

app.get(
  '/api/orders',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
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

        [ORDER_STATUS.READY]: [],

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

      const updatedOrder =
        await prisma.order.update({
          where: {
            id: orderId,
          },

          data: updateData,

          include:
            orderInclude,
        });

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
  roleMiddleware(ROLES.ADMIN, ROLES.SUB_ADMIN),
  async (req, res) => {
    try {
      const [users, stores, orders, deliveries] = await Promise.all([
        prisma.user.count(),
        prisma.store.count(),
        prisma.order.count(),
        prisma.user.count({
          where: {
            role: {
              name: ROLES.DELIVERY,
            },
          },
        }),
      ]);

      return successResponse(res, {
        users,
        stores,
        orders,
        deliveries,
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
      const users =
        await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            isActive: true,

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
        users
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
        data.email = normalizeString(req.body.email) || null;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          role: { select: { name: true } },
        },
      });

      return successResponse(res, user);
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

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        role: { select: { name: true } },
      },
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
  (req, res) => setAdminManagedUserActive(req, res, false)
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
        stores
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
      });

      return successResponse(res, store);
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

    return successResponse(res, store);
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

      return successResponse(res, orders);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }
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
          deliveryProfile: true,
          _count: {
            select: { deliveries: true },
          },
        },
        orderBy: { id: 'desc' },
      });

      return successResponse(res, deliveries);
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

      const [totalOrders, revenue, newUsers, activeStores, storeGroups, itemGroups] =
        await Promise.all([
          prisma.order.count(),
          prisma.order.aggregate({
            where: { status: ORDER_STATUS.DELIVERED },
            _sum: { totalPrice: true },
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
        revenue: revenue._sum.totalPrice || 0,
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

app.get(
  '/api/admin/sub-admins',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { role: { name: ROLES.SUB_ADMIN } },
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

    if (!name || !phone || !isValidPassword(password)) {
      return errorResponse(
        res,
        'الاسم والهاتف وكلمة مرور من 8 أحرف مطلوبة',
        422
      );
    }

    if (permissions.length === 0) {
      return errorResponse(res, 'يجب اختيار صلاحية واحدة على الأقل', 422);
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
    const name = normalizeString(req.body.name);
    const phone = normalizePhone(req.body.phone);
    const email = normalizeString(req.body.email) || null;
    const password = req.body.password;
    const permissions = [...new Set(
      Array.isArray(req.body.permissions)
        ? req.body.permissions.map(normalizeString).filter(Boolean)
        : []
    )];

    if (!userId || !name || !phone || permissions.length === 0) {
      return errorResponse(res, 'بيانات المشرف والصلاحيات غير مكتملة', 422);
    }

    if (password && !isValidPassword(password)) {
      return errorResponse(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', 422);
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({
          where: { id: userId, role: { name: ROLES.SUB_ADMIN } },
          select: { id: true },
        });

        if (!existing) {
          throw new Error('SUB_ADMIN_NOT_FOUND');
        }

        const permissionRecords = await Promise.all(
          permissions.map((permission) => tx.permission.upsert({
            where: { name: permission },
            update: {},
            create: { name: permission },
          }))
        );

        await tx.subAdminPermission.deleteMany({
          where: { subAdminId: userId },
        });

        return tx.user.update({
          where: { id: userId },
          data: {
            name,
            phone,
            email,
            ...(password && { password: await bcrypt.hash(password, 12) }),
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

      return successResponse(res, serializeSubAdmin(user));
    } catch (error) {
      if (error.message === 'SUB_ADMIN_NOT_FOUND') {
        return errorResponse(res, 'المشرف الفرعي غير موجود', 404);
      }
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
      const result = await prisma.user.updateMany({
        where: { id: userId, role: { name: ROLES.SUB_ADMIN } },
        data: { isActive: false },
      });

      if (result.count === 0) {
        return errorResponse(res, 'المشرف الفرعي غير موجود', 404);
      }

      return successResponse(res, null, 200, {
        message: 'تم تعطيل المشرف الفرعي',
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
