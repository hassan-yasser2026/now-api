const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // 1. إنشاء الأدوار
  const roles = await prisma.role.createMany({
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

  // 2. إنشاء مستخدم Admin (مدير عام)
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { phone: '01000000099' },
    update: {},
    create: {
      name: 'المدير العام',
      phone: '01000000099',
      password: hashedPassword,
      email: 'admin@now.com',
      roleId: adminRole.id,
    },
  });

  console.log('✅ Admin created');

  // 3. إنشاء مستخدم Customer (للاختبار)
  const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } });
  await prisma.user.upsert({
    where: { phone: '01000000000' },
    update: {},
    create: {
      name: 'أحمد العميل',
      phone: '01000000000',
      password: await bcrypt.hash('123456', 10),
      email: 'customer@now.com',
      roleId: customerRole.id,
    },
  });

  console.log('✅ Customer created');

  // 4. إنشاء مستخدم Vendor (بائع)
  const vendorRole = await prisma.role.findUnique({ where: { name: 'vendor' } });
  const vendor = await prisma.user.upsert({
    where: { phone: '01000000001' },
    update: {},
    create: {
      name: 'مطعم البيت',
      phone: '01000000001',
      password: await bcrypt.hash('123456', 10),
      email: 'vendor@now.com',
      roleId: vendorRole.id,
    },
  });

  // إنشاء متجر لهذا البائع
  await prisma.store.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'مطعم البيت',
      vendorId: vendor.id,
      isOpen: true,
    },
  });

  console.log('✅ Vendor and Store created');

  // 5. إنشاء مستخدم Delivery (مندوب)
  const deliveryRole = await prisma.role.findUnique({ where: { name: 'delivery' } });
  await prisma.user.upsert({
    where: { phone: '01000000002' },
    update: {},
    create: {
      name: 'سعيد المندوب',
      phone: '01000000002',
      password: await bcrypt.hash('123456', 10),
      email: 'delivery@now.com',
      roleId: deliveryRole.id,
    },
  });

  console.log('✅ Delivery created');

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