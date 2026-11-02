import { describe, expect, it } from 'vitest';
import type { Player, ReduceContext } from '@bang/party';
import { bowlingGame, fresh, record, type BowlState } from './game';
import { freshRack, scoreFrames, splitFrames, totalOf } from './score';
import { HEAD_PIN, roll, throwOf } from './sim';

const players: Player[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase() }));
const ctx = (from: string, host = false): ReduceContext => ({ from, players, host });
const ALL = Array(10).fill(true);
/** Ném tới điểm tx ở ki đầu từ chỗ đứng x0. */
const at = (x0: number, tx: number, power = 0.6, spin = 0) => throwOf(x0, (tx - x0) / HEAD_PIN, power, spin);
const pins = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('tính điểm bowling', () => {
  it('ván hoàn hảo 300, toàn trượt 0, toàn spare 5/5 là 150', () => {
    expect(totalOf(Array(12).fill(10))).toBe(300);
    expect(totalOf(Array(20).fill(0))).toBe(0);
    expect(totalOf(Array(21).fill(5))).toBe(150);
  });

  it('strike cộng 2 lần ném sau, spare cộng 1 lần ném sau', () => {
    const f = scoreFrames([10, 3, 4, 6, 4, 2, 0]);
    expect(f[0]).toEqual({ marks: ['', 'X'], total: 17 });
    expect(f[1]).toEqual({ marks: ['3', '4'], total: 24 });
    expect(f[2]).toEqual({ marks: ['6', '/'], total: 36 });
    expect(f[3]).toEqual({ marks: ['2', '-'], total: 38 });
    expect(f[4].total).toBeNull();
  });

  it('chưa đủ lần ném thưởng thì chưa có điểm khung', () => {
    expect(scoreFrames([10, 10])[0].total).toBeNull();
    expect(scoreFrames([7, 3])[0].total).toBeNull();
    expect(scoreFrames([10, 10, 10])[0].total).toBe(30);
  });

  it('khung 10: strike hoặc spare được ném 3 lần, ký hiệu đúng', () => {
    const base = Array(18).fill(0);
    expect(scoreFrames([...base, 10, 10, 10])[9]).toEqual({ marks: ['X', 'X', 'X'], total: 30 });
    expect(scoreFrames([...base, 10, 3, 7])[9]).toEqual({ marks: ['X', '3', '/'], total: 20 });
    expect(scoreFrames([...base, 4, 6, 10])[9]).toEqual({ marks: ['4', '/', 'X'], total: 20 });
    expect(scoreFrames([...base, 3, 4])[9]).toEqual({ marks: ['3', '4'], total: 7 });
    expect(splitFrames([...base, 10, 10, 10])).toHaveLength(10);
  });

  it('dựng lại ki: đầu khung, và trong khung 10 sau strike hoặc spare', () => {
    expect(freshRack([])).toBe(true);
    expect(freshRack([3])).toBe(false);
    expect(freshRack([3, 4])).toBe(true);
    const base = Array(18).fill(0);
    expect(freshRack([...base, 10])).toBe(true);
    expect(freshRack([...base, 10, 3])).toBe(false);
    expect(freshRack([...base, 3, 7])).toBe(true);
  });
});

describe('mô phỏng bi và ki', () => {
  it('tất định: cùng tham số cho cùng kết quả và cùng khung', () => {
    const t = at(15, 8, 0.7, -0.4);
    const a = roll(ALL, t, true);
    const b = roll(ALL, t, true);
    expect(a.knocked).toEqual(b.knocked);
    expect(a.frames.length).toBe(b.frames.length);
    expect(a.frames[a.frames.length - 1]).toEqual(b.frames[b.frames.length - 1]);
  });

  it('ném trúng túi (giữa ki 1 và 3) thì strike', () => {
    expect(roll(ALL, at(0, 6)).knocked).toHaveLength(10);
  });

  it('bi lọt rãnh không đổ ki nào', () => {
    const r = roll(ALL, at(0, 80));
    expect(r.gutter).toBe(true);
    expect(r.knocked).toEqual([]);
  });

  it('xoáy làm bi móc về một phía', () => {
    const left = roll(ALL, at(0, 0, 0.5, -1), true);
    const right = roll(ALL, at(0, 0, 0.5, 1), true);
    const xAtPins = (r: typeof left) => r.frames.find((f) => f[1] > HEAD_PIN - 60)![0];
    expect(xAtPins(left)).toBeLessThan(-10);
    expect(xAtPins(right)).toBeGreaterThan(10);
  });

  it('chỉ tính ki còn đứng: ki đã đổ không tính lại', () => {
    const standing = ALL.map((_, i) => i === 6);
    const r = roll(standing, at(0, -46));
    expect(r.knocked.every((i) => i === 6)).toBe(true);
  });
});

