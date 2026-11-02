import { beforeAll, describe, expect, it } from 'vitest';
import { canon, candidates, checkWord, loadDictionary, noiTuGame, type NoiTuState } from './game';
import { WORDS } from './words';

const p = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i), name: String.fromCharCode(65 + i) }));
const T0 = 1_000_000;
const ctx = (from: string, n = 3, now = T0) => ({ from, players: p(n), host: from === 'a', now });

function start(n = 3, config: Partial<NoiTuState> = {}): NoiTuState {
  return noiTuGame.reduce(noiTuGame.init(p(n)), { type: 'config', config }, ctx('a', n));
}
const say = (s: NoiTuState, from: string, word: string, n = 3, now = T0) => noiTuGame.reduce(s, { type: 'say', word }, ctx(from, n, now));

beforeAll(() => loadDictionary(WORDS));

describe('nối từ: từ điển và chuẩn hóa', () => {
  it('từ điển có vài nghìn từ 2 tiếng', () => {
    expect(WORDS.length).toBeGreaterThan(3000);
    expect(WORDS.every((w) => w.split(' ').length === 2)).toBe(true);
  });

  it('bỏ qua hoa thường, chuẩn hóa NFC và chỗ đặt dấu', () => {
    expect(canon('  HỌC   Sinh ')).toBe('học sinh');
    // "ọ" viết dạng tổ hợp (o + dấu nặng + ...) vẫn khớp.
    expect(canon('học sinh')).toBe('học sinh');
    expect(canon('hoà bình')).toBe(canon('hòa bình'));
    expect(canon('thuỷ thủ')).toBe(canon('thủy thủ'));
    expect(canon('quý báu')).toBe('quý báu');
  });

  it('kiểm tra từ: đúng 2 tiếng, nối đúng, chưa dùng, có trong từ điển', () => {
    const s = { chain: [{ word: 'học sinh', seat: 0 }], check: 'dict' as const };
    expect(checkWord(s, 'sinh viên')).toEqual({ ok: true, word: 'sinh viên', known: true });
    expect(checkWord(s, 'Sinh Viên')).toMatchObject({ ok: true });
    expect(checkWord(s, 'sinh')).toEqual({ ok: false, reason: 'syllables' });
    expect(checkWord(s, 'sinh viên mới')).toEqual({ ok: false, reason: 'syllables' });
    expect(checkWord(s, 'sinh 2')).toEqual({ ok: false, reason: 'syllables' });
    expect(checkWord(s, 'viên chức')).toEqual({ ok: false, reason: 'link' });
    expect(checkWord({ ...s, chain: [{ word: 'sinh viên', seat: 0 }, { word: 'viên sinh', seat: 1 }] }, 'sinh viên')).toEqual({ ok: false, reason: 'used' });
    expect(checkWord(s, 'sinh xyz')).toEqual({ ok: false, reason: 'unknown' });
    expect(checkWord({ ...s, check: 'vote' }, 'sinh xyz')).toEqual({ ok: true, word: 'sinh xyz', known: false });
  });
});

