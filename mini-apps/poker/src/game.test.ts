import { describe, expect, it } from 'vitest';
import { cardOf, fullDeck, type Card } from './cards';
import { bestHand, evaluate5 } from './hand';
import { blindsFor, buildPots, pokerGame, startHand, type PokerAction, type PokerState } from './game';

const RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT = ['s', 'h', 'd', 'c'];
// c('As') -> A bích; '10h' -> 10 cơ.
const c = (label: string): Card => cardOf(RANK.indexOf(label.slice(0, -1)), SUIT.indexOf(label.slice(-1)));
const cs = (labels: string) => labels.split(' ').map(c);
const cat = (labels: string) => bestHand(cs(labels)).category;
const score = (labels: string) => bestHand(cs(labels)).score;

describe('đánh giá tay bài', () => {
  it('nhận đủ 9 hạng', () => {
    expect(cat('10h Jh Qh Kh Ah 2c 3d')).toBe(8);
    expect(cat('9c 9d 9h 9s Kd 2c 3d')).toBe(7);
    expect(cat('9c 9d 9h Ks Kd 2c 3d')).toBe(6);
    expect(cat('2h 7h 9h Jh Kh 3c 3d')).toBe(5);
    expect(cat('5c 6d 7h 8s 9d Kc Kd')).toBe(4);
    expect(cat('7c 7d 7h Js 2d 4c 9d')).toBe(3);
    expect(cat('7c 7d Jh Js 2d 4c 9d')).toBe(2);
    expect(cat('7c 7d Jh Qs 2d 4c 9d')).toBe(1);
    expect(cat('7c 3d Jh Qs 2d 4c 9d')).toBe(0);
  });

  it('sảnh A-2-3-4-5 là sảnh nhỏ nhất, A cao thì là sảnh lớn nhất', () => {
    expect(cat('Ac 2d 3h 4s 5d Kc Kd')).toBe(4);
    expect(score('Ac 2d 3h 4s 5d')).toBeLessThan(score('2c 3d 4h 5s 6d'));
    expect(score('10c Jd Qh Ks Ad')).toBeGreaterThan(score('9c 10d Jh Qs Kd'));
    // Không vòng qua A: Q K A 2 3 không phải sảnh.
    expect(cat('Qc Kd Ah 2s 3d')).toBe(0);
    // Thùng phá sảnh A-5.
    expect(cat('Ah 2h 3h 4h 5h 9c 9d')).toBe(8);
    expect(score('Ah 2h 3h 4h 5h')).toBeLessThan(score('2s 3s 4s 5s 6s'));
  });

  it('thùng phá sảnh > tứ quý > cù lũ > thùng > sảnh > sám > thú > đôi > mậu thầu', () => {
    const order = [
      '7c 3d Jh Qs 2d',
      '7c 7d Jh Qs 2d',
      '7c 7d Jh Js 2d',
      '7c 7d 7h Js 2d',
      '5c 6d 7h 8s 9d',
      '2h 7h 9h Jh Kh',
      '9c 9d 9h Ks Kd',
      '9c 9d 9h 9s Kd',
      '5h 6h 7h 8h 9h',
    ].map((h) => evaluate5(cs(h)).score);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });

  it('so kicker', () => {
    // Cùng đôi A, kicker K thắng Q.
    expect(score('Ac Ad Kh 7s 3d')).toBeGreaterThan(score('As Ah Qh Js 9d'));
    // Thú: đôi cao trước, rồi đôi thấp, rồi lá lẻ.
    expect(score('Kc Kd 3h 3s Ad')).toBeGreaterThan(score('Qc Qd Jh Js Ad'));
    expect(score('Kc Kd 4h 4s 2d')).toBeGreaterThan(score('Ks Kh 3c 3d Ad'));
    expect(score('Kc Kd 4h 4s 5d')).toBeGreaterThan(score('Ks Kh 4c 4d 3d'));
    // Mậu thầu so lần lượt từng lá.
    expect(score('Ac Kd 9h 7s 3d')).toBeGreaterThan(score('As Kh 9c 7d 2d'));
    // Cù lũ: so bộ ba trước.
    expect(score('3c 3d 3h 2s 2d')).toBeGreaterThan(score('2c 2h 2s As Ad'));
    // Thùng: so lá cao nhất.
    expect(score('Ah 3h 5h 7h 9h')).toBeGreaterThan(score('Kd Qd Jd 9d 7d'));
    // Tứ quý bằng nhau so lá thứ 5.
    expect(score('9c 9d 9h 9s Kd 2c 3d')).toBe(score('9c 9d 9h 9s Kc 4c 5d'));
  });

  it('chọn 5 lá tốt nhất trong 7, hòa khi bài chung mạnh nhất', () => {
    const board = '10h Jh Qh Kh Ah';
    expect(score(`2c 3d ${board}`)).toBe(score(`4c 5d ${board}`));
    expect(bestHand(cs('Ac Ad Ah Ks Kd 2c 2d')).category).toBe(6);
    expect(score('Ac Ad Ah Ks Kd 2c 2d')).toBe(score('Ac Ad Ah Ks Kd'));
    // Thùng 6 lá: lấy 5 lá cao.
    expect(score('2h 4h 6h 8h 10h Qh 3c')).toBe(score('4h 6h 8h 10h Qh'));
  });
});

