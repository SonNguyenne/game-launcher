import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyEvent, buyPrice, chainLength, dvGame, rentOf, START_CASH, SALARY, type DVState } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const two = players.slice(0, 2);
const ctx = (from: string, list = two) => ({ from, players: list, host: from === 'a' });

/** Ép xúc xắc ra các mặt cho trước (mỗi lần gọi Math.random lấy một giá trị). */
function dice(...faces: number[]) {
  const spy = vi.spyOn(Math, 'random');
  for (const f of faces) spy.mockReturnValueOnce((f - 1) / 6 + 0.01);
  return spy;
}

const roll = (s: DVState, who: string, a: number, b: number, list = two) => {
  dice(a, b);
  return dvGame.reduce(s, { type: 'roll' }, ctx(who, list));
};

afterEach(() => vi.restoreAllMocks());

describe('đất vàng', () => {
  it('chỉ người tới lượt được đổ, người xem không chơi', () => {
    const s = dvGame.init(players.slice(0, 2));
    expect(dvGame.reduce(s, { type: 'roll' }, ctx('b'))).toBe(s);
    expect(dvGame.reduce(s, { type: 'roll' }, ctx('c'))).toBe(s);
    expect(dvGame.reduce(s, { type: 'buy' }, ctx('a'))).toBe(s);
  });

  it('dừng ở đất trống thì mua được, rồi sang lượt người sau', () => {
    let s = roll(dvGame.init(two), 'a', 1, 1); // tới ô 2
    expect(s.pos[0]).toBe(2);
    expect(s.phase).toBe('buy');
    expect(s.turn).toBe(0);
    expect(dvGame.reduce(s, { type: 'roll' }, ctx('a'))).toBe(s);
    s = dvGame.reduce(s, { type: 'buy' }, ctx('a'));
    expect(s.lots[2]?.owner).toBe(0);
    expect(s.cash[0]).toBe(START_CASH - 60);
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('roll');
  });

  it('trả tiền thuê, dãy liền nhau nhân hệ số', () => {
    let s = dvGame.init(two);
    s = { ...s, lots: s.lots.map((l, i) => (i === 1 || i === 2 ? { owner: 0, level: 0 } : l)) };
    expect(chainLength(s, 2)).toBe(2);
    const rent = rentOf(s, 2);
    expect(rent).toBe(Math.round(60 * 0.2 * 2));
    s = { ...s, turn: 1 };
    s = roll(s, 'b', 1, 1);
    expect(s.cash[1]).toBe(START_CASH - rent);
    expect(s.cash[0]).toBe(START_CASH + rent);
    expect(s.turn).toBe(0);
  });

  it('ô đặc biệt giữa cạnh không cắt dãy, đủ 4 mảnh nhân 5', () => {
    let s = dvGame.init(two);
    s = { ...s, lots: s.lots.map((l, i) => ([1, 2, 4, 5].includes(i) ? { owner: 0, level: 0 } : l)) };
    expect(chainLength(s, 5)).toBe(4);
    expect(rentOf(s, 5)).toBe(Math.round(80 * 0.2 * 5));
  });

  it('đi qua cổng thành nhận lương', () => {
    let s = dvGame.init(two);
    s = { ...s, pos: [22, 0] };
    s = roll(s, 'a', 2, 2); // 22 -> 2
    expect(s.pos[0]).toBe(2);
    expect(s.cash[0]).toBe(START_CASH + SALARY);
  });

  it('tôn tạo đất của mình tối đa 2 lần, giá trị tăng', () => {
    let s = dvGame.init(two);
    s = { ...s, lots: s.lots.map((l, i) => (i === 2 ? { owner: 0, level: 1 } : l)) };
    s = roll(s, 'a', 1, 1);
    expect(s.phase).toBe('invest');
    s = dvGame.reduce(s, { type: 'invest' }, ctx('a'));
    expect(s.lots[2]?.level).toBe(2);
    expect(s.cash[0]).toBe(START_CASH - 30);
  });

  it('phòng công chứng: mua đất trống bất kỳ, không mua được đất có chủ', () => {
    let s = dvGame.init(two);
    s = { ...s, lots: s.lots.map((l, i) => (i === 23 ? { owner: 1, level: 0 } : l)) };
    s = roll(s, 'a', 3, 3);
    expect(s.phase).toBe('notary');
    expect(dvGame.reduce(s, { type: 'notary', pos: 23 }, ctx('a'))).toBe(s);
    expect(dvGame.reduce(s, { type: 'notary', pos: 3 }, ctx('a'))).toBe(s);
    s = dvGame.reduce(s, { type: 'notary', pos: 22 }, ctx('a'));
    expect(s.lots[22]?.owner).toBe(0);
    expect(s.cash[0]).toBe(START_CASH - 200);
  });

  it('sàn giao dịch đẩy giá phường lên, giá mua theo chỉ số', () => {
    let s = dvGame.init(two);
    s = { ...s, pos: [12, 0] };
    s = roll(s, 'a', 3, 3);
    expect(s.phase).toBe('boom');
    expect(dvGame.reduce(s, { type: 'boom', district: 7 }, ctx('a'))).toBe(s);
    s = dvGame.reduce(s, { type: 'boom', district: 2 }, ctx('a'));
    expect(s.index[2]).toBe(125);
    expect(buyPrice(s, 13)).toBe(175);
  });

  it('thuế vào quỹ, hội đình nhận quỹ', () => {
    let s = dvGame.init(two);
    s = { ...s, pos: [5, 7] };
    s = roll(s, 'a', 2, 2); // ô 9 thuế đất
    expect(s.pot).toBe(20);
    expect(s.cash[0]).toBe(START_CASH - 20);
    s = roll(s, 'b', 2, 3); // 7 -> 12 hội đình
    expect(s.cash[1]).toBe(START_CASH + 20);
    expect(s.pot).toBe(0);
  });

  it('thiếu tiền thì bán đất cho ngân hàng, hết đất thì phá sản và ván kết thúc', () => {
    let s = dvGame.init(two);
    s = {
      ...s,
      cash: [10, 1000],
      turn: 0,
      lots: s.lots.map((l, i) => (i === 23 ? { owner: 1, level: 2 } : i === 1 ? { owner: 0, level: 0 } : l)),
      index: [100, 100, 100, 200],
      pos: [19, 0],
    };
    s = roll(s, 'a', 2, 2); // tới 23: thuê 220*2*2*0.2 = 176
    expect(s.lots[1]?.owner).toBeNull();
    expect(s.out[0]).toBe(true);
    expect(s.done).toBe(true);
    expect(s.winners).toEqual([1]);
  });

  it('hết số vòng thì kết thúc, người nhiều tài sản nhất thắng', () => {
    let s = dvGame.reduce(dvGame.init(two), { type: 'config', config: { rounds: '8' } }, ctx('a'));
    expect(s.rounds).toBe('8');
    s = { ...s, round: 8, turn: 1, cash: [500, 900] };
    s = dvGame.advance(s, ctx('a'));
    expect(s.done).toBe(true);
    expect(s.winners).toEqual([1]);
    expect(dvGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    const r = dvGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(r.done).toBe(false);
    expect(r.rounds).toBe('8');
  });

  it('sự kiện: mừng cưới thu tiền mỗi người, cò đất mở phòng công chứng giảm giá', () => {
    const list = players;
    let s = dvGame.init(list);
    s = applyEvent(s, 4, list);
    expect(s.cash).toEqual([START_CASH + 40, START_CASH - 20, START_CASH - 20]);
    expect(s.turn).toBe(1);
    s = applyEvent(s, 11, list);
    expect(s.phase).toBe('notary');
    expect(s.discount).toBe(30);
    const n = dvGame.reduce(s, { type: 'notary', pos: 23 }, ctx('b', list));
    expect(n.cash[1]).toBe(START_CASH - 20 - 154);
  });

  it('người phá sản bị bỏ qua khi tới lượt', () => {
    let s = dvGame.init(players);
    s = { ...s, out: [false, true, false] };
    s = roll(s, 'a', 6, 6, players); // tới 12 hội đình, không phải chọn
    expect(s.turn).toBe(2);
  });
});