describe('nối từ: lượt chơi', () => {
  it('bắt đầu: tính giờ theo giờ phòng, ghế đầu mở màn', () => {
    const s = start(3, { seconds: '10' });
    expect(s.deadline).toBe(T0 + 10_000);
    expect(s.turn).toBe(0);
    expect(s.hints).toEqual({ a: 3, b: 3, c: 3 });
  });

  it('nói đúng thì chuyển lượt và đặt lại đồng hồ; sai luật hay sai lượt thì bỏ qua', () => {
    let s = start();
    expect(say(s, 'b', 'học sinh')).toBe(s);
    s = say(s, 'a', 'học sinh', 3, T0 + 3000);
    expect(s.chain).toEqual([{ word: 'học sinh', seat: 0 }]);
    expect(s.turn).toBe(1);
    expect(s.deadline).toBe(T0 + 3000 + 15_000);
    expect(say(s, 'b', 'viên chức')).toBe(s);
    expect(say(s, 'b', 'học sinh')).toBe(s);
    s = say(s, 'b', 'Sinh Viên');
    expect(s.chain.at(-1)?.word).toBe('sinh viên');
    expect(s.turn).toBe(2);
  });

  it('hết giờ thì bị loại; còn 1 người thì thắng', () => {
    let s = start(3);
    // Chưa hết giờ: bỏ qua
    expect(noiTuGame.reduce(s, { type: 'timeout' }, ctx('b', 3, T0 + 1000))).toBe(s);
    s = noiTuGame.reduce(s, { type: 'timeout' }, ctx('b', 3, T0 + 15_000));
    expect(s.alive).toEqual([false, true, true]);
    expect(s.turn).toBe(1);
    expect(s.event).toMatchObject({ kind: 'out', seat: 0 });
    // Người bị loại không nói được nữa
    expect(say(s, 'a', 'học sinh', 3, T0 + 16_000)).toBe(s);
    s = say(s, 'b', 'học sinh', 3, T0 + 16_000);
    expect(s.turn).toBe(2);
    s = noiTuGame.reduce(s, { type: 'timeout' }, ctx('b', 3, T0 + 16_000 + 15_000));
    expect(s.done).toBe(true);
    expect(s.winner).toBe(1);
    expect(s.wins.b).toBe(1);
    expect(say(s, 'b', 'sinh viên')).toBe(s);
    // Ván mới: người thắng mở màn, giữ số ván thắng
    expect(noiTuGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    const r = noiTuGame.reduce(s, { type: 'restart' }, ctx('a', 3, T0 + 99_000));
    expect(r.turn).toBe(1);
    expect(r.alive).toEqual([true, true, true]);
    expect(r.wins.b).toBe(1);
  });

  it('chủ phòng bỏ lượt người mất kết nối thì loại người đó', () => {
    const s = start(3);
    const next = noiTuGame.advance(s, ctx('a'));
    expect(next.alive[0]).toBe(false);
  });
});

describe('nối từ: bỏ phiếu từ lạ', () => {
  it('chế độ chỉ từ điển: từ lạ bị từ chối', () => {
    const s = start(3, { check: 'dict' });
    expect(say(s, 'a', 'xyz abc')).toBe(s);
  });

  it('từ lạ mở phiếu, đồng hồ dừng; đa số "được" thì nhận từ', () => {
    let s = start(3);
    s = say(s, 'a', 'học sinh', 3, T0 + 1000);
    s = say(s, 'b', 'sinh xyz', 3, T0 + 5000);
    expect(s.vote).toMatchObject({ word: 'sinh xyz', seat: 1, voters: ['a', 'c'] });
    expect(s.vote?.remaining).toBe(1000 + 15_000 - 5000);
    // Lượt chỉ vào người bỏ phiếu đầu tiên (chơi 1 máy chuyền máy)
    expect(s.turn).toBe(0);
    // Hết giờ không áp dụng khi đang bỏ phiếu; người nói không được tự bỏ phiếu
    expect(noiTuGame.reduce(s, { type: 'timeout' }, ctx('a', 3, T0 + 999_000))).toBe(s);
    expect(noiTuGame.reduce(s, { type: 'vote', accept: true }, ctx('b'))).toBe(s);
    // 1/2 được: hòa phiếu tính là được
    s = noiTuGame.reduce(s, { type: 'vote', accept: true }, ctx('a', 3, T0 + 8000));
    expect(s.vote).toBeNull();
    expect(s.chain.at(-1)).toEqual({ word: 'sinh xyz', seat: 1 });
    expect(s.turn).toBe(2);
    expect(s.event).toMatchObject({ kind: 'accepted', word: 'sinh xyz' });
  });

  it('đa số "không" thì bác, người nói đi lại với thời gian còn lại', () => {
    let s = start(4);
    s = say(s, 'a', 'xyz abc', 4, T0 + 2000);
    expect(s.vote?.voters).toEqual(['b', 'c', 'd']);
    s = noiTuGame.reduce(s, { type: 'vote', accept: false }, ctx('b', 4));
    expect(s.vote?.votes).toEqual({ b: false });
    expect(s.turn).toBe(2);
    // Bỏ phiếu hai lần không được
    expect(noiTuGame.reduce(s, { type: 'vote', accept: false }, ctx('b', 4))).toBe(s);
    s = noiTuGame.reduce(s, { type: 'vote', accept: false }, ctx('c', 4, T0 + 9000));
    expect(s.vote).toBeNull();
    expect(s.chain).toHaveLength(0);
    expect(s.turn).toBe(0);
    expect(s.deadline).toBe(T0 + 9000 + 13_000);
    expect(s.event).toMatchObject({ kind: 'rejected', word: 'xyz abc' });
  });
});

describe('nối từ: gợi ý', () => {
  it('gợi ý lấy từ trong từ điển nối được, giới hạn số lần', () => {
    let s = start(2);
    s = say(s, 'a', 'học sinh', 2);
    for (let i = 0; i < 3; i++) {
      s = noiTuGame.reduce(s, { type: 'hint' }, ctx('b', 2));
      expect(s.hint?.seat).toBe(1);
      expect(s.hint?.word.startsWith('sinh ')).toBe(true);
      expect(candidates(s)).toContain(s.hint?.word);
    }
    expect(s.hints.b).toBe(0);
    expect(noiTuGame.reduce(s, { type: 'hint' }, ctx('b', 2))).toBe(s);
    // Không phải lượt mình thì không gợi ý
    expect(noiTuGame.reduce(s, { type: 'hint' }, ctx('a', 2))).toBe(s);
  });
});