describe('pot phụ', () => {
  it('chia theo mức góp, người bỏ bài góp nhưng không ăn', () => {
    // A all-in 50, B 100, C 100 (C bỏ bài), D 30 all-in.
    const pots = buildPots([50, 100, 100, 30], [false, false, true, false]);
    expect(pots).toEqual([
      { amount: 120, eligible: [0, 1, 3] },
      { amount: 60, eligible: [0, 1] },
      { amount: 100, eligible: [1] },
    ]);
  });
});

const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, name: id.toUpperCase() }));
const ctxOf = (list: typeof players) => (from: string) => ({ from, players: list, host: from === 'a' });

/** Bộ bài cố định: các lá đầu theo thứ tự chia (từ người sau dealer, 2 vòng), rồi bài chung. */
function deckWith(first: string): Card[] {
  const head = cs(first);
  return [...head, ...fullDeck().filter((x) => !head.includes(x))];
}

function table(n: number, chips?: number[]) {
  const list = players.slice(0, n);
  const ctx = ctxOf(list);
  let s = pokerGame.init(list);
  if (chips) s = { ...s, chips: chips.map((x, i) => x + s.contrib[i]) };
  const run = (st: PokerState, from: string, a: PokerAction) => pokerGame.reduce(st, a, ctx(from));
  return { s, run, list };
}

