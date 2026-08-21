const bcrypt = require('bcryptjs');

const prisma = require('../utils/prisma');
const { generateToken } = require('../utils/jwt');

async function registerUser({
  name,
  phone,
  password,
  role = 'CUSTOMER',
}) {
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    throw new Error('PHONE_ALREADY_EXISTS');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      password: hashedPassword,
      role,
    },
  });

  const token = generateToken({
    id: user.id,
    role: user.role,
    phone: user.phone,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
}

async function loginUser({
  phone,
  password,
}) {
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const validPassword = await bcrypt.compare(
    password,
    user.password
  );

  if (!validPassword) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const token = generateToken({
    id: user.id,
    role: user.role,
    phone: user.phone,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
}

module.exports = {
  registerUser,
  loginUser,
};