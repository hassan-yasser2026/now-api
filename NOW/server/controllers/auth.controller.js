const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const {
  hashPassword,
  comparePassword,
} = require('../utils/password');

const {
  generateToken,
} = require('../utils/jwt');

function validatePhone(phone) {
  return /^01[0125][0-9]{8}$/.test(phone);
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

async function register(req, res) {
  try {
    const {
      name,
      phone,
      password,
      email,
    } = req.body;

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
        message:
          'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم',
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

    const customerRole = await prisma.role.findUnique({
      where: {
        name: 'CUSTOMER',
      },
    });

    if (!customerRole) {
      return res.status(500).json({
        success: false,
        message: 'دور CUSTOMER غير موجود في قاعدة البيانات',
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        email: email || null,
        roleId: customerRole.id,
      },
      include: {
        role: true,
      },
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
        role: user.role.name,
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
    const {
      phone,
      password,
    } = req.body;

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
        role: user.role.name,
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
        role: user.role.name,
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

module.exports = {
  register,
  login,
  me,
};