const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const {
  hashPassword,
  comparePassword,
} = require('../utils/password');

const {
  generateToken,
} = require('../utils/jwt');

const {
  isValidPhone,
  normalizePhone,
  phoneVariants,
} = require('../utils/phone');

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

async function register(req, res) {
  try {
    let {
      name,
      phone,
      password,
      email,
      profileImage,
      idImage,
      motorcycleImage,
      motorcycleCardImage,
      latitude,
      longitude,
      role: requestedRole = 'customer',
      storeName,
    } = req.body;

    name = typeof name === 'string' ? name.trim() : '';
    phone = normalizePhone(phone);
    email = typeof email === 'string' ? email.trim() : '';

    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الكامل مطلوب (حرفين على الأقل)',
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب',
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور مطلوبة',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants(phone) },
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'رقم الهاتف مسجل بالفعل',
      });
    }

    const roleName = String(requestedRole).trim().toLowerCase();
    const allowedRoles = new Set(['customer', 'vendor', 'delivery']);
    if (!allowedRoles.has(roleName)) {
      return res.status(400).json({
        success: false,
        message: 'نوع الحساب غير صحيح',
      });
    }

    if (roleName === 'vendor' && !storeName) {
      return res.status(400).json({
        success: false,
        message: 'اسم المتجر مطلوب للبائع',
      });
    }

    const accountRole = await prisma.role.findUnique({
      where: {
        name: roleName,
      },
    });

    if (!accountRole) {
      return res.status(500).json({
        success: false,
        message: `دور ${roleName} غير موجود في قاعدة البيانات`,
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name,
          phone,
          password: hashedPassword,
          email: email || null,
          profileImage: profileImage || null,
          idImage: idImage || null,
          motorcycleImage: motorcycleImage || null,
          motorcycleCardImage: motorcycleCardImage || null,
          latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
          longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
          roleId: accountRole.id,
          isActive: roleName === 'customer',
          approvalStatus: roleName === 'customer' ? 'APPROVED' : 'PENDING_ADMIN_REVIEW',
        },
        include: {
          role: true,
        },
      });

      if (roleName === 'delivery') {
        await transaction.deliveryProfile.create({
          data: {
            userId: createdUser.id,
            latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
            longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
            approvalStatus: 'PENDING_ADMIN_REVIEW',
          },
        });
      }

      if (roleName === 'vendor') {
        await transaction.store.create({
          data: {
            vendorId: createdUser.id,
            name: String(storeName || name).trim(),
            latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
            longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
          },
        });
      }

      return createdUser;
    });

    if (roleName !== 'customer') {
      return res.status(201).json({
        success: true,
        pendingApproval: true,
        message: 'تم استلام طلبك. حسابك في انتظار مراجعة الإدارة لمدة تصل إلى 48 ساعة.',
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          profileImage: user.profileImage,
          role: user.role.name.toLowerCase(),
          approvalStatus: 'PENDING_ADMIN_REVIEW',
        },
      });
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
        latitude: user.latitude,
        longitude: user.longitude,
        role: user.role.name.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحساب',
    });
  }
}

async function login(req, res) {
  try {
    let {
      phone,
      password,
      role: requestedRole,
    } = req.body;

    phone = normalizePhone(phone);

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف وكلمة المرور مطلوبان',
      });
    }

    const targetPhoneVariants = phoneVariants(phone);

    let user = await prisma.user.findFirst({
      where: {
        phone: { in: targetPhoneVariants },
        ...(requestedRole
          ? {
              role: {
                name: String(requestedRole).trim().toLowerCase(),
              },
            }
          : {}),
      },
      include: {
        role: true,
      },
    });

    if (!user && requestedRole) {
      user = await prisma.user.findFirst({
        where: {
          phone: { in: targetPhoneVariants },
        },
        include: {
          role: true,
        },
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'رقم الهاتف أو كلمة المرور غير صحيحة',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: user.approvalStatus === 'PENDING_ADMIN_REVIEW'
          ? 'حسابك في انتظار مراجعة الإدارة'
          : 'الحساب غير مفعل',
      });
    }

    const validPassword = await comparePassword(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'رقم الهاتف أو كلمة المرور غير صحيحة',
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
        latitude: user.latitude,
        longitude: user.longitude,
        role: user.role.name.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول',
    });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
        latitude: user.latitude,
        longitude: user.longitude,
        role: user.role.name.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('ME ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ',
    });
  }
}

async function updateProfile(req, res) {
  try {
    const {
      name,
      phone,
      email,
      profileImage,
      currentPassword,
      newPassword,
    } = req.body;
    const normalizedPhone = phone ? normalizePhone(phone) : undefined;

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح',
      });
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        OR: [
          normalizedPhone ? { phone: { in: phoneVariants(normalizedPhone) } } : undefined,
          email ? { email: String(email).trim() } : undefined,
        ].filter(Boolean),
        NOT: { id: req.user.id },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'رقم الهاتف أو البريد الإلكتروني مسجل بالفعل',
      });
    }

    const passwordChangeRequested = currentPassword !== undefined || newPassword !== undefined;
    if (passwordChangeRequested) {
      if (!currentPassword || !newPassword || !validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'أدخل كلمة المرور الحالية وكلمة مرور جديدة صحيحة (6 أحرف على الأقل)',
        });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
      });
      const validPassword = currentUser
        ? await comparePassword(currentPassword, currentUser.password)
        : false;

      if (!validPassword) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور الحالية غير صحيحة',
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
        ...(email !== undefined ? { email: String(email).trim() || null } : {}),
        ...(profileImage !== undefined ? { profileImage: profileImage || null } : {}),
        ...(passwordChangeRequested ? { password: await hashPassword(newPassword) } : {}),
      },
      include: { role: true },
    });

    return res.json({
      success: true,
      message: 'تم تحديث بيانات الحساب',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
        latitude: user.latitude,
        longitude: user.longitude,
        role: user.role.name.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الحساب',
    });
  }
}

async function deleteAccount(req, res) {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: 'حساب محذوف',
        phone: `deleted_${req.user.id}_${Date.now()}`,
        email: null,
        password: await hashPassword(`deleted_${Date.now()}`),
        isActive: false,
      },
    });

    return res.json({
      success: true,
      message: 'تم حذف الحساب بنجاح',
    });
  } catch (error) {
    console.error('DELETE ACCOUNT ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر حذف الحساب',
    });
  }
}

module.exports = {
  register,
  login,
  me,
  updateProfile,
  deleteAccount,
};
