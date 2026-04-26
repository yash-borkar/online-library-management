import type { Prisma } from "@prisma/client";

/**
 * MongoDB: new borrows may omit `returnedAt` until set; `equals null` alone can miss
 * those documents. This matches both explicit null and unset field.
 */
export const whereBorrowIsActive: Prisma.BorrowWhereInput = {
  OR: [{ returnedAt: null }, { returnedAt: { isSet: false } }],
};
