/** Khóa theo ngày địa phương, ví dụ "2026-9-28". Dùng cho dữ liệu reset mỗi ngày. */
export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
