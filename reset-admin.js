const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const ADMIN_PHONE = '01012345678';
const ADMIN_PASSWORD = 'Admin123';

async function main() {
  const roles = await prisma.$queryRawUnsafe(`SELECT id, name FROM roles ORDER BY id`);
  const adminRole = roles.find((role) => role.name === 'admin');
  const customerRole = roles.find((role) => role.name === 'customer');

  if (!adminRole || !customerRole) {
    throw new Error('الأدوار admin/customer غير موجودة في قاعدة البيانات');
  }

  await prisma.$queryRawUnsafe(
    `UPDATE users SET "isActive" = false, "roleId" = ${customerRole.id} WHERE "roleId" IN (SELECT id FROM roles WHERE name IN ('admin', 'sub_admin'))`
  );

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM users WHERE phone = '${ADMIN_PHONE}' LIMIT 1`
  );

  if (existing.length > 0) {
    await prisma.$queryRawUnsafe(
      `UPDATE users SET name = 'المدير العام', email = 'admin@now.local', password = '${hashed}', "roleId" = ${adminRole.id}, "isActive" = true, "updatedAt" = NOW() WHERE phone = '${ADMIN_PHONE}'`
    );
  } else {
    await prisma.$queryRawUnsafe(
      `INSERT INTO users (phone, password, name, email, "isActive", "roleId", "createdAt", "updatedAt") VALUES ('${ADMIN_PHONE}', '${hashed}', 'المدير العام', 'admin@now.local', true, ${adminRole.id}, NOW(), NOW())`
    );
  }

  const result = await prisma.$queryRawUnsafe(
    `SELECT id, phone, name, email, "isActive", "roleId" FROM users WHERE phone = '${ADMIN_PHONE}' LIMIT 1`
  );

  console.log(JSON.stringify({
    status: 'ok',
    phone: ADMIN_PHONE,
    password: ADMIN_PASSWORD,
    role: 'admin',
    user: result[0],
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('ERROR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
