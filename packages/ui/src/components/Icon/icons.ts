/** Icon nét vuông, 24×24. Thêm icon mới: thêm một khóa với nội dung SVG. */
export const icons = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  more: '<path d="M4 12h.01M12 12h.01M20 12h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M18 15l-6-6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  eye: '<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.2M6.6 6.6A16.7 16.7 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><rect x="14" y="5" width="4" height="4"/><rect x="8" y="15" width="4" height="4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
  soundOff: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  shuffle: '<path d="M3 7h3.5c2 0 3.3 1 4.5 3l2 4c1.2 2 2.5 3 4.5 3H21"/><path d="M3 17h3.5c1.4 0 2.4-.5 3.3-1.4M14.2 8.4c.9-.9 1.9-1.4 3.3-1.4H21"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
} as const;

export type IconName = keyof typeof icons;
