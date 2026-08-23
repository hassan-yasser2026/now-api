require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const prisma = new PrismaClient();

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

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

const allowedOrigins = (() => {
  const corsOrigin = process.env.CORS_ORIGIN || '*';

  if (corsOrigin === '*') {
    return '*';
  }

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

// ============================================================
// Constants
// ============================================================

const ROLES = {
  ADMIN: 'admin',
  VENDOR: 'vendor',
  DELIVERY: 'delivery',
  CUSTOMER: 'customer',
};

const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

const ACTIVE_DELIVERY_STATUSES = [
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.OUT_FOR_DELIVERY,
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

const normalizePhone = (phone) => {
  if (typeof phone !== 'string') {
    return '';
  }

  return phone.trim();
};

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
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

    PickedUp: ORDER_STATUS.PICKED_UP,
    pickedUp: ORDER_STATUS.PICKED_UP,
    picked_up: ORDER_STATUS.PICKED_UP,

    OutForDelivery: ORDER_STATUS.OUT_FOR_DELIVERY,
    outForDelivery: ORDER_STATUS.OUT_FOR_DELIVERY,
    out_for_delivery: ORDER_STATUS.OUT_FOR_DELIVERY,

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
    PICKED_UP: ORDER_STATUS.PICKED_UP,
    OUT_FOR_DELIVERY: ORDER_STATUS.OUT_FOR_DELIVERY,
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

const authMiddleware = (req, res, next) => {
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
// API Info
// ============================================================

app.get('/api', (req, res) => {
  return successResponse(
    res,
    {
      name: 'NOW',
      version: '1.0.0',
      description: 'NOW Delivery API',
      environment: NODE_ENV,
      status: 'online',
    }
  );
});

// ============================================================
// AUTH
// ============================================================

// ------------------------------------------------------------
// Login
// ------------------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
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
        phone,
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

app.post('/api/auth/register', async (req, res) => {
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
    const existingUser = await prisma.user.findUnique({
      where: {
        phone,
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
        },
        store: result.store,
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
      const store = await prisma.store.findUnique({
        where: {
          id: storeId,
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
// Update Store (البائع صاحب المتجر أو الأدمن)
// ------------------------------------------------------------

app.patch(
  '/api/stores/:id',
  authMiddleware,
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
      const store = await prisma.store.findUnique({
        where: {
          id: storeId,
        },
        select: {
          vendorId: true,
        },
      });

      if (!store) {
        return errorResponse(
          res,
          'المتجر غير موجود',
          404
        );
      }

      const isOwner =
        store.vendorId === req.user.userId;

      const isAdmin =
        req.user.role === ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        return errorResponse(
          res,
          'غير مصرح لك بتعديل هذا المتجر',
          403
        );
      }

      const {
        name,
        description,
        isOpen,
        latitude,
        longitude,
        image,
      } = req.body;

      const data = {};

      if (name !== undefined) {
        const normalizedName =
          normalizeString(name);

        if (!normalizedName) {
          return errorResponse(
            res,
            'اسم المتجر غير صالح',
            422
          );
        }

        data.name = normalizedName;
      }

      if (description !== undefined) {
        data.description = description;
      }

      if (isOpen !== undefined) {
        data.isOpen = Boolean(isOpen);
      }

      if (image !== undefined) {
        data.image = image;
      }

      if (
        latitude !== undefined ||
        longitude !== undefined
      ) {
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          return errorResponse(
            res,
            'إحداثيات الموقع غير صالحة',
            422
          );
        }

        data.latitude = lat;
        data.longitude = lng;
      }

      const updatedStore = await prisma.store.update({
        where: {
          id: storeId,
        },
        data,
      });

      return successResponse(
        res,
        updatedStore
      );
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

app.put(
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
      // DELIVERY ACCEPTING PENDING ORDER
      // Atomic claim
      // ======================================================

      if (
        userRole ===
          ROLES.DELIVERY &&
        requestedStatus !==
          ORDER_STATUS.DELIVERED &&
        order.status ===
          ORDER_STATUS.PENDING
      ) {
        const deliveryId =
          requestedDeliveryId ||
          req.user.userId;

        if (
          deliveryId !==
          req.user.userId
        ) {
          return errorResponse(
            res,
            'لا يمكنك إسناد الطلب لمندوب آخر',
            403
          );
        }

        const claimed =
          await prisma.order.updateMany({
            where: {
              id: orderId,

              status:
                ORDER_STATUS.PENDING,

              deliveryId: null,
            },

            data: {
              deliveryId,
              status:
                requestedStatus ===
                ORDER_STATUS.PENDING
                  ? ORDER_STATUS.ACCEPTED
                  : requestedStatus,
            },
          });

        if (
          claimed.count === 0
        ) {
          return errorResponse(
            res,
            'الطلب تم أخذه بالفعل بواسطة مندوب آخر أو لم يعد متاحًا',
            409
          );
        }

        const updatedOrder =
          await prisma.order.findUnique({
            where: {
              id: orderId,
            },

            include:
              orderInclude,
          });

        return successResponse(
          res,
          updatedOrder
        );
      }

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
          ORDER_STATUS.PICKED_UP,
          ORDER_STATUS.CANCELLED,
        ],

        [ORDER_STATUS.ACCEPTED]: [
          ORDER_STATUS.PICKED_UP,
          ORDER_STATUS.OUT_FOR_DELIVERY,
          ORDER_STATUS.ON_THE_WAY,
          ORDER_STATUS.DELIVERED,
          ORDER_STATUS.CANCELLED,
        ],

        [ORDER_STATUS.PICKED_UP]: [
          ORDER_STATUS.OUT_FOR_DELIVERY,
          ORDER_STATUS.ON_THE_WAY,
          ORDER_STATUS.DELIVERED,
        ],

        [ORDER_STATUS.OUT_FOR_DELIVERY]: [
          ORDER_STATUS.ON_THE_WAY,
          ORDER_STATUS.DELIVERED,
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

      if (
        !isAdmin &&
        !allowed.includes(
          requestedStatus
        )
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
// ADMIN USERS
// ============================================================

app.get(
  '/api/admin/users',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  async (req, res) => {
    try {
      const users =
        await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,

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

// ============================================================
// ADMIN STORES
// ============================================================

app.get(
  '/api/admin/stores',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
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

            menuItems: true,
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

// ============================================================
// 404
// ============================================================

app.use(
  (req, res) => {
    return errorResponse(
      res,
      'المسار غير موجود',
      404
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