import { describe, expect, it } from 'vitest';
import type { Player, ReduceContext } from '@bang/party';
import { buildDungeon, CELLS, DECKS, hashSeed, type Card } from './cards';
import { BOSS_GOLD, START_TORCH, bossPower, cellId, dungeonGame, expedOf, fresh, scoreOf, type DungeonState, type Mode } from './game';

const players: Player[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase() }));
const two = players.slice(0, 2);
const NOW = new Date(2026, 9, 30, 12).getTime();
const ctx = (from: string, host = false, list = two): ReduceContext => ({ from, players: list, host, now: NOW });
const gold = (v = 1): Card => ({ t: 'gold', v });

/** Hầm toàn vàng 1, rồi đặt vài lá thử ở tầng 1. */
function rigged(mode: Mode = 'race', cells: Record<number, Card> = {}, list = two): DungeonState {
  const s0 = fresh(list, mode, 'daily', NOW);
  // Đuốc dư để khỏi vấp ngã, trừ test về đuốc.
  const s = { ...s0, expeds: s0.expeds.map((e) => ({ ...e, torch: 99 })) };
  const floors = s.floors.map(() => Array.from({ length: CELLS }, () => gold()));
  for (const [i, c] of Object.entries(cells)) floors[0][Number(i)] = c;
  return { ...s, floors, boss: 8 };
}
const go = (s: DungeonState, from: string, col: number) => dungeonGame.reduce(s, { type: 'step', col }, ctx(from));

describe('bộ bài và hạt giống', () => {
  it('mỗi tầng 24 lá, không có chất bài tây', () => {
    for (const d of DECKS) expect(d).toHaveLength(24);
  });

  it('thử thách hôm nay: cùng ngày thì cùng hầm, khác ngày thì khác', () => {
    const a = fresh(two, 'race', 'daily', NOW);
    const b = fresh(players, 'coop', 'daily', NOW + 3600_000);
    expect(a.day).toBe('2026-10-30');
    expect(a.floors).toEqual(b.floors);
    expect(a.boss).toBe(b.boss);
    const c = fresh(two, 'race', 'daily', NOW + 86400_000);
    expect(c.floors).not.toEqual(a.floors);
    expect(buildDungeon(hashSeed('x'))).toEqual(buildDungeon(hashSeed('x')));
  });

  it('hầm ngẫu nhiên không gắn ngày; mỗi đoàn bắt đầu với đầy đuốc và thấy hàng đầu', () => {
    const s = fresh(two, 'race', 'random', NOW);
    expect(s.day).toBeNull();
    expect(expedOf(s, 0).torch).toBe(START_TORCH);
    expect(expedOf(s, 0).seen).toEqual([0, 1, 2]);
  });
});

describe('đi trong hầm', () => {
  it('đứng ở cửa tầng chọn được cả 3 ô; sau đó chỉ đi chéo trái, thẳng, chéo phải', () => {
    let s = rigged();
    expect(go(s, 'a', 3)).toBe(s);
    s = go(s, 'a', 0);
    expect(expedOf(s, 0)).toMatchObject({ row: 0, col: 0, torch: 98, gold: 1 });
    // Lượt b (đua điểm: đoàn riêng).
    expect(go(s, 'a', 0)).toBe(s);
    s = go(s, 'b', 2);
    expect(expedOf(s, 1)).toMatchObject({ row: 0, col: 2 });
    expect(go(s, 'a', 2)).toBe(s);
    s = go(s, 'a', 1);
    expect(expedOf(s, 0)).toMatchObject({ row: 1, col: 1 });
  });

  it('người xem và người không tới lượt không đi được', () => {
    const s = rigged();
    expect(dungeonGame.reduce(s, { type: 'step', col: 1 }, ctx('c', false, players))).toBe(s);
    expect(go(s, 'b', 1)).toBe(s);
  });

  it('đuốc soi hàng kế; hết đuốc thì không thấy và vấp ngã mất máu', () => {
    let s = rigged();
    s = { ...s, expeds: s.expeds.map((e) => ({ ...e, torch: 1 })) };
    s = go(s, 'a', 1);
    expect(expedOf(s, 0).torch).toBe(0);
    expect(expedOf(s, 0).seen).not.toContain(cellId(0, 1, 1));
    s = go(s, 'b', 1);
    s = go(s, 'a', 1);
    expect(s.heroes[0].hp).toBe(9);
    expect(s.log.some((l) => l.kind === 'stumble')).toBe(true);
  });

  it('đánh quái: mất máu bằng sức quái trừ vũ khí, khiên đỡ 3, thắng thì nhận vàng', () => {
    let s = rigged('race', { 1: { t: 'monster', v: 4 } });
    s = go(s, 'a', 1);
    expect(s.heroes[0].hp).toBe(10 - 3);
    expect(expedOf(s, 0).gold).toBe(4);
    let t = rigged('race', { 1: { t: 'monster', v: 6 } });
    t = { ...t, heroes: t.heroes.map((h, i) => (i === 0 ? { ...h, shield: 1 } : h)) };
    t = go(t, 'a', 1);
    expect(t.heroes[0]).toMatchObject({ hp: 10 - 2, shield: 0 });
  });

  it('nhặt kiếm chỉ đổi khi tốt hơn; thuốc không vượt máu tối đa', () => {
    let s = rigged('race', { 0: { t: 'blade', v: 3 } });
    s = go(s, 'a', 0);
    expect(s.heroes[0].weapon).toBe(3);
    let p = rigged('race', { 0: { t: 'potion', v: 3 } });
    p = { ...p, heroes: p.heroes.map((h, i) => (i === 0 ? { ...h, hp: 9 } : h)) };
    p = go(p, 'a', 0);
    expect(p.heroes[0].hp).toBe(10);
  });

  it('rương: có chìa thì mở luôn; không chìa thì chọn phá (mất máu) hoặc bỏ, phải chọn xong mới hết lượt', () => {
    let s = rigged('race', { 0: { t: 'chest', v: 6 } });
    s = go(s, 'a', 0);
    expect(expedOf(s, 0).pending).toEqual({ kind: 'chest', v: 6 });
    expect(s.turn).toBe(0);
    expect(go(s, 'a', 0)).toBe(s);
    expect(dungeonGame.reduce(s, { type: 'choose', option: 'heal' }, ctx('a'))).toBe(s);
    const opened = dungeonGame.reduce(s, { type: 'choose', option: 'open' }, ctx('a'));
    expect(opened.heroes[0].hp).toBe(8);
    expect(expedOf(opened, 0).gold).toBe(6);
    expect(opened.turn).toBe(1);
    const k = rigged('race', { 0: { t: 'chest', v: 6 } });
    const withKey = go({ ...k, heroes: k.heroes.map((h, i) => (i === 0 ? { ...h, keys: 1 } : h)) }, 'a', 0);
    expect(withKey.heroes[0].keys).toBe(0);
    expect(expedOf(withKey, 0).gold).toBe(6);
  });

  it('sập hầm: rơi thẳng xuống tầng dưới', () => {
    let s = rigged('race', { 0: { t: 'pit', v: 0 } });
    s = go(s, 'a', 0);
    expect(expedOf(s, 0)).toMatchObject({ floor: 1, row: -1 });
    expect(s.heroes[0].hp).toBe(8);
  });

  it('gục thì ra khỏi lượt, điểm đua bị chia đôi', () => {
    let s = rigged('race', { 0: { t: 'monster', v: 8 } });
    s = { ...s, heroes: s.heroes.map((h, i) => (i === 0 ? { ...h, hp: 2 } : h)), expeds: s.expeds.map((e, i) => (i === 0 ? { ...e, gold: 9 } : e)) };
    s = go(s, 'a', 0);
    expect(s.heroes[0].status).toBe('dead');
    expect(scoreOf(s, 0)).toBe(4);
    s = go(s, 'b', 0);
    expect(s.turn).toBe(1);
  });
});

describe('cửa ra và kết thúc', () => {
  /** Đi thẳng hết 3 tầng, thay phiên 2 người. */
  function runAll(s: DungeonState) {
    let guard = 0;
    while (!s.done && guard++ < 200) {
      const seat = s.turn;
      s = go(s, s.heroes[seat].id, expedOf(s, seat).row < 0 ? 1 : expedOf(s, seat).col);
    }
    return s;
  }

  it('đua điểm: hết tầng 3 đánh trùm, thoát được thì +10 vàng, ai nhiều vàng nhất thắng', () => {
    let s = rigged();
    s = { ...s, heroes: s.heroes.map((h, i) => (i === 0 ? { ...h, weapon: 8 } : { ...h, weapon: 5 })) };
    s = runAll(s);
    expect(s.done).toBe(true);
    expect(s.heroes.map((h) => h.status)).toEqual(['out', 'out']);
    expect(scoreOf(s, 0)).toBe(18 + BOSS_GOLD);
    expect(s.heroes[1].hp).toBe(10 - 3);
    expect(s.wins).toEqual({ a: 1, b: 1 });
  });

  it('hợp tác: cả đội chung một đoàn, thay nhau dẫn đường, trùm mạnh theo số người và cả đội cùng đánh', () => {
    let s = rigged('coop');
    expect(s.expeds).toHaveLength(1);
    expect(bossPower(s)).toBe(8 + 3);
    s = go(s, 'a', 1);
    expect(s.turn).toBe(1);
    s = go(s, 'b', 2);
    expect(expedOf(s, 0)).toMatchObject({ row: 1, col: 2, gold: 2 });
    s = runAll(s);
    expect(s.done).toBe(true);
    expect(s.heroes.every((h) => h.status === 'out')).toBe(true);
    expect(s.wins).toEqual({ a: 1, b: 1 });
  });

  it('hợp tác: thuốc chảy về người yếu nhất', () => {
    let s = rigged('coop', { 0: { t: 'potion', v: 3 } });
    s = { ...s, heroes: s.heroes.map((h, i) => (i === 1 ? { ...h, hp: 4 } : h)) };
    s = go(s, 'a', 0);
    expect(s.heroes[1].hp).toBe(7);
  });

  it('cài đặt chỉ chủ phòng đổi được, và chỉ trước khi ai đi bước nào', () => {
    const s = rigged();
    expect(dungeonGame.reduce(s, { type: 'config', config: { mode: 'coop' } }, ctx('b'))).toBe(s);
    const c = dungeonGame.reduce(s, { type: 'config', config: { mode: 'coop', seedMode: 'random' } }, ctx('a', true));
    expect(c).toMatchObject({ mode: 'coop', seedMode: 'random', day: null });
    const moved = go(s, 'a', 1);
    expect(dungeonGame.reduce(moved, { type: 'config', config: { mode: 'coop' } }, ctx('a', true))).toBe(moved);
  });

  it('chỉ chủ phòng mở ván mới sau khi xong; tối đa 4 người vào hầm', () => {
    expect(fresh(players).heroes).toHaveLength(4);
    const s = { ...rigged(), done: true };
    expect(dungeonGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    expect(dungeonGame.reduce(s, { type: 'restart' }, ctx('a', true)).done).toBe(false);
  });

  it('bỏ lượt người mất kết nối: đang chờ chọn rương thì bỏ rương', () => {
    let s = rigged('race', { 0: { t: 'chest', v: 6 } });
    s = go(s, 'a', 0);
    const n = dungeonGame.advance(s);
    expect(expedOf(n, 0).pending).toBeNull();
    expect(n.turn).toBe(1);
  });
});
