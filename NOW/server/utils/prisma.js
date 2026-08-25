const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL غير موجود في ملف .env');
}

const prisma = new PrismaClient();

module.exports = prisma;
