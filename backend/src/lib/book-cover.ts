/** Open Library cover API (HTTPS). Falls back can be handled in UI on error. */
export function openLibraryCoverUrl(isbn: string): string {
  const clean = isbn.replace(/[^0-9X]/gi, "");
  return `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`;
}
