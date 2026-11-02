import { afterEach, describe, expect, it, vi } from 'vitest';
import { canBuild, khGame, points, produce, type KHState, type Res, type Terrain } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const two = players.slice(0, 2);
const ctx = (from: string, list = two) => ({ from, players: list, host: from === 'a' });

function dice(...faces: number[]) {
  const spy = vi.spyOn(Math, 'random');
  for (const f of faces) spy.mockReturnValueOnce((f - 1) / 6 + 0.01);
  return spy;
}

afterEach(() => vi.restoreAllMocks());

/** Bàn cố định: toàn ruộng, trừ cột cuối là bãi sét. */
function board(over: Partial<KHState> = {}): KHState {
  const s = khGame.init(two);
  const terrain = s.terrain.map((_, i) => (i % 6 === 5 ? 3 : 0)) as Terrain[];
  return { ...s, terrain, phase: 'roll', draft: [], turn: 0, ...over };
}

describe('khai hoang', () => {
  it('chọn đất gốc đi xuôi rồi ngược, nhận 1 sản vật mỗi ô', () => {
    let s = khGame.init(two);
    expect(s.draft).toEqual([0, 1, 1, 0]);
    expect(khGame.reduce(s, { type: 'pick', cell: 0 }, ctx('b'))).toBe(s);
    s = khGame.reduce(s, { type: 'pick', cell: 0 }, ctx('a'));
    expect(s.turn).toBe(1);
    expect(khGame.reduce(s, { type: 'pick', cell: 0 }, ctx('b'))).toBe(s);
    s = khGame.reduce(s, { type: 'pick', cell: 1 }, ctx('b'));
    s = khGame.reduce(s, { type: 'pick', cell: 2 }, ctx('b'));
    expect(s.turn).toBe(0);
    s = khGame.reduce(s, { type: 'pick', cell: 3 }, ctx('a'));
    expect(s.phase).toBe('roll');
    expect(s.turn).toBe(0);
    expect(s.res[0].reduce((x, y) => x + y)).toBe(2);
    expect(s.owner.slice(0, 4)).toEqual([0, 1, 1, 0]);
  });

  it('sản lượng theo hàng và cột, ô giao nhau gấp đôi, nhà gấp đôi, mùa thêm 1', () => {
    const owner = Array(36).fill(null);
    owner[0] = 0; // hàng 0 cột 0: giao nhau
    owner[3] = 0; // hàng 0
    owner[12] = 1; // cột 0
    owner[14] = 1; // không trúng
    const house = Array(36).fill(false);
    house[3] = true;
    const s = board({ owner, house, round: 2 }); // mùa hạ: cá thêm, ruộng không
    const g = produce(s, 0, 0);
    // Đôi (0,0) là lũ: không có đê thì mất mùa.
    expect(g[0]).toEqual([0, 0, 0, 0]);
    const g3 = produce({ ...s, owner: owner.map((o, i) => (i === 1 ? 0 : o)) }, 0, 1);
    // ô 0: hàng 0 => 1; ô 1: giao nhau => 2; ô 3: nhà => 2; ô 12: không trúng (cột 0 không phải cột 1)
    expect(g3[0]).toEqual([5, 0, 0, 0]);
    expect(g3[1]).toEqual([0, 0, 0, 0]);
    const spring = produce({ ...s, round: 1 }, 2, 0); // xuân: lúa thêm 1
    expect(spring[0]).toEqual([2, 0, 0, 0]); // ô 0 ở cột 0
    expect(spring[1]).toEqual([5, 0, 0, 0]); // ô 12 giao nhau (2+1), ô 14 ở hàng 2 (1+1)
  });

  it('lũ: ô có đê được phù sa thêm 1', () => {
    const owner = Array(36).fill(null);
    owner[7] = 0; // hàng 1 cột 1
    owner[8] = 0; // hàng 1
    const dike = Array(36).fill(false);
    dike[8] = true;
    const g = produce(board({ owner, dike, round: 2 }), 1, 1);
    expect(g[0]).toEqual([2, 0, 0, 0]);
  });

  it('đổ xúc xắc cộng sản vật rồi mới được xây; chưa đổ thì không xây', () => {
    const owner = Array(36).fill(null);
    owner[0] = 0;
    let s = board({ owner, res: [[1, 1, 0, 0], [0, 0, 0, 0]] as Res[] });
    expect(khGame.reduce(s, { type: 'build', mode: 'claim', cell: 1 }, ctx('a'))).toBe(s);
    dice(1, 3, 1); // hàng 1, cột 3, chợ
    s = khGame.reduce(s, { type: 'roll' }, ctx('a'));
    expect(s.phase).toBe('build');
    expect(s.dice).toEqual([1, 3]);
    expect(s.res[0][0]).toBe(1 + 1 + 1); // xuân +1
    expect(khGame.reduce(s, { type: 'build', mode: 'claim', cell: 7 }, ctx('a'))).toBe(s); // không kề
    s = khGame.reduce(s, { type: 'build', mode: 'claim', cell: 1 }, ctx('a'));
    expect(s.owner[1]).toBe(0);
    expect(points(s, 0)).toBe(2);
    s = khGame.reduce(s, { type: 'end' }, ctx('a'));
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('roll');
  });

  it('nhà và đê đúng chỗ, đủ sản vật', () => {
    const owner = Array(36).fill(null);
    owner[0] = 0;
    owner[5] = 0; // bãi sét
    const s = board({ owner, phase: 'build', res: [[0, 3, 1, 3], [0, 0, 0, 0]] as Res[] });
    expect(canBuild(s, 0, 'dike', 5)).toBe(false);
    expect(canBuild(s, 0, 'dike', 0)).toBe(true);
    expect(canBuild(s, 1, 'house', 0)).toBe(false);
    let n = khGame.reduce(s, { type: 'build', mode: 'house', cell: 0 }, ctx('a'));
    expect(n.house[0]).toBe(true);
    expect(points(n, 0)).toBe(4);
    expect(khGame.reduce(n, { type: 'build', mode: 'house', cell: 0 }, ctx('a'))).toBe(n);
    n = khGame.reduce(n, { type: 'build', mode: 'dike', cell: 0 }, ctx('a'));
    expect(n.dike[0]).toBe(true);
    expect(n.res[0]).toEqual([0, 0, 0, 0]);
  });

  it('chợ: 3 đổi 1, hàng được giá 2 đổi 1', () => {
    const s = board({ phase: 'build', hot: 1, res: [[3, 2, 0, 0], [0, 0, 0, 0]] as Res[] });
    const a = khGame.reduce(s, { type: 'trade', give: 0, get: 2 }, ctx('a'));
    expect(a.res[0]).toEqual([0, 2, 1, 0]);
    const b = khGame.reduce(s, { type: 'trade', give: 1, get: 3 }, ctx('a'));
    expect(b.res[0]).toEqual([3, 0, 0, 1]);
    expect(khGame.reduce(s, { type: 'trade', give: 0, get: 0 }, ctx('a'))).toBe(s);
    expect(khGame.reduce(s, { type: 'trade', give: 2, get: 0 }, ctx('a'))).toBe(s);
  });

  it('đủ điểm mục tiêu thì thắng ngay', () => {
    const owner = Array(36).fill(null).map((_, i) => (i < 11 ? 0 : null));
    let s = board({ owner, phase: 'build', target: '12', res: [[1, 1, 1, 1], [0, 0, 0, 0]] as Res[] });
    expect(points(s, 0)).toBe(11);
    s = khGame.reduce(s, { type: 'offer' }, ctx('a'));
    expect(s.done).toBe(true);
    expect(s.winner).toBe(0);
    expect(khGame.reduce(s, { type: 'roll' }, ctx('a'))).toBe(s);
    const r = khGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(r.phase).toBe('setup');
    expect(r.target).toBe('12');
  });

  it('bỏ lượt người mất kết nối, lúc chọn đất gốc thì chọn giúp', () => {
    let s = khGame.init(players);
    s = khGame.advance(s, ctx('a', players));
    expect(s.owner.filter((o) => o === 0)).toHaveLength(1);
    expect(s.turn).toBe(1);
    const b = board({ phase: 'build', turn: 1 });
    expect(khGame.advance(b, ctx('a')).turn).toBe(0);
  });
});