describe('luật lượt ném', () => {
  it('tối đa 4 người ném, người thứ 5 chỉ xem', () => {
    const s = bowlingGame.init(players);
    expect(s.seats).toEqual(['a', 'b', 'c', 'd']);
    const r = { type: 'roll' as const, x0: 0, angle: 0, power: 0.5, spin: 0 };
    expect(bowlingGame.reduce(s, r, ctx('e'))).toBe(s);
    expect(bowlingGame.reduce(s, r, ctx('b'))).toBe(s);
    expect(bowlingGame.reduce(s, r, ctx('a'))).not.toBe(s);
  });

  it('tham số ném ngoài giới hạn bị bỏ qua', () => {
    const s = bowlingGame.init(players);
    for (const bad of [{ x0: 99 }, { angle: 1 }, { power: 1.5 }, { spin: -2 }, { power: NaN }]) {
      expect(bowlingGame.reduce(s, { type: 'roll', x0: 0, angle: 0, power: 0.5, spin: 0, ...bad }, ctx('a'))).toBe(s);
    }
  });

  it('strike thì sang người kế; lần đầu không hết ki thì ném bù với ki còn lại', () => {
    let s: BowlState = fresh(players.slice(0, 2));
    s = record(s, pins(10), null);
    expect(s.turn).toBe(1);
    expect(s.standing.every(Boolean)).toBe(true);
    s = record(s, [0, 1, 2], null);
    expect(s.turn).toBe(1);
    expect(s.standing.filter(Boolean)).toHaveLength(7);
    expect(s.standing[0]).toBe(false);
    s = record(s, [3], null);
    expect(s.turn).toBe(0);
    expect(s.rolls).toEqual([[10], [3, 1]]);
  });

  it('ván đủ 10 khung: khung 10 có ném thưởng, hết ván thì người điểm cao thắng', () => {
    let s: BowlState = fresh(players.slice(0, 2));
    for (let f = 0; f < 9; f++) {
      s = record(s, pins(10), null);
      s = record(s, [], null);
      s = record(s, [], null);
    }
    expect(s.turn).toBe(0);
    s = record(s, pins(10), null);
    expect(s.turn).toBe(0);
    s = record(s, pins(10), null);
    s = record(s, pins(4), null);
    expect(s.turn).toBe(1);
    expect(s.done).toBe(false);
    s = record(s, [], null);
    s = record(s, [], null);
    expect(s.done).toBe(true);
    expect(totalOf(s.rolls[0])).toBe(294);
    expect(s.wins).toEqual({ a: 1 });
    // Ván xong thì không ném nữa; chỉ chủ phòng mở ván mới.
    expect(bowlingGame.reduce(s, { type: 'roll', x0: 0, angle: 0, power: 0.5, spin: 0 }, ctx('a'))).toBe(s);
    expect(bowlingGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    const n = bowlingGame.reduce(s, { type: 'restart' }, ctx('a', true));
    expect(n.done).toBe(false);
    expect(n.wins).toEqual({ a: 1 });
  });

  it('bỏ lượt người mất kết nối tính như một bi lọt rãnh', () => {
    const s = fresh(players.slice(0, 2));
    const n = bowlingGame.advance(s);
    expect(n.rolls[0]).toEqual([0]);
    expect(n.turn).toBe(0);
  });
});
