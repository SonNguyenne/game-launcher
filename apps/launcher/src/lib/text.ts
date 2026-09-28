/** Bỏ dấu tiếng Việt và viết thường, để tìm "chi tieu" ra "chi tiêu". */
export const normalizeSearch = (s: string | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const matchesQuery = (query: string, ...fields: Array<string | undefined>) => {
  const q = normalizeSearch(query.trim());
  return !q || fields.some((f) => normalizeSearch(f).includes(q));
};
