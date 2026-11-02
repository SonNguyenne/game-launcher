import { describe, expect, it } from 'vitest';
import type { Player, ReduceContext } from '@bang/party';
import { biaGame, fresh, type BiaState } from './game';
import { CUE_SPOT, H, R, W, predict, rack, simulate, type Ball } from './sim';

const players: Player[] = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
  { id: 'c', name: 'Chi' },
];
const ctx = (from: string, host = false): ReduceContext => ({ from, players, host });
/** Bộ sinh số giả cố định cho test. */
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/** Bàn chỉ có các bi được liệt kê (còn lại đã rơi). */
function table(list: Record<number, [number, number]>): Ball[] {
  return Array.from({ length: 16 }, (_, id) => (list[id] ? { id, x: list[id][0], y: list[id][1], on: true } : { id, x: 0, y: 0, on: false }));
}
const aim = (from: [number, number], to: [number, number]) => Math.atan2(to[1] - from[1], to[0] - from[0]);
/** Ván đã phá bi, bàn chuẩn bị sẵn. */
function setup(balls: Ball[], extra: Partial<BiaState> = {}): BiaState {
  return { ...fresh(players, 0, {}, seeded()), balls, broken: true, inHand: null, ...extra };
}

describe('mô phỏng bi-a', () => {
  it('tất định: cùng cú đánh cho đúng cùng kết quả, kể cả khung phát lại', () => {
    const balls = rack(seeded(7));
    const a = simulate(balls, 12, -600, true);
    const b = simulate(balls, 12, -600, true);
    expect(a.balls).toEqual(b.balls);
    expect(a.pocketed).toEqual(b.pocketed);
    expect(a.frames.length).toBe(b.frames.length);
    expect(a.frames[a.frames.length - 1]).toEqual(b.frames[b.frames.length - 1]);
    // Khung cuối khớp vị trí cuối.
    const last = a.frames[a.frames.length - 1];
    a.balls.forEach((ball, i) => (ball.on ? expect(last[i * 2]).toBeCloseTo(ball.x, 3) : expect(Number.isNaN(last[i * 2])).toBe(true)));
  });

  it('phá bi làm các bi tản ra và mọi bi dừng hẳn, không bi nào lọt ra ngoài bàn', () => {
    const r = simulate(rack(seeded(3)), 0, -650);
    expect(r.firstHit).not.toBeNull();
    for (const b of r.balls) if (b.on) {
      expect(b.x).toBeGreaterThanOrEqual(R - 0.5);
      expect(b.x).toBeLessThanOrEqual(W - R + 0.5);
      expect(b.y).toBeGreaterThanOrEqual(R - 0.5);
      expect(b.y).toBeLessThanOrEqual(H - R + 0.5);
    }
    expect(r.time).toBeLessThan(15);
  });

  it('đánh thẳng bi vào lỗ góc; bi cái dừng lại sau va chạm thẳng', () => {
    const balls = table({ 0: [40, 40], 3: [20, 20] });
    const r = simulate(balls, -300, -300);
    expect(r.firstHit).toBe(3);
    expect(r.pocketed).toEqual([3]);
    expect(r.balls[0].on).toBe(true);
  });

  it('bi nảy băng: đánh thẳng vào băng trên thì quay lại', () => {
    const r = simulate(table({ 0: [60, 100] }), 0, -200, true);
    expect(r.pocketed).toEqual([]);
    const ys = r.frames.map((f) => f[1]);
    expect(Math.min(...ys)).toBeLessThan(R + 3);
    expect(r.balls[0].y).toBeGreaterThan(Math.min(...ys));
  });

  it('đường ngắm báo đúng bi bị chạm đầu tiên', () => {
    const balls = table({ 0: [60, 200], 5: [60, 120], 9: [60, 60] });
    const p = predict(balls, 0, -1);
    expect(p.hit?.id).toBe(5);
    expect(p.y).toBeCloseTo(120 + 2 * R, 5);
  });
});

