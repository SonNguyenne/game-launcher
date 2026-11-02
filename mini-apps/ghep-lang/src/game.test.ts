import { describe, expect, it } from 'vitest';
import { glGame, legal, placeScore, wishMet, WELL_CELL, type GLState, type Kind, type Tile } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const two = players.slice(0, 2);
const ctx = (from: string, list = two) => ({ from, players: list, host: from === 'a' });

function withMarket(s: GLState, market: Kind[]): GLState {
  return { ...s, market };
}

function board(tiles: Record<number, [Kind, number]>): (Tile | null)[] {
  const cells: (Tile | null)[] = Array(49).fill(null);
  cells[WELL_CELL] = { k: 6, by: -1 };
  for (const [i, [k, by]] of Object.entries(tiles)) cells[Number(i)] = { k, by };
  return cells;
}

describe('ghép làng', () => {
  it('khởi đầu: giếng giữa làng, chợ 4 mảnh, mỗi người 2 ước nguyện khác nhau', () => {
    const s = glGame.init(players);
    expect(s.cells[WELL_CELL]?.k).toBe(6);
    expect(s.market).toHaveLength(4);
    expect(s.bag).toHaveLength(44);
    const all = s.wishes.flat();
    expect(new Set(all).size).toBe(6);
  });

  it('chỉ người tới lượt được đặt, phải kề mảnh đã có', () => {
    const s = withMarket(glGame.init(two), [0, 1, 2, 3]);
    expect(glGame.reduce(s, { type: 'place', slot: 0, cell: 23 }, ctx('b'))).toBe(s);
    expect(glGame.reduce(s, { type: 'place', slot: 0, cell: 0 }, ctx('a'))).toBe(s);
    expect(glGame.reduce(s, { type: 'place', slot: 9, cell: 23 }, ctx('a'))).toBe(s);
    const n = glGame.reduce(s, { type: 'place', slot: 1, cell: 23 }, ctx('a'));
    expect(n.cells[23]).toEqual({ k: 1, by: 0 });
    expect(n.score[0]).toBe(1); // nhà sát giếng
    expect(n.turn).toBe(1);
    expect(n.market).toHaveLength(4);
    expect(n.bag).toHaveLength(s.bag.length - 1);
  });

  it('tính điểm khi đặt từng loại', () => {
    // giếng 24; nhà 23, 17; ruộng 25; ao 31; chợ 16
    const cells = board({ 23: [1, 0], 17: [1, 1], 25: [0, 0], 31: [2, 1], 16: [4, 0] });
    expect(placeScore(cells, 18, 1)).toBe(2); // kề nhà 17, sát giếng; chợ 16 ở xa
    expect(placeScore(cells, 32, 0)).toBe(2); // kề ruộng 25 và ao 31
    expect(placeScore(cells, 26, 0)).toBe(1); // kề ruộng 25
    expect(placeScore(cells, 30, 2)).toBe(1); // ao kề nhà 23
    expect(placeScore(cells, 0, 3)).toBe(1); // tre ở mép
    expect(placeScore(cells, 10, 4)).toBe(1); // một nhà (17) ở 8 ô quanh
  });

  it('chợ không kề chợ, đình không sát đình', () => {
    const cells = board({ 23: [4, 0], 25: [5, 1] });
    expect(legal(cells, 22, 4)).toBe(false);
    expect(legal(cells, 22, 1)).toBe(true);
    expect(legal(cells, 18, 5)).toBe(false); // sát đình 25 theo đường chéo
    expect(legal(cells, 31, 5)).toBe(false);
    expect(legal(cells, 16, 5)).toBe(true);
  });

  it('đình tính số loại khác nhau quanh', () => {
    const cells = board({ 23: [1, 0], 17: [0, 1], 25: [2, 0] });
    expect(placeScore(cells, 18, 5)).toBe(3); // ruộng, giếng, ao
  });

  it('ước nguyện chỉ tính mảnh của chính mình', () => {
    const cells = board({ 23: [0, 0], 22: [0, 0], 21: [0, 0], 29: [0, 1] });
    expect(wishMet(cells, 0, 0)).toBe(false);
    const full = board({ 23: [0, 0], 22: [0, 0], 21: [0, 0], 29: [0, 0] });
    expect(wishMet(full, 0, 0)).toBe(true);
    expect(wishMet(full, 0, 8)).toBe(false);
    expect(wishMet(board({ 0: [3, 0], 1: [3, 0], 2: [1, 0], 3: [0, 0] }), 0, 8)).toBe(true); // 4 mảnh liền một hàng
    expect(wishMet(full, 1, 0)).toBe(false);
    expect(wishMet(board({ 23: [3, 0], 17: [1, 0] }), 0, 7)).toBe(true);
  });

  it('thay chợ tốn 1 điểm, mỗi lượt một lần', () => {
    let s = glGame.init(two);
    expect(glGame.reduce(s, { type: 'refresh' }, ctx('a'))).toBe(s);
    s = { ...s, score: [2, 0] };
    const n = glGame.reduce(s, { type: 'refresh' }, ctx('a'));
    expect(n.score[0]).toBe(1);
    expect(n.market).toHaveLength(4);
    expect(n.bag.length + n.market.length).toBe(s.bag.length + s.market.length);
    expect(glGame.reduce(n, { type: 'refresh' }, ctx('a'))).toBe(n);
  });

  it('hết mảnh thì kết thúc, cộng ước nguyện và ván mới giữ cài đặt', () => {
    let s = glGame.reduce(glGame.init(two), { type: 'config', config: { marketSize: '3' } }, ctx('a'));
    expect(s.market).toHaveLength(3);
    s = { ...s, bag: [], market: [0], wishes: [[0, 7], [1, 2]], cells: board({ 23: [0, 0], 22: [0, 0], 21: [0, 0], 17: [1, 0] }), score: [3, 9] };
    s = glGame.reduce(s, { type: 'place', slot: 0, cell: 29 }, ctx('a'));
    expect(s.done).toBe(true);
    expect(s.wishMet[0]).toEqual([true, true]);
    expect(s.wishScore[0]).toBe(9);
    expect(s.score[0]).toBe(4);
    expect(s.winners).toEqual([0]);
    expect(glGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    const r = glGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(r.done).toBe(false);
    expect(r.marketSize).toBe('3');
  });
});
