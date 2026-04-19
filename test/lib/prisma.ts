import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL ?? '';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export default prisma;
