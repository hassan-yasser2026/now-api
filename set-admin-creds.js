const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const ADMIN_PHONE = '01111980616';
const ADMIN_PASSWORD = 'OsamaGad000@@';

async function main() {
  const roles = await prisma.$queryRawUnsafe(`SELECT id, name FROM roles ORDER BY id`);
  const adminRole = roles.find((role) => role.name === 'admin');
  const customerRole = roles.find((role) => role.name === 'customer');

  if (!adminRole || !customerRole) {
    throw new Error('Roles admin/customer not found');
  }

  const existingAdmin = await prisma.$queryRawUnsafe(`
    SELECT id, phone, email FROM users
    WHERE "roleId" IN (SELECT id FROM roles WHERE name IN ('admin', 'sub_admin'))
    ORDER BY id ASC
    LIMIT 1
  `);

  if (existingAdmin.length > 0) {
    const targetId = existingAdmin[0].id;
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await prisma.$queryRawUnsafe(`
      UPDATE users
      SET phone = '${ADMIN_PHONE}',
          password = '${hashed}',
          name = 'المدير العام',
          email = 'admin_${ADMIN_PHONE}@now.local',
          "isActive" = true,
          "roleId" = ${adminRole.id},
          "updatedAt" = NOW()
      WHERE id = ${targetId}
    `);

    await prisma.$queryRawUnsafe(`
      UPDATE users
      SET "isActive" = false
      WHERE id != ${targetId}
        AND "roleId" IN (SELECT id FROM roles WHERE name IN ('admin', 'sub_admin'))
    `);

    const row = await prisma.$queryRawUnsafe(
      `SELECT id, phone, name, email, "isActive", "roleId" FROM users WHERE id = ${targetId} LIMIT 1`
    );

    console.log(JSON.stringify({
      status: 'ok',
      phone: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
      role: 'admin',
      user: row[0],
    }, null, 2));
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.$queryRawUnsafe(`
    INSERT INTO users (phone, password, name, email, "isActive", "roleId", "createdAt", "updatedAt")
    VALUES ('${ADMIN_PHONE}', '${hashed}', 'المدير العام', 'admin_${ADMIN_PHONE}@now.local', true, ${adminRole.id}, NOW(), NOW())
  `);

  const row = await prisma.$queryRawUnsafe(
    `SELECT id, phone, name, email, "isActive", "roleId" FROM users WHERE phone = '${ADMIN_PHONE}' LIMIT 1`
  );

  console.log(JSON.stringify({
    status: 'ok',
    phone: ADMIN_PHONE,
    password: ADMIN_PASSWORD,
    role: 'admin',
    user: row[0],
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
