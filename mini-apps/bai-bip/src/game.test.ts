import { describe, expect, it } from 'vitest';
import { cardOf, type Card } from './cards';
import { baiBipGame, isLocalCtx, newGame, type BipAction, type BipState } from './game';

const RANK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT = ['♠', '♣', '♦', '♥'];
const c = (label: string): Card => cardOf(RANK.indexOf(label.slice(0, -1)), SUIT.indexOf(label.slice(-1)));
const cs = (labels: string) => labels.split(' ').map(c);

// Id dạng phòng (12 ký tự hex) để không bị coi là chơi 1 máy.
const online = ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc', 'dddddddddddd', 'eeeeeeeeeeee'].map((id) => ({ id, name: id[0].toUpperCase() }));
const [A, B, C] = online.map((p) => p.id);
const ctx = (from: string, now = 1000) => ({ from, players: online, host: from === A, now });
const run = (s: BipState, from: string, a: BipAction, now = 1000) => baiBipGame.reduce(s, a, ctx(from, now));

const three = online.slice(0, 3);
const start = (mode: 'sequence' | 'free' = 'sequence') =>
  newGame(three, { hands: [cs('A♠ A♣ 5♦'), cs('2♠ 9♥'), cs('3♠ K♦')], mode });

describe('chia bài', () => {
  it('chia hết 52 lá, tối đa 4 người ngồi', () => {
    const s = baiBipGame.init(online);
    expect(s.seats).toHaveLength(4);
    expect(s.hands.flat()).toHaveLength(52);
    expect(new Set(s.hands.flat()).size).toBe(52);
    expect(s.hands.map((h) => h.length)).toEqual([13, 13, 13, 13]);
    const s3 = baiBipGame.init(three);
    expect(s3.hands.map((h) => h.length)).toEqual([18, 17, 17]);
  });
});

describe('khai bài', () => {
  it('chỉ người tới lượt úp 1–4 lá có trên tay', () => {
    const s = start();
    expect(run(s, B, { type: 'play', cards: cs('2♠') })).toBe(s);
    expect(run(s, A, { type: 'play', cards: [] })).toBe(s);
    expect(run(s, A, { type: 'play', cards: cs('2♠') })).toBe(s);
    expect(run(s, A, { type: 'play', cards: [c('A♠'), c('A♠')] })).toBe(s);
    const t = run(s, A, { type: 'play', cards: cs('A♠ A♣') });
    expect(t.phase).toBe('window');
    expect(t.claim).toEqual({ seat: 0, rank: 0, cards: cs('A♠ A♣') });
    expect(t.pile).toHaveLength(2);
    expect(t.deadline).toBe(1000 + 5000);
    expect(t.hands[0]).toEqual(cs('5♦'));
  });

  it('chế độ lần lượt: hạng tăng A, 2, 3 sau mỗi lần khai', () => {
    let s = run(start(), A, { type: 'play', cards: cs('A♠') });
    s = run(s, B, { type: 'resolve' }, 7000);
    expect(s.rank).toBe(1);
    expect(s.turn).toBe(1);
    s = run(s, B, { type: 'play', cards: cs('9♥'), rank: 7 }); // rank bị bỏ qua
    expect(s.claim?.rank).toBe(1);
  });

  it('chế độ tự khai: phải chọn hạng hợp lệ', () => {
    const s = start('free');
    expect(run(s, A, { type: 'play', cards: cs('5♦') })).toBe(s);
    expect(run(s, A, { type: 'play', cards: cs('5♦'), rank: 13 })).toBe(s);
    expect(run(s, A, { type: 'play', cards: cs('5♦'), rank: 6 }).claim?.rank).toBe(6);
  });
});

