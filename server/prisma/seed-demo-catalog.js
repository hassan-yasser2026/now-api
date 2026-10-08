const { randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const demoVendorPhone = 'demo-catalog-vendor@now.invalid';
const imageUrls = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1543255006-d6395b6f1171?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80',
];

const demoCategories = [
  {
    name: 'وجبات البرجر',
    price: 95,
    items: [
      'برجر كلاسيك', 'برجر جبنة', 'برجر دبل', 'برجر مشروم',
      'برجر باربيكيو', 'برجر دجاج مقرمش', 'برجر سبايسي',
      'برجر تركي', 'برجر نباتي', 'وجبة برجر عائلية',
    ],
  },
  {
    name: 'البيتزا',
    price: 110,
    items: [
      'بيتزا مارجريتا', 'بيتزا خضار', 'بيتزا بيبروني', 'بيتزا دجاج رانش',
      'بيتزا أربعة أجبان', 'بيتزا مشروم', 'بيتزا باربيكيو',
      'بيتزا سجق', 'بيتزا تونة', 'بيتزا مكس لحوم',
    ],
  },
  {
    name: 'السندوتشات',
    price: 65,
    items: [
      'ساندوتش شاورما فراخ', 'ساندوتش شاورما لحم', 'ساندوتش كفتة',
      'ساندوتش شيش طاووق', 'ساندوتش سجق شرقي', 'ساندوتش فراخ مشوية',
      'ساندوتش جبنة حلومي', 'ساندوتش تونة', 'ساندوتش فاهيتا',
      'ساندوتش بطاطس',
    ],
  },
  {
    name: 'الأطباق الرئيسية',
    price: 145,
    items: [
      'طبق فراخ مشوية', 'طبق شيش طاووق', 'طبق كفتة مشوية',
      'طبق كباب مشوي', 'طبق فراخ كرسبي', 'طبق مكرونة ألفريدو',
      'طبق مكرونة بولونيز', 'طبق أرز بالخضار', 'طبق فتة دجاج',
      'طبق مشاوي مشكل',
    ],
  },
  {
    name: 'السلطات والمقبلات',
    price: 35,
    items: [
      'سلطة خضراء', 'سلطة سيزر', 'سلطة كول سلو', 'سلطة يونانية',
      'بطاطس مقلية', 'بطاطس ودجز', 'حلقات بصل', 'أصابع موزاريلا',
      'خبز بالثوم', 'مقبلات مشكلة',
    ],
  },
  {
    name: 'الحلويات',
    price: 55,
    items: [
      'تشيز كيك', 'براونيز بالشوكولاتة', 'مولتن كيك', 'تيراميسو',
      'كيكة الجزر', 'دونات بالشوكولاتة', 'وافل بالفواكه',
      'كريب نوتيلا', 'آيس كريم فانيليا', 'سلطة فواكه',
    ],
  },
  {
    name: 'المشروبات الباردة',
    price: 25,
    items: [
      'مياه معدنية', 'كولا', 'ليمون بالنعناع', 'عصير برتقال طازج',
      'عصير مانجو', 'عصير فراولة', 'آيس تي خوخ', 'موهيتو أزرق',
      'سموذي توت', 'ميلك شيك شوكولاتة',
    ],
  },
  {
    name: 'المشروبات الساخنة',
    price: 30,
    items: [
      'قهوة تركي', 'إسبريسو', 'كابتشينو', 'لاتيه', 'موكا',
      'شاي أحمر', 'شاي أخضر', 'هوت شوكولاتة', 'قرفة بالحليب',
      'قهوة أمريكية',
    ],
  },
  {
    name: 'وجبات الإفطار',
    price: 70,
    items: [
      'فطار شرقي', 'فطار أومليت', 'ساندوتش بيض وجبنة',
      'بان كيك بالعسل', 'فرنش توست', 'كرواسون بالجبنة',
      'كرواسون بالشوكولاتة', 'توست أفوكادو', 'فول بالطحينة',
      'بطاطس وبيض',
    ],
  },
  {
    name: 'الوجبات العائلية',
    price: 260,
    items: [
      'وجبة برجر لشخصين', 'وجبة بيتزا عائلية', 'وجبة فراخ عائلية',
      'وجبة مشاوي لشخصين', 'وجبة سندوتشات مشكلة', 'وجبة أطباق شرقية',
      'وجبة كرسبي عائلية', 'وجبة بيتزا وبرجر', 'وجبة إفطار عائلية',
      'بوكس مطعم چودي ستار',
    ],
  },
];

