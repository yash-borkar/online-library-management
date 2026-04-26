export const Role = {
  ADMIN: "ADMIN",
  LIBRARIAN: "LIBRARIAN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