describe('ván bài', () => {
  it('blind tăng theo cài đặt', () => {
    expect(blindsFor(1, '10')).toEqual({ sb: 10, bb: 20 });
    expect(blindsFor(11, '10')).toEqual({ sb: 15, bb: 30 });
    expect(blindsFor(6, '5')).toEqual({ sb: 15, bb: 30 });
    expect(blindsFor(100, 'off')).toEqual({ sb: 10, bb: 20 });
  });

  it('chỉ 6 người đầu được ngồi; đặt blind, người sau big blind nói trước', () => {
    const { s } = table(7);
    expect(s.seats).toHaveLength(6);
    expect(s.dealer).toBe(0);
    expect(s.sbSeat).toBe(1);
    expect(s.bbSeat).toBe(2);
    expect(s.bets.slice(0, 3)).toEqual([0, 10, 20]);
    expect(s.turn).toBe(3);
    expect(s.hole.every((h) => h.length === 2)).toBe(true);
  });

  it('hai người: dealer là small blind, nói trước preflop, nói sau postflop', () => {
    const { s, run } = table(2);
    expect(s.sbSeat).toBe(0);
    expect(s.bbSeat).toBe(1);
    expect(s.turn).toBe(0);
    let t = run(s, 'a', { type: 'call' });
    expect(t.turn).toBe(1);
    // BB còn quyền tố hoặc xem.
    t = run(t, 'b', { type: 'check' });
    expect(t.street).toBe('flop');
    expect(t.board).toHaveLength(3);
    expect(t.turn).toBe(1);
  });

  it('từ chối sai lượt, xem bài khi phải theo, tố dưới mức tối thiểu', () => {
    const { s, run } = table(3);
    expect(run(s, 'b', { type: 'call' })).toBe(s);
    expect(run(s, 'a', { type: 'check' })).toBe(s);
    expect(run(s, 'a', { type: 'raise', to: 30 })).toBe(s);
    expect(run(s, 'a', { type: 'raise', to: 99999 })).toBe(s);
    const r = run(s, 'a', { type: 'raise', to: 60 });
    expect(r.currentBet).toBe(60);
    expect(r.minRaise).toBe(40);
    expect(run(r, 'b', { type: 'raise', to: 90 })).toBe(r);
    expect(run(r, 'b', { type: 'raise', to: 100 }).currentBet).toBe(100);
  });

  it('mọi người bỏ bài: người còn lại ăn pot, không lật bài', () => {
    const { s, run } = table(3);
    let t = run(s, 'a', { type: 'fold' });
    t = run(t, 'b', { type: 'fold' });
    expect(t.phase).toBe('result');
    expect(t.chips).toEqual([1000, 990, 1010]);
    expect(t.showdown?.shown).toEqual([]);
    expect(t.showdown?.won[2]).toBe(30);
  });

  it('showdown: tay mạnh hơn ăn pot; ván tiếp dời dealer', () => {
    const list = players.slice(0, 2);
    const ctx = ctxOf(list);
    let s = pokerGame.init(list);
    // Dealer 0. Chia từ ghế 1: b1 a1 b2 a2, rồi 5 lá chung.
    s = startHand({ ...s, handNo: 0, dealer: 0, chips: [1000, 1000] }, deckWith('Kc As Kd Ad 2h 7c 9s Jd 3h'));
    const run = (st: PokerState, from: string, a: PokerAction) => pokerGame.reduce(st, a, ctx(from));
    s = run(s, 'a', { type: 'call' });
    s = run(s, 'b', { type: 'check' });
    for (let i = 0; i < 3; i++) {
      s = run(s, 'b', { type: 'check' });
      s = run(s, 'a', { type: 'check' });
    }
    expect(s.phase).toBe('result');
    expect(s.showdown?.hands).toEqual([1, 1]);
    expect(s.chips).toEqual([1020, 980]);
    expect(s.showdown?.shown).toEqual([0, 1]);
    const next = run(s, 'b', { type: 'deal' });
    expect(next.phase).toBe('bet');
    expect(next.dealer).toBe(1);
    expect(next.handNo).toBe(2);
  });

  it('hòa thì chia đôi pot, tiền lẻ cho người gần trái dealer', () => {
    const list = players.slice(0, 3);
    const ctx = ctxOf(list);
    const run = (st: PokerState, from: string, a: PokerAction) => pokerGame.reduce(st, a, ctx(from));
    let s = pokerGame.init(list);
    // Dealer 0, chia từ ghế 1: b c a b c a; bài chung là sảnh 10-A ai cũng có.
    s = startHand({ ...s, handNo: 0, dealer: 0, chips: [1000, 1000, 1000] }, deckWith('2c 3c 4c 2d 3d 4d 10h Jh Qs Kd Ac'));
    s = run(s, 'a', { type: 'call' });
    s = run(s, 'b', { type: 'fold' }); // b bỏ 10, pot 50
    s = run(s, 'c', { type: 'check' });
    for (let i = 0; i < 3; i++) {
      s = run(s, 'c', { type: 'check' });
      s = run(s, 'a', { type: 'check' });
    }
    expect(s.phase).toBe('result');
    expect(s.showdown?.pots).toEqual([{ amount: 50, winners: [2, 0] }]);
    expect(s.chips).toEqual([1005, 990, 1005].map((x, i) => (i === 2 ? x + 0 : x)));
    expect(s.chips[0] + s.chips[2]).toBe(2010);
    expect(s.chips[2]).toBe(1005);
  });

  it('all-in tạo pot phụ, lật hết bài chung; người hết chip bị loại; còn một người là xong', () => {
    const list = players.slice(0, 3);
    const ctx = ctxOf(list);
    const run = (st: PokerState, from: string, a: PokerAction) => pokerGame.reduce(st, a, ctx(from));
    let s = pokerGame.init(list);
    // Dealer 0: chia b c a b c a. a có AA, b có KK, c có QQ.
    s = startHand({ ...s, handNo: 0, dealer: 0, chips: [300, 100, 500] }, deckWith('Kc Qc Ac Kd Qd Ad 2h 7c 9s Jd 3h'));
    s = run(s, 'a', { type: 'allin' }); // a 300
    expect(s.currentBet).toBe(300);
    s = run(s, 'b', { type: 'allin' }); // b 100 (thiếu)
    s = run(s, 'c', { type: 'call' }); // c theo 300
    expect(s.phase).toBe('result');
    expect(s.board).toHaveLength(5);
    // Pot chính 300 (a, b, c), pot phụ 400 (a, c): a ăn hết.
    expect(s.showdown?.pots).toEqual([
      { amount: 300, winners: [0] },
      { amount: 400, winners: [0] },
    ]);
    expect(s.chips).toEqual([700, 0, 200]);
    expect(s.busted).toEqual([1]);
    const next = run(s, 'a', { type: 'deal' });
    expect(next.inHand).toEqual([true, false, true]);
    expect(next.hole[1]).toEqual([]);
  });

  it('còn một người có chip là thắng trận, chủ phòng chơi lại', () => {
    const list = players.slice(0, 2);
    const ctx = ctxOf(list);
    const run = (st: PokerState, from: string, a: PokerAction) => pokerGame.reduce(st, a, ctx(from));
    let s = pokerGame.init(list);
    s = startHand({ ...s, handNo: 0, dealer: 0, chips: [500, 500] }, deckWith('Kc Ac Kd Ad 2h 7c 9s Jd 3h'));
    s = run(s, 'a', { type: 'allin' });
    s = run(s, 'b', { type: 'call' });
    expect(s.phase).toBe('done');
    expect(s.chips).toEqual([1000, 0]);
    expect(run(s, 'b', { type: 'restart' })).toBe(s);
    const again = run(s, 'a', { type: 'restart' });
    expect(again.phase).toBe('bet');
    expect(again.chips[0] + again.chips[1] + again.contrib[0] + again.contrib[1]).toBe(2000);
  });

  it('all-in tố thiếu không mở lại quyền tố cho người đã nói', () => {
    const list = players.slice(0, 3);
    const ctx = ctxOf(list);
    const run = (st: PokerState, from: string, a: PokerAction) => pokerGame.reduce(st, a, ctx(from));
    let s = pokerGame.init(list);
    s = startHand({ ...s, handNo: 0, dealer: 0, chips: [1000, 1000, 1000] }, fullDeck());
    s = run(s, 'a', { type: 'call' });
    s = run(s, 'b', { type: 'call' });
    s = run(s, 'c', { type: 'check' }); // flop, b nói trước
    s = run(s, 'b', { type: 'raise', to: 100 });
    s = { ...s, chips: [s.chips[0], s.chips[1], 30] }; // c chỉ còn 30
    s = run(s, 'c', { type: 'allin' }); // tố thiếu? Không: c chỉ đủ theo 30 < 100
    expect(s.allIn[2]).toBe(true);
    s = run(s, 'a', { type: 'call' });
    expect(s.street).toBe('turn');
  });

  it('config chỉ chủ phòng, trước khi chơi', () => {
    const { s, run } = table(2);
    expect(run(s, 'b', { type: 'config', config: { startChips: '2000' } })).toBe(s);
    const t = run(s, 'a', { type: 'config', config: { startChips: '2000', blindUp: 'off' } });
    expect(t.chips[0] + t.bets[0] + t.chips[1] + t.bets[1]).toBe(4000);
    expect(t.blindUp).toBe('off');
    const moved = run(t, 'a', { type: 'call' });
    expect(run(moved, 'a', { type: 'config', config: { startChips: '500' } })).toBe(moved);
  });

  it('advance: xem nếu được, không thì bỏ bài', () => {
    const { s } = table(3);
    const c = ctxOf(players.slice(0, 3))('a');
    const t = pokerGame.advance(s, c);
    expect(t.folded[0]).toBe(true);
  });
});