const demoMenuItems = demoCategories.flatMap((category, categoryIndex) =>
  category.items.map((name, itemIndex) => ({
    name,
    nameAr: name,
    description: 'صورة وسعر تجريبيان للعرض والاختبار فقط.',
    price: category.price + itemIndex * 5,
    image: imageUrls[categoryIndex],
    categoryName: category.name,
    sortOrder: categoryIndex * 10 + itemIndex,
  })),
);

async function getDemoVendor(tx, vendorRoleId) {
  const demoVendorName = 'بائع متجر چودي ستار التجريبي';
  const legacyDemoVendorName = 'بائع متجر NOW التجريبي';
  const existingVendor = await tx.user.findUnique({
    where: { phone: demoVendorPhone },
    select: { id: true, name: true, roleId: true },
  });

  if (
    existingVendor
    && (![demoVendorName, legacyDemoVendorName].includes(existingVendor.name)
      || existingVendor.roleId !== vendorRoleId)
  ) {
    throw new Error('The reserved demo vendor identity is already in use.');
  }

  if (existingVendor) {
    if (existingVendor.name === legacyDemoVendorName) {
      return tx.user.update({
        where: { id: existingVendor.id },
        data: { name: demoVendorName },
        select: { id: true, name: true, roleId: true },
      });
    }
    return existingVendor;
  }

  const password = randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(password, 12);

  return tx.user.create({
    data: {
      name: demoVendorName,
      phone: demoVendorPhone,
      password: passwordHash,
      roleId: vendorRoleId,
      isActive: true,
      phoneVerified: true,
      approvalStatus: 'APPROVED',
    },
    select: { id: true, name: true, roleId: true },
  });
}

async function main() {
  if (demoMenuItems.length !== 100) {
    throw new Error(`Expected 100 demo products, got ${demoMenuItems.length}.`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const vendorRole = await tx.role.upsert({
      where: { name: 'vendor' },
      update: {},
      create: { name: 'vendor', description: 'بائع' },
      select: { id: true },
    });
    const vendor = await getDemoVendor(tx, vendorRole.id);
    const store = await tx.store.upsert({
      where: { vendorId: vendor.id },
      update: {
        name: 'متجر چودي ستار التجريبي',
        description: 'متجر تجريبي؛ المنتجات والأسعار والصور للعرض فقط.',
        isOpen: true,
        isActive: true,
        approvalStatus: 'APPROVED',
      },
      create: {
        vendorId: vendor.id,
        name: 'متجر چودي ستار التجريبي',
        description: 'متجر تجريبي؛ المنتجات والأسعار والصور للعرض فقط.',
        isOpen: true,
        isActive: true,
        approvalStatus: 'APPROVED',
      },
      select: { id: true },
    });

    await tx.menuItemCategory.createMany({
      data: demoCategories.map((category, sortOrder) => ({
        storeId: store.id,
        name: category.name,
        nameAr: category.name,
        sortOrder,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    const categories = await tx.menuItemCategory.findMany({
      where: { storeId: store.id, name: { in: demoCategories.map(({ name }) => name) } },
      select: { id: true, name: true },
    });
    const categoryIds = new Map(categories.map(({ id, name }) => [name, id]));

    const existingItems = await tx.menuItem.findMany({
      where: {
        storeId: store.id,
        name: { in: demoMenuItems.map(({ name }) => name) },
      },
      select: { name: true, isDemo: true },
    });

    if (existingItems.some(({ isDemo }) => !isDemo)) {
      throw new Error('A real product conflicts with a demo product name; no products were changed.');
    }

    const existingNames = new Set(existingItems.map(({ name }) => name));
    const productsToCreate = demoMenuItems
      .filter(({ name }) => !existingNames.has(name))
      .map(({ categoryName, ...item }) => ({
        ...item,
        storeId: store.id,
        categoryId: categoryIds.get(categoryName),
        isAvailable: true,
        isDemo: true,
        approvalStatus: 'APPROVED',
      }));

    await tx.menuItem.createMany({ data: productsToCreate });

    const productCount = await tx.menuItem.count({
      where: { storeId: store.id, isDemo: true },
    });

    if (productCount !== 100) {
      throw new Error(`Expected 100 demo products in the store, found ${productCount}.`);
    }

    return { productCount };
  });

  console.log(`Demo catalog is ready with ${result.productCount} products.`);
}

main()
  .catch((error) => {
    console.error('Demo catalog seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
