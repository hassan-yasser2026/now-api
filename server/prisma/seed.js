const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const roles = [
  { name: 'admin', description: 'مدير عام' },
  { name: 'customer', description: 'عميل' },
  { name: 'vendor', description: 'بائع' },
  { name: 'delivery', description: 'مندوب' },
  { name: 'sub_admin', description: 'مدير فرعي' },
];

const demoAccounts = [
  {
    role: 'admin',
    name: 'مدير تجريبي',
    phoneKey: 'DEMO_ADMIN_PHONE',
    passwordKey: 'DEMO_ADMIN_PASSWORD',
  },
  {
    role: 'customer',
    name: 'عميل تجريبي',
    phoneKey: 'DEMO_CUSTOMER_PHONE',
    passwordKey: 'DEMO_CUSTOMER_PASSWORD',
  },
  {
    role: 'vendor',
    name: 'بائع تجريبي',
    phoneKey: 'DEMO_VENDOR_PHONE',
    passwordKey: 'DEMO_VENDOR_PASSWORD',
  },
  {
    role: 'delivery',
    name: 'مندوب تجريبي',
    phoneKey: 'DEMO_DELIVERY_PHONE',
    passwordKey: 'DEMO_DELIVERY_PASSWORD',
  },
];

const demoMenuItems = [
  { name: 'وجبة تجريبية 1', description: 'منتج تجريبي للاختبار', price: 50 },
  { name: 'وجبة تجريبية 2', description: 'منتج تجريبي للاختبار', price: 75 },
  { name: 'مشروب تجريبي', description: 'منتج تجريبي للاختبار', price: 20 },
];

function loadDemoAccounts() {
  const accounts = demoAccounts.map((account) => {
    const phone = process.env[account.phoneKey]?.trim();
    const password = process.env[account.passwordKey];

    if (!phone || !/^01[0125]\d{8}$/.test(phone)) {
      throw new Error(`${account.phoneKey} must be a valid 11-digit Egyptian mobile number`);
    }

    if (!password || password.trim().length < 16) {
      throw new Error(`${account.passwordKey} must contain at least 16 characters`);
    }

    return { ...account, phone, password };
  });

  if (new Set(accounts.map(({ phone }) => phone)).size !== accounts.length) {
    throw new Error('Each demo account must use a different phone number');
  }

  if (new Set(accounts.map(({ password }) => password)).size !== accounts.length) {
    throw new Error('Each demo account must use a different password');
  }

  return accounts;
}

async function upsertDemoAccount(tx, account, roleId, passwordHash) {
  const existingUser = await tx.user.findUnique({
    where: { phone: account.phone },
    select: { id: true, name: true, roleId: true },
  });

  if (
    existingUser
    && (existingUser.name !== account.name || existingUser.roleId !== roleId)
  ) {
    throw new Error(
      `Phone number in ${account.phoneKey} is already used by a different account`,
    );
  }

  const user = existingUser || await tx.user.create({
    data: {
      name: account.name,
      phone: account.phone,
      password: passwordHash,
      roleId,
      isActive: true,
      phoneVerified: true,
      approvalStatus: 'APPROVED',
    },
    select: { id: true, name: true, roleId: true },
  });

  if (account.role === 'admin') {
    await tx.admin.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  if (account.role === 'delivery') {
    await tx.deliveryProfile.upsert({
      where: { userId: user.id },
      update: { status: 'OFFLINE' },
      create: { userId: user.id, status: 'OFFLINE' },
    });
  }

  return user;
}

async function upsertDemoStore(tx, vendorId) {
  const store = await tx.store.upsert({
    where: { vendorId },
    update: {
      name: 'متجر چودي ستار التجريبي',
      description: 'متجر تجريبي لاختبار تطبيق چودي ستار',
      isOpen: true,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
    create: {
      vendorId,
      name: 'متجر چودي ستار التجريبي',
      description: 'متجر تجريبي لاختبار تطبيق چودي ستار',
      isOpen: true,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
  });

  for (const [sortOrder, item] of demoMenuItems.entries()) {
    const data = {
      ...item,
      storeId: store.id,
      isAvailable: true,
      isDemo: true,
      sortOrder,
      approvalStatus: 'APPROVED',
    };
    const existingItem = await tx.menuItem.findFirst({
      where: { storeId: store.id, name: item.name },
      select: { id: true },
    });

    if (existingItem) {
      await tx.menuItem.update({
        where: { id: existingItem.id },
        data,
      });
    } else {
      await tx.menuItem.create({ data });
    }
  }
}

async function main() {
  const accounts = loadDemoAccounts();
  const passwordHashes = await Promise.all(
    accounts.map(({ password }) => bcrypt.hash(password, 12)),
  );

  await prisma.$transaction(async (tx) => {
    await tx.role.createMany({
      data: roles,
      skipDuplicates: true,
    });

    const roleRecords = await tx.role.findMany({
      where: { name: { in: roles.map(({ name }) => name) } },
      select: { id: true, name: true },
    });
    const roleIds = new Map(roleRecords.map(({ id, name }) => [name, id]));

    for (const [index, account] of accounts.entries()) {
      const roleId = roleIds.get(account.role);
      if (!roleId) {
        throw new Error(`Required role is missing: ${account.role}`);
      }

      const user = await upsertDemoAccount(
        tx,
        account,
        roleId,
        passwordHashes[index],
      );
      if (account.role === 'vendor') {
        await upsertDemoStore(tx, user.id);
      }

      console.log(`Seeded demo ${account.role} account.`);
    }
  });

  console.log('Demo roles, accounts, store, and products are ready.');
}

main()
  .catch((error) => {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
