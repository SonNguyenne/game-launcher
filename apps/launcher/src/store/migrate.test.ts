import { describe, expect, it } from 'vitest';
import { normalizeState } from './migrate';

describe('normalizeState', () => {
  it('bỏ link không phải http(s), ví dụ javascript: trong file nhập', () => {
    const s = normalizeState({
      links: [
        { id: 'link-1', url: 'https://example.com', name: 'ok' },
        { id: 'link-2', url: 'javascript:alert(1)', name: 'xấu' },
        { id: 'link-3', url: 'data:text/html,<script>1</script>' },
      ],
    });
    expect(s.links.map((l) => l.id)).toEqual(['link-1']);
  });

  it('đọc được "cols" của bản HTML cũ và bỏ trường lạ', () => {
    const s = normalizeState({ links: [], settings: { cols: 3, pinHash: 'abc', theme: 'dark' } });
    expect(s.settings.columns).toBe(3);
    expect(s.settings.theme).toBe('dark');
    expect(s.settings).not.toHaveProperty('pinHash');
  });

  it('không ném lỗi với dữ liệu rác', () => {
    expect(() => normalizeState('rác')).not.toThrow();
    expect(normalizeState(null).links).toEqual([]);
  });
});
