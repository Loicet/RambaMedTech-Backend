const { PrismaClient } = require("@prisma/client");

console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("DATABASE_URL prefix:", process.env.DATABASE_URL?.substring(0, 30));

const prisma = new PrismaClient({
  log: ['error'],
});

module.exports = prisma;
