/** Ghép className, bỏ qua giá trị rỗng. */
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
