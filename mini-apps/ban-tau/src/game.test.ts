import { describe, expect, it } from 'vitest';
import { randomFleet, shipCells, shipGame, validFleet, type Ship, type ShipState } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const ctx = (from: string) => ({ from, players, host: from === 'a' });

/** Đội tàu cố định: mỗi tàu nằm ngang ở đầu một hàng chẵn. */
const fleet: Ship[] = [
  [0, 1, 2, 3, 4],
  [20, 21, 22, 23],
  [40, 41, 42],
  [60, 61, 62],
  [80, 81],
];
const allCells = fleet.flat();

function battle(chain: 'on' | 'off' = 'on'): ShipState {
  let s = shipGame.reduce(shipGame.init(players), { type: 'config', config: { chain } }, ctx('a'));
  s = shipGame.reduce(s, { type: 'ready', ships: fleet }, ctx('a'));
  s = shipGame.reduce(s, { type: 'ready', ships: fleet }, ctx('b'));
  return s;
}
const fire = (s: ShipState, who: string, cell: number) => shipGame.reduce(s, { type: 'fire', cell }, ctx(who));

describe('bắn tàu', () => {
  it('kiểm tra đội tàu hợp lệ', () => {
    expect(validFleet(fleet)).toBe(true);
    expect(validFleet(fleet.slice(0, 4))).toBe(false);
    // Chồng lên nhau.
    expect(validFleet([...fleet.slice(0, 4), [3, 13]])).toBe(false);
    // Không thẳng hàng.
    expect(validFleet([...fleet.slice(0, 4), [90, 99]])).toBe(false);
    // Tràn sang hàng sau.
    expect(validFleet([...fleet.slice(0, 4), [9, 10]])).toBe(false);
    // Sai độ dài.
    expect(validFleet([...fleet.slice(0, 4), [80, 81, 82]])).toBe(false);
    expect(shipCells(7, 4, false)).toBeNull();
    expect(shipCells(7, 3, true)).toEqual([7, 17, 27]);
    for (let i = 0; i < 50; i++) expect(validFleet(randomFleet())).toBe(true);
  });

  it('xếp tàu: người xem và đội tàu sai bị từ chối, đủ 2 người sẵn sàng mới bắn', () => {
    let s = shipGame.init(players);
    expect(shipGame.reduce(s, { type: 'ready', ships: fleet }, ctx('c'))).toBe(s);
    expect(shipGame.reduce(s, { type: 'ready', ships: fleet.slice(1) }, ctx('a'))).toBe(s);
    // Người thứ hai được xếp trước (chơi phòng xếp cùng lúc).
    s = shipGame.reduce(s, { type: 'ready', ships: fleet }, ctx('b'));
    expect(s.ready).toEqual([false, true]);
    expect(s.turn).toBe(0);
    expect(fire(s, 'a', 0)).toBe(s);
    s = shipGame.reduce(s, { type: 'unready' }, ctx('b'));
    expect(s.ready).toEqual([false, false]);
    s = shipGame.reduce(s, { type: 'ready', ships: fleet }, ctx('a'));
    expect(s.turn).toBe(1);
    s = shipGame.reduce(s, { type: 'ready', ships: fleet }, ctx('b'));
    expect(s.phase).toBe('battle');
    expect(s.turn).toBe(0);
  });

  it('trượt thì đổi lượt, trúng thì bắn tiếp, không bắn lại ô cũ', () => {
    let s = battle();
    expect(fire(s, 'b', 0)).toBe(s);
    s = fire(s, 'a', 0);
    expect(s.lastShot).toMatchObject({ hit: true, sunk: null });
    expect(s.turn).toBe(0);
    expect(fire(s, 'a', 0)).toBe(s);
    s = fire(s, 'a', 99);
    expect(s.lastShot?.hit).toBe(false);
    expect(s.turn).toBe(1);
    expect(fire(s, 'a', 98)).toBe(s);
  });

  it('tắt bắn tiếp: trúng cũng đổi lượt', () => {
    const s = fire(battle('off'), 'a', 0);
    expect(s.lastShot?.hit).toBe(true);
    expect(s.turn).toBe(1);
  });

  it('báo chìm tàu và thắng khi chìm hết', () => {
    let s = battle();
    s = fire(s, 'a', 80);
    s = fire(s, 'a', 81);
    expect(s.lastShot?.sunk).toBe(2);
    for (const cell of allCells.filter((x) => x !== 80 && x !== 81)) s = fire(s, 'a', cell);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
    expect(s.wins.a).toBe(1);
    expect(fire(s, 'b', 0)).toBe(s);
    expect(shipGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    const again = shipGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(again.phase).toBe('place');
    expect(again.first).toBe(1);
    expect(again.wins.a).toBe(1);
  });
});
