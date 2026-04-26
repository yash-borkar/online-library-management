/**
 * MongoDB: new borrows may omit `returnedAt` until set; `equals null` alone can miss
 * those documents. This matches both explicit null and unset field.
 */
export const whereBorrowIsActive = {
    OR: [{ returnedAt: null }, { returnedAt: { isSet: false } }],
};
//# sourceMappingURL=borrow-queries.js.map