const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const seedUsers = [
  {
    name: 'المدير العام',
    phone: '01000000099',
    email: 'admin@now.com',
    password: '123456',
    role: 'admin',
  },
  {
    name: 'أحمد العميل',
    phone: '01000000000',
    email: 'customer@now.com',
    password: '123456',
    role: 'customer',
  },
  {
    name: 'مطعم البيت',
    phone: '01000000001',
    email: 'vendor@now.com',
    password: '123456',
    role: 'vendor',
    storeName: 'مطعم البيت',
  },
  {
    name: 'سعيد المندوب',
    phone: '01000000002',
    email: 'delivery@now.com',
    password: '123456',
    role: 'delivery',
  },
  {
    name: 'مدير فرعي',
    phone: '01000000003',
    email: 'subadmin@now.com',
    password: '123456',
    role: 'sub_admin',
  },
];

async function main() {
  await prisma.role.createMany({
    data: [
      { name: 'admin', description: 'مدير عام' },
      { name: 'customer', description: 'عميل' },
      { name: 'vendor', description: 'بائع' },
      { name: 'delivery', description: 'مندوب' },
      { name: 'sub_admin', description: 'مدير فرعي' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Roles created');

  for (const userData of seedUsers) {
    const role = await prisma.role.findUnique({ where: { name: userData.role } });

    if (!role) {
      throw new Error(`Role not found: ${userData.role}`);
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const createdUser = await prisma.user.upsert({
      where: { phone: userData.phone },
      update: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        roleId: role.id,
        isActive: true,
      },
      create: {
        name: userData.name,
        phone: userData.phone,
        email: userData.email,
        password: hashedPassword,
        roleId: role.id,
      },
    });

    if (userData.role === 'vendor' && userData.storeName) {
      await prisma.store.upsert({
        where: { vendorId: createdUser.id },
        update: {
          name: userData.storeName,
          isOpen: true,
          isActive: true,
        },
        create: {
          name: userData.storeName,
          vendorId: createdUser.id,
          isOpen: true,
          isActive: true,
        },
      });
    }

    console.log(`✅ Seeded ${userData.role}: ${userData.phone} / ${userData.password}`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });