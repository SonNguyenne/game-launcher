import { describe, expect, it } from 'vitest';
import { finished, newBoard, quanGame, sow, spread, tally, type Board, type QuanState } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const ctx = (from: string) => ({ from, players, host: from === 'a' });

/** Bàn dựng sẵn từ mảng 12 ô. */
const board = (pits: number[], extra: Partial<Board> = {}): Board => ({ ...newBoard(), pits, ...extra });
const on = { quanNon: true };
const off = { quanNon: false };

describe('ô ăn quan: rải và ăn', () => {
  it('bàn đầu: 10 ô dân 5 quân, 2 quan', () => {
    const s = quanGame.init(players);
    expect(s.pits).toEqual([0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5]);
    expect(s.quan).toEqual([true, true]);
    expect(s.seats).toEqual(['a', 'b']);
  });

  it('rải tiếp khi ô kế có quân, gặp ô trống thì ăn ô sau', () => {
    // Ô 7 (5 quân) rải chiều +1: 8,9,10,11,0. Ô kế 1 có 5 -> bốc rải 2,3,4,5,6. Ô kế 7 trống, ăn ô 8 (6 quân).
    const { board: b, steps } = sow(newBoard(), 0, 7, 1, on);
    expect(b.captured[0]).toBe(6);
    expect(b.pits[8]).toBe(0);
    expect(b.pits).toEqual([1, 0, 6, 6, 6, 6, 1, 0, 0, 6, 6, 6]);
    expect(steps.filter((x) => x.t === 'pick').map((x) => x.i)).toEqual([7, 1]);
    expect(steps.at(-1)).toEqual({ t: 'eat', i: 8, n: 6, quan: false, seat: 0 });
  });

  it('ăn liên tiếp kiểu cách ô', () => {
    // Rải ô 7 (1 quân) chiều +1 vào 8. Ô 9 trống, ăn 10; ô 11 trống, ăn 0 (quan có 6 dân, không non).
    const b0 = board([6, 0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0]);
    const { board: b } = sow(b0, 0, 7, 1, on);
    expect(b.captured[0]).toBe(3 + 6);
    expect(b.quanTaken[0]).toBe(1);
    expect(b.quan[0]).toBe(false);
  });

  it('gặp hai ô trống liền thì mất lượt', () => {
    const b0 = board([0, 2, 2, 2, 2, 2, 0, 1, 0, 0, 0, 3]);
    const { board: b, steps } = sow(b0, 0, 7, 1, on);
    expect(b.captured).toEqual([0, 0]);
    expect(steps).toHaveLength(2);
  });

  it('ô kế là ô quan thì mất lượt', () => {
    // Rải ô 10 (1 quân) vào 11; ô kế là quan trái: dừng.
    const b0 = board([0, 2, 2, 2, 2, 2, 0, 3, 3, 3, 1, 0]);
    const { board: b } = sow(b0, 0, 10, 1, on);
    expect(b.pits[11]).toBe(1);
    expect(b.captured).toEqual([0, 0]);
  });

  it('quan non: bật thì không ăn được, tắt thì ăn', () => {
    // Ô 9 (1 quân) rải chiều -1 vào 8; ô 7 trống, tới ô quan phải còn quan và 2 dân.
    const b0 = board([0, 2, 2, 2, 2, 2, 2, 0, 0, 1, 2, 2]);
    expect(sow(b0, 0, 9, -1, on).board.captured).toEqual([0, 0]);
    const eaten = sow(b0, 0, 9, -1, off).board;
    expect(eaten.captured[0]).toBe(2);
    expect(eaten.quanTaken[0]).toBe(1);
    // Quan đủ dân thì không còn non.
    const fat = board([0, 2, 2, 2, 2, 2, 5, 0, 0, 1, 2, 2]);
    expect(sow(fat, 0, 9, -1, on).board.quanTaken[0]).toBe(1);
    // Ô quan đã mất quan nhưng còn dân thì ăn như ô dân.
    const empty = board([0, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2], { quan: [true, false] });
    expect(sow(empty, 0, 9, -1, on).board.captured[0]).toBe(1);
  });
});

describe('ô ăn quan: lượt và luật', () => {
  it('chỉ người tới lượt, ô bên mình, ô có quân, hướng hợp lệ', () => {
    const s = quanGame.init(players);
    expect(quanGame.reduce(s, { type: 'sow', pit: 7, dir: 1 }, ctx('b'))).toBe(s);
    expect(quanGame.reduce(s, { type: 'sow', pit: 1, dir: 1 }, ctx('a'))).toBe(s);
    expect(quanGame.reduce(s, { type: 'sow', pit: 0, dir: 1 }, ctx('a'))).toBe(s);
    expect(quanGame.reduce(s, { type: 'sow', pit: 7, dir: 2 as 1 }, ctx('a'))).toBe(s);
    expect(quanGame.reduce(s, { type: 'sow', pit: 7, dir: 1 }, ctx('c'))).toBe(s);
    const next = quanGame.reduce(s, { type: 'sow', pit: 7, dir: 1 }, ctx('a'));
    expect(next.turn).toBe(1);
    expect(next.last?.before.pits).toEqual(s.pits);
    expect(next.last?.steps.length).toBeGreaterThan(5);
    const empty: QuanState = { ...next, pits: next.pits.map((n, i) => (i === 2 ? 0 : n)) };
    expect(quanGame.reduce(empty, { type: 'sow', pit: 2, dir: 1 }, ctx('b'))).toBe(empty);
  });

  it('hết dân bên mình thì lấy 5 quân đã ăn rải lại, thiếu thì vay', () => {
    const b0 = board([3, 0, 0, 0, 0, 0, 3, 1, 1, 1, 1, 1], { captured: [1, 2] });
    const own = spread(b0, 1);
    expect(own).toBeNull();
    const b1 = board([3, 0, 0, 0, 0, 0, 3, 1, 1, 1, 1, 1], { captured: [7, 3] });
    const r = spread(b1, 1)!;
    expect(r.board.pits.slice(1, 6)).toEqual([1, 1, 1, 1, 1]);
    expect(r.board.captured).toEqual([5, 0]);
    expect(r.board.debt).toEqual([0, 2]);
    expect(r.step).toEqual({ t: 'spread', seat: 1, borrowed: 2 });
  });

  it('reducer tự rải lại cho người tới lượt khi hàng trống', () => {
    // A rải ô 11 (1 quân) chiều +1 vào ô quan trái, gặp hai ô trống thì mất lượt; hàng B đang trống.
    const s0: QuanState = { ...quanGame.init(players), ...board([2, 0, 0, 0, 0, 0, 2, 3, 3, 0, 0, 1], { captured: [4, 6] }) };
    const s = quanGame.reduce(s0, { type: 'sow', pit: 11, dir: 1 }, ctx('a'));
    expect(s.turn).toBe(1);
    expect(s.pits.slice(1, 6)).toEqual([1, 1, 1, 1, 1]);
    expect(s.captured[1]).toBe(1);
    expect(s.last?.steps.at(-1)).toEqual({ t: 'spread', seat: 1, borrowed: 0 });
  });

  it('hết hai quan thì hết ván, cộng dân còn trên bàn và trả nợ', () => {
    const b = board([0, 1, 0, 0, 0, 2, 0, 3, 0, 0, 0, 0], { quan: [false, false], captured: [10, 20], quanTaken: [1, 1], debt: [2, 0] });
    expect(finished(b)).toBe(true);
    expect(tally(b, 10)).toEqual([10 + 3 + 10 - 2, 20 + 3 + 10 + 2]);
    expect(tally(b, 5)).toEqual([10 + 3 + 5 - 2, 20 + 3 + 5 + 2]);
  });

  it('nước ăn quan cuối cùng kết thúc ván và cộng ván thắng', () => {
    // Quan trái đã mất; A rải ô 9 (1 quân) chiều -1 vào 8, ô 7 trống, ăn ô quan phải (còn quan, 5 dân).
    const s0: QuanState = { ...quanGame.init(players), ...board([0, 1, 1, 0, 0, 0, 5, 0, 0, 1, 0, 0], { quan: [false, true], captured: [10, 10], quanTaken: [0, 1] }) };
    const s = quanGame.reduce(s0, { type: 'sow', pit: 9, dir: -1 }, ctx('a'));
    expect(s.done).toBe(true);
    // A: 10 + 5 dân + 1 quan (10) + 1 dân còn ở ô 8 = 26; B: 10 + 10 + 2 dân hàng trên = 22.
    expect(s.final).toEqual([26, 22]);
    expect(s.winner).toBe(0);
    expect(s.wins.a).toBe(1);
    expect(quanGame.reduce(s, { type: 'sow', pit: 1, dir: 1 }, ctx('b'))).toBe(s);
    expect(quanGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    const r = quanGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(r.done).toBe(false);
    expect(r.turn).toBe(1);
    expect(r.wins.a).toBe(1);
  });

  it('cài đặt: quan 5 điểm, tắt quan non', () => {
    const s = quanGame.reduce(quanGame.init(players), { type: 'config', config: { quanValue: '5', quanNon: 'off' } }, ctx('a'));
    expect(s.quanValue).toBe('5');
    expect(s.quanNon).toBe('off');
  });
});