describe('lật tẩy', () => {
  it('lật đúng: người khai ôm cả chồng', () => {
    let s = run(start(), A, { type: 'play', cards: cs('A♠') });
    s = run(s, B, { type: 'resolve' }, 7000);
    s = run(s, B, { type: 'play', cards: cs('9♥') }); // khai 2, thật là 9
    expect(run(s, B, { type: 'call' })).toBe(s); // người khai không tự lật
    s = run(s, C, { type: 'call' }, 2000);
    expect(s.reveal).toMatchObject({ claimer: 1, caller: 2, lie: true, taker: 1, taken: 2 });
    expect(s.hands[1].sort((x, y) => x - y)).toEqual(cs('A♠ 2♠ 9♥').sort((x, y) => x - y));
    expect(s.pile).toEqual([]);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(2);
    expect(s.rank).toBe(2);
  });

  it('lật sai: người lật tẩy ôm', () => {
    let s = run(start(), A, { type: 'play', cards: cs('A♠ A♣') });
    s = run(s, B, { type: 'call' });
    expect(s.reveal).toMatchObject({ lie: false, taker: 1 });
    expect(s.hands[1]).toHaveLength(4);
  });

  it('quá giờ không lật được; resolve trước giờ bị từ chối', () => {
    const s = run(start(), A, { type: 'play', cards: cs('A♠') });
    expect(run(s, B, { type: 'call' }, 6001)).toBe(s);
    expect(run(s, B, { type: 'resolve' }, 5000)).toBe(s);
    expect(run(s, B, { type: 'resolve' }, 6000).phase).toBe('play');
  });

  it('ai cũng bấm tin thì sang lượt ngay; đã tin thì không lật nữa', () => {
    let s = run(start(), A, { type: 'play', cards: cs('A♠') });
    s = run(s, B, { type: 'believe' });
    expect(s.phase).toBe('window');
    expect(run(s, B, { type: 'call' })).toBe(s);
    expect(run(s, B, { type: 'believe' })).toBe(s);
    s = run(s, C, { type: 'believe' });
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(1);
  });

  it('chơi phòng: trường as bị bỏ qua', () => {
    let s = run(start(), A, { type: 'play', cards: cs('A♠') });
    s = run(s, B, { type: 'call', as: C });
    expect(s.reveal?.caller).toBe(1);
  });

  it('chơi 1 máy: lật tẩy theo nút tên người', () => {
    const local = three.map((_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const lc = (now = 1000) => ({ from: 'p0', players: local, host: true, now });
    expect(isLocalCtx(lc())).toBe(true);
    expect(isLocalCtx(ctx(A))).toBe(false);
    let s = newGame(local, { hands: [cs('A♠ 5♦'), cs('2♠'), cs('3♠')] });
    s = baiBipGame.reduce(s, { type: 'play', cards: cs('5♦') }, lc());
    s = baiBipGame.reduce(s, { type: 'call', as: 'p2' }, lc());
    expect(s.reveal).toMatchObject({ caller: 2, lie: true, taker: 0 });
  });
});

describe('thắng', () => {
  it('úp lá cuối, không ai lật: thắng và cộng điểm; chủ phòng mở ván mới, người thắng đi trước', () => {
    let s = newGame(three, { hands: [cs('A♠'), cs('2♠ 3♠'), cs('4♠')] });
    s = run(s, A, { type: 'play', cards: cs('A♠') });
    s = run(s, B, { type: 'resolve' }, 9000);
    expect(s.phase).toBe('done');
    expect(s.winner).toBe(0);
    expect(s.wins[A]).toBe(1);
    expect(run(s, B, { type: 'play', cards: cs('2♠') })).toBe(s);
    expect(run(s, B, { type: 'restart' })).toBe(s);
    const r = run(s, A, { type: 'restart' });
    expect(r.phase).toBe('play');
    expect(r.turn).toBe(0);
    expect(r.wins[A]).toBe(1);
    expect(r.hands.flat()).toHaveLength(52);
  });

  it('úp lá cuối nhưng nói dối bị lật: không thắng, ôm bài', () => {
    let s = newGame(three, { hands: [cs('5♠'), cs('2♠ 3♠'), cs('4♠')] });
    s = run(s, A, { type: 'play', cards: cs('5♠') });
    s = run(s, C, { type: 'call' });
    expect(s.phase).toBe('play');
    expect(s.hands[0]).toEqual(cs('5♠'));
  });

  it('úp lá cuối, lật sai: người khai vẫn thắng', () => {
    let s = newGame(three, { hands: [cs('A♠'), cs('2♠ 3♠'), cs('4♠')] });
    s = run(s, A, { type: 'play', cards: cs('A♠') });
    s = run(s, C, { type: 'call' });
    expect(s.phase).toBe('done');
    expect(s.winner).toBe(0);
  });
});

describe('cài đặt và advance', () => {
  it('config chỉ chủ phòng, trước nước đầu', () => {
    const s = baiBipGame.init(three);
    expect(run(s, B, { type: 'config', config: { mode: 'free' } })).toBe(s);
    const t = run(s, A, { type: 'config', config: { mode: 'free', windowSec: '8' } });
    expect(t.mode).toBe('free');
    expect(t.windowSec).toBe('8');
    const played = run(t, A, { type: 'play', cards: [t.hands[0][0]], rank: 0 });
    expect(run(played, A, { type: 'config', config: { mode: 'sequence' } })).toBe(played);
  });

  it('advance: úp 1 lá thật khi tới lượt, chốt khi đang chờ', () => {
    const s = start();
    const t = baiBipGame.advance(s, ctx(A));
    expect(t.claim?.cards).toEqual(cs('A♠'));
    const u = baiBipGame.advance(t, ctx(A));
    expect(u.phase).toBe('play');
    expect(u.turn).toBe(1);
  });
});

describe('khởi tạo rỗng', () => {
  it('init([]) không lỗi (launcher dùng để lấy cài đặt mặc định)', () => {
    expect(baiBipGame.init([]).hands).toEqual([]);
  });
});
