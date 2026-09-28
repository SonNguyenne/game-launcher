/** Thêm https:// nếu người dùng quên gõ. */
export const withProtocol = (raw: string) => {
  const v = raw.trim();
  return v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
};

export const isHttpUrl = (raw: string) => {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};