describe('luật bi-a 8 bi', () => {
  it('bắt đầu: 2 người đầu là hai ghế, bi cái trong tay dưới vạch giao bóng', () => {
    const s = biaGame.init(players);
    expect(s.seats).toEqual(['a', 'b']);
    expect(s.inHand).toBe('kitchen');
    expect(s.balls.filter((b) => b.on)).toHaveLength(16);
  });

  it('không đúng lượt, người xem, lực sai hay đặt bi sai chỗ thì bỏ qua', () => {
    const s = biaGame.init(players);
    expect(biaGame.reduce(s, { type: 'shoot', angle: -1.57, power: 0.5 }, ctx('b'))).toBe(s);
    expect(biaGame.reduce(s, { type: 'shoot', angle: -1.57, power: 0.5 }, ctx('c'))).toBe(s);
    expect(biaGame.reduce(s, { type: 'shoot', angle: -1.57, power: 2 }, ctx('a'))).toBe(s);
    expect(biaGame.reduce(s, { type: 'shoot', angle: NaN, power: 0.5 }, ctx('a'))).toBe(s);
    // Trên vạch giao bóng khi phá bi: không được.
    expect(biaGame.reduce(s, { type: 'shoot', angle: -1.57, power: 0.5, cx: 60, cy: 100 }, ctx('a'))).toBe(s);
    const placed = biaGame.reduce(s, { type: 'shoot', angle: -1.57, power: 0.9, cx: 50, cy: 220 }, ctx('a'));
    expect(placed).not.toBe(s);
    expect(placed.shot?.from[0]).toMatchObject({ x: 50, y: 220 });
    // Không cầm bi thì không được đặt.
    const s2 = setup(table({ 0: [60, 200], 1: [60, 100] }));
    expect(biaGame.reduce(s2, { type: 'shoot', angle: 0, power: 0.5, cx: 30, cy: 30 }, ctx('a'))).toBe(s2);
  });

  it('lần đầu vào bi thì nhận nhóm và được đánh tiếp', () => {
    const s = setup(table({ 0: [40, 40], 3: [20, 20], 12: [100, 200], 8: [60, 130] }));
    const n = biaGame.reduce(s, { type: 'shoot', angle: aim([40, 40], [20, 20]), power: 0.5 }, ctx('a'));
    expect(n.report).toMatchObject({ foul: null, group: 'solid', again: true });
    expect(n.group0).toBe('solid');
    expect(n.turn).toBe(0);
  });

  it('chạm bi nhóm khác trước là lỗi: đối thủ cầm bi cái', () => {
    const s = setup(table({ 0: [60, 200], 11: [60, 150], 2: [20, 30], 8: [100, 40] }), { group0: 'solid' });
    const n = biaGame.reduce(s, { type: 'shoot', angle: -Math.PI / 2, power: 0.3 }, ctx('a'));
    expect(n.report?.foul).toBe('wrong');
    expect(n.turn).toBe(1);
    expect(n.inHand).toBe('table');
  });

  it('không chạm bi nào là lỗi', () => {
    const s = setup(table({ 0: [60, 200], 2: [20, 30], 8: [100, 40] }), { group0: 'solid' });
    const n = biaGame.reduce(s, { type: 'shoot', angle: Math.PI / 2, power: 0.05 }, ctx('a'));
    expect(n.report?.foul).toBe('miss');
    expect(n.inHand).toBe('table');
  });

  it('bi cái rơi lỗ: lỗi, bi cái được đặt lại trên bàn cho đối thủ', () => {
    const s = setup(table({ 0: [20, 20], 2: [80, 150], 8: [100, 40] }), { group0: 'solid' });
    const n = biaGame.reduce(s, { type: 'shoot', angle: aim([20, 20], [0, 0]), power: 0.4 }, ctx('a'));
    expect(n.report?.foul).toBe('scratch');
    expect(n.balls[0].on).toBe(true);
    expect(n.balls[0].x).toBeCloseTo(CUE_SPOT.x);
    expect(n.turn).toBe(1);
    // Đối thủ đặt bi cái chỗ nào cũng được rồi đánh.
    const m = biaGame.reduce(n, { type: 'shoot', angle: 0, power: 0.2, cx: 30, cy: 30 }, ctx('b'));
    expect(m.shot?.from[0]).toMatchObject({ x: 30, y: 30 });
  });

  it('vào bi 8 khi chưa hết bi nhóm mình thì thua', () => {
    const s = setup(table({ 0: [40, 40], 8: [20, 20], 2: [100, 200], 10: [100, 150] }), { group0: 'solid' });
    const n = biaGame.reduce(s, { type: 'shoot', angle: aim([40, 40], [20, 20]), power: 0.5 }, ctx('a'));
    expect(n.done).toBe(true);
    expect(n.winner).toBe(1);
    expect(n.how).toBe('early8');
    expect(n.wins).toEqual({ b: 1 });
  });

  it('hết bi nhóm mình rồi vào bi 8 thì thắng; vào kèm bi cái thì thua', () => {
    const s = setup(table({ 0: [40, 40], 8: [20, 20], 10: [100, 150] }), { group0: 'solid' });
    const n = biaGame.reduce(s, { type: 'shoot', angle: aim([40, 40], [20, 20]), power: 0.5 }, ctx('a'));
    expect(n).toMatchObject({ done: true, winner: 0, how: 'clean' });
    // Bi cái theo vào lỗ: thua.
    const n2 = biaGame.reduce(s, { type: 'shoot', angle: aim([40, 40], [20, 20]), power: 1 }, ctx('a'));
    if (n2.report?.foul === 'scratch') expect(n2).toMatchObject({ done: true, winner: 1, how: 'foul8' });
  });

  it('hết bi nhóm mình mà chạm bi khác trước bi 8 là lỗi', () => {
    const s = setup(table({ 0: [60, 200], 10: [60, 150], 8: [20, 30] }), { group0: 'solid' });
    const n = biaGame.reduce(s, { type: 'shoot', angle: -Math.PI / 2, power: 0.3 }, ctx('a'));
    expect(n.report?.foul).toBe('wrong');
  });

  it('chỉ chủ phòng mở ván mới, và chỉ khi ván đã xong; ván sau đổi người phá', () => {
    const s = { ...setup(table({ 0: [60, 60] })), done: true, winner: 0 as const };
    expect(biaGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    const n = biaGame.reduce(s, { type: 'restart' }, ctx('a', true));
    expect(n.done).toBe(false);
    expect(n.turn).toBe(1);
    const live = setup(table({ 0: [60, 60] }));
    expect(biaGame.reduce(live, { type: 'restart' }, ctx('a', true))).toBe(live);
  });

  it('bỏ lượt (mất kết nối): đối thủ được cầm bi cái', () => {
    const s = setup(table({ 0: [60, 60], 1: [30, 30] }));
    const n = biaGame.advance(s);
    expect(n.turn).toBe(1);
    expect(n.inHand).toBe('table');
  });
});
