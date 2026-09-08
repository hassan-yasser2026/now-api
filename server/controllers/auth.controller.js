const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const {
  hashPassword,
  comparePassword,
} = require('../utils/password');

const {
  generateToken,
} = require('../utils/jwt');

// دالة لتنظيف وتوحيد شكل رقم الهاتف المصري
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  // لو الرقم جاي بـ +20 أو 0020 نشيلها ونحط مكانها 0
  let cleaned = phone.trim();
  if (cleaned.startsWith('+20')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0020')) {
    cleaned = '0' + cleaned.slice(4);
  }
  return cleaned;
}

function validatePhone(phone) {
  return /^01[0125][0-9]{8}$/.test(phone);
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 6 &&
    /\d/.test(password)
  );
}

async function register(req, res) {
  try {
    let {
      name,
      phone,
      password,
      email,
      profileImage,
      latitude,
      longitude,
      role: requestedRole = 'customer',
      storeName,
    } = req.body;

    // تنظيف الرقم لتوحيد الصيغة (حتى لو اتبعت بـ رمز دولة)
    phone = cleanPhoneNumber(phone);

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'الاسم ورقم الهاتف وكلمة المرور مطلوبة',
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف المصري غير صحيح',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل وتحتوي على رقم',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'رقم الهاتف مسجل بالفعل',
      });
    }

    const roleName = String(requestedRole).trim().toUpperCase();
    const allowedRoles = new Set(['CUSTOMER', 'VENDOR', 'DELIVERY']);
    if (!allowedRoles.has(roleName)) {
      return res.status(400).json({
        success: false,
        message: 'نوع الحساب غير صحيح',
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
          latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
          longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
          roleId: accountRole.id,
        },
        include: {
          role: true,
        },
      });

      if (roleName === 'DELIVERY') {
        await transaction.deliveryProfile.create({
          data: {
            userId: createdUser.id,
            latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
            longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
            approvalStatus: 'PENDING_ADMIN_REVIEW',
          },
        });
      }

      if (roleName === 'VENDOR') {
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
    } = req.body;

    // تنظيف رقم الهاتف الوارد من التطبيق ليتم مطابقته مع الداتا بصيغة تبدأ بـ 01 مباشرة
    phone = cleanPhoneNumber(phone);

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف وكلمة المرور مطلوبان',
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        phone,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'رقم الهاتف أو كلمة المرور غير صحيحة',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مفعل',
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
    const cleanedPhone = phone ? cleanPhoneNumber(phone) : undefined;

    if (cleanedPhone && !validatePhone(cleanedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف المصري غير صحيح',
      });
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        OR: [
          cleanedPhone ? { phone: cleanedPhone } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean),
        NOT: { id: req.user.id },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: duplicate.phone === cleanedPhone
          ? 'رقم الهاتف مسجل بالفعل'
          : 'البريد الإلكتروني مسجل بالفعل',
      });
    }

    const passwordChangeRequested = currentPassword !== undefined || newPassword !== undefined;
    if (passwordChangeRequested) {
      if (!currentPassword || !newPassword || !validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'أدخل كلمة المرور الحالية وكلمة مرور جديدة صحيحة',
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
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(cleanedPhone !== undefined ? { phone: cleanedPhone } : {}),
        ...(email !== undefined ? { email: email.trim() || null } : {}),
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