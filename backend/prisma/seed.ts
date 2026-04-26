import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_BOOKS } from "./books-seed-data";

const prisma = new PrismaClient();

function coverUrl(isbn: string): string {
  const clean = isbn.replace(/[^0-9X]/gi, "");
  return `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`;
}

async function main() {
  const passwordHash = await bcrypt.hash("Demo12345!", 12);

  await prisma.user.upsert({
    where: { email: "admin@library.local" },
    update: {},
    create: {
      email: "admin@library.local",
      name: "Alex Admin",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "librarian@library.local" },
    update: {},
    create: {
      email: "librarian@library.local",
      name: "Lee Librarian",
      passwordHash,
      role: Role.LIBRARIAN,
    },
  });

  await prisma.user.upsert({
    where: { email: "member@library.local" },
    update: {},
    create: {
      email: "member@library.local",
      name: "Morgan Member",
      passwordHash,
      role: Role.MEMBER,
      mfaEnabled: false,
    },
  });

  const bookCount = await prisma.book.count();
  if (bookCount < 60) {
    await prisma.borrow.deleteMany({});
    await prisma.book.deleteMany({});
    await prisma.book.createMany({
      data: SEED_BOOKS.map((b) => ({
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        category: b.category,
        coverImageUrl: coverUrl(b.isbn),
        copiesTotal: b.copiesTotal,
        copiesAvailable: b.copiesTotal,
      })),
    });
    console.log(`Seeded ${SEED_BOOKS.length} books with categories and cover URLs.`);
  }

  console.log("Seed OK. Demo password for seeded staff: Demo12345!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
