import { appConfig } from '@/config/app';

/** Băm mã PIN; chỉ lưu kết quả băm, không lưu mã gốc. */
export async function hashPin(pin: string): Promise<string> {
  const input = appConfig.pinSalt + pin;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Môi trường không có crypto.subtle (http thường): dùng băm đơn giản.
    let h = 0;
    for (const ch of input) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return `x${h}`;
  }
}
