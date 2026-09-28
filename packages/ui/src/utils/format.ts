/** 7 -> "07". Dùng cho số thứ tự phím, đồng hồ, bộ đếm. */
export const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
