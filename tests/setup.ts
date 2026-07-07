// Loads .env so modules that construct the Prisma client (via @/lib/db) can
// resolve DATABASE_URL. Unit tests never open a real connection.
import "dotenv/config";
