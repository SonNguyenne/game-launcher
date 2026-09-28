import { useEffect } from 'react';

let locks = 0;

/**
 * Khóa cuộn của trang bên dưới khi một lớp phủ toàn màn (app, cài đặt) đang mở.
 * Không khóa thì thanh cuộn của bảng app vẫn hiện bên phải, cuộn cũng chỉ trượt bảng bị che.
 * Đếm số lớp đang mở để lớp nằm trên đóng trước không mở khóa sớm.
 */
export function useLockPageScroll() {
  useEffect(() => {
    const root = document.documentElement;
    if (locks++ === 0) root.style.overflow = 'hidden';
    return () => {
      if (--locks === 0) root.style.overflow = '';
    };
  }, []);
}
