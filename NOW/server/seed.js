require('dotenv').config();

const {
  PrismaClient,
} = require('@prisma/client');

const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ==========================================
  // ROLE
  // ==========================================

  let vendorRole = await prisma.role.findUnique({
    where: {
      name: 'VENDOR',
    },
  });

  if (!vendorRole) {
    vendorRole = await prisma.role.create({
      data: {
        name: 'VENDOR',
        description: 'Vendor account',
      },
    });
  }


  // ==========================================
  // VENDOR USER
  // ==========================================

  const hashedPassword =
    await bcrypt.hash(
      '123456',
      10
    );

  let vendor = await prisma.user.findUnique({
    where: {
      phone: '01000000000',
    },
  });

  if (!vendor) {
    vendor = await prisma.user.create({
      data: {
        phone: '01000000000',

        password: hashedPassword,

        name: 'مطعم ناو',

        email: 'vendor@now.com',

        roleId: vendorRole.id,

        isActive: true,
      },
    });
  }


  // ==========================================
  // STORE
  // ==========================================

  let store = await prisma.store.findFirst({
    where: {
      vendorId: vendor.id,
    },
  });

  if (!store) {
    store = await prisma.store.create({
      data: {
        vendorId: vendor.id,

        name: 'مطعم ناو',

        description:
          'أشهى الوجبات والمأكولات بالقرب منك',

        isOpen: true,

        latitude: 29.987,

        longitude: 31.123,

        image:
          'https://images.unsplash.com/photo-1513104890138-7c749659a591',
      },
    });
  }


  // ==========================================
  // MENU
  // ==========================================

  const menuCount =
    await prisma.menuItem.count({
      where: {
        storeId: store.id,
      },
    });

  if (menuCount === 0) {
    await prisma.menuItem.createMany({
      data: [
        {
          storeId: store.id,
          name: 'برجر كلاسيك',
          description:
            'برجر لحم مع جبنة وصوص خاص',
          price: 120,
          isAvailable: true,
          image:
            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
        },

        {
          storeId: store.id,
          name: 'بيتزا مارجريتا',
          description:
            'بيتزا طازجة بالجبنة والطماطم',
          price: 150,
          isAvailable: true,
          image:
            'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
        },

        {
          storeId: store.id,
          name: 'وجبة فراخ',
          description:
            'وجبة فراخ مع بطاطس ومشروب',
          price: 180,
          isAvailable: true,
          image:
            'https://images.unsplash.com/photo-1532550907401-a500c9a57435',
        },

        {
          storeId: store.id,
          name: 'بطاطس',
          description:
            'بطاطس مقرمشة',
          price: 60,
          isAvailable: true,
          image:
            'https://images.unsplash.com/photo-1573080496219-bb080dd4f877',
        },
      ],
    });
  }


  console.log('');
  console.log('=================================');
  console.log('✅ SEED COMPLETED');
  console.log('=================================');
  console.log(
    `👤 Vendor ID: ${vendor.id}`
  );
  console.log(
    `🏪 Store ID: ${store.id}`
  );
  console.log(
    `📱 Phone: 01000000000`
  );
  console.log(
    `🔑 Password: 123456`
  );
  console.log('=================================');
}


main()
  .catch((error) => {
    console.error('❌ SEED ERROR:', error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });