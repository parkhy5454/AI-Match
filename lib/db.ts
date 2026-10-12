import { PrismaClient } from '@prisma/client';
import { createQueryPerformanceMiddleware } from './performance/queryPerformance';

// Declare global prisma type for development
declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

// Add query performance monitoring middleware
// Only add in runtime environments, not during build time
if (prisma && typeof prisma.$use === 'function') {
  try {
    prisma.$use(createQueryPerformanceMiddleware());
  } catch (error) {
    console.warn('[Prisma] Failed to add query performance middleware:', error);
  }
}

export const db = prisma;
export { prisma };
export default prisma;
