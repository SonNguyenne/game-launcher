import { describe, expect, it } from 'vitest';
import { canReact, trieuGame, type TrieuAction, type TrieuState } from './game';
import type { Role } from './strings';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
let clock = 1000;
const ctx = (from: string, host = from === 'a') => ({ from, players, host, now: clock });
const act = (s: TrieuState, from: string, a: TrieuAction) => trieuGame.reduce(s, a, ctx(from));

function setup(roles: Role[] = ['quanvan', 'votuong', 'ngusu'], over: Partial<TrieuState> = {}): TrieuState {
  return { ...trieuGame.init(players), roles, ...over };
}

describe('mưu triều: việc thường', () => {
  it('chia chức, tiền vốn, chỉ người tới lượt được làm', () => {
    const s = trieuGame.init(players);
    expect(s.roles).toHaveLength(3);
    expect(s.court).toHaveLength(12);
    expect(s.silver).toEqual([2, 2, 2]);
    expect(act(s, 'b', { type: 'act', kind: 'lamAn' })).toBe(s);
    const next = act(s, 'a', { type: 'act', kind: 'lamAn' });
    expect(next.silver[0]).toBe(3);
    expect(next.turn).toBe(1);
  });

  it('dâng lễ và vu cáo cần đủ bạc', () => {
    let s = setup();
    expect(act(s, 'a', { type: 'act', kind: 'dangLe' })).toBe(s);
    s = { ...s, silver: [4, 2, 2] };
    expect(act(s, 'a', { type: 'act', kind: 'vuCao' })).toBe(s);
    expect(act(s, 'a', { type: 'act', kind: 'vuCao', target: 0 })).toBe(s);
    s = act(s, 'a', { type: 'act', kind: 'vuCao', target: 2 });
    expect(s.crimes[2]).toBe(1);
    expect(s.silver[0]).toBe(0);
  });

  it('đổi chức: trả chức về triều, rút lá mới, che lại', () => {
    let s = setup(['quanvan', 'votuong', 'ngusu'], { revealed: [true, false, false] });
    s = act(s, 'a', { type: 'act', kind: 'doiChuc' });
    expect(s.revealed[0]).toBe(false);
    expect(s.silver[0]).toBe(1);
    expect(s.court).toHaveLength(12);
  });
});

describe('mưu triều: tấu, hặc, can', () => {
  it('không ai phản đối hoặc hết giờ thì việc tấu thi hành', () => {
    let s = act(setup(), 'a', { type: 'act', kind: 'dangSo' });
    expect(s.phase).toBe('claim');
    expect(act(s, 'a', { type: 'timeout' })).toBe(s);
    s = act(s, 'b', { type: 'pass' });
    expect(s.phase).toBe('claim');
    s = act(s, 'c', { type: 'pass' });
    expect(s.favor[0]).toBe(1);
    expect(s.phase).toBe('turn');

    let t = act(setup(), 'a', { type: 'act', kind: 'dangSo' });
    clock += 13_000;
    t = act(t, 'b', { type: 'timeout' });
    expect(t.favor[0]).toBe(1);
  });

  it('hặc trúng kẻ nói dối: kẻ dối chịu tội, người hặc +1 ân, việc bị hủy', () => {
    let s = act(setup(), 'a', { type: 'act', kind: 'thanhTra' }); // a là quan văn, nói dối
    expect(act(s, 'a', { type: 'challenge' })).toBe(s); // không tự hặc mình
    s = act(s, 'b', { type: 'challenge' });
    expect(s.crimes[0]).toBe(1);
    expect(s.favor[1]).toBe(1);
    expect(s.silver[0]).toBe(2);
    expect(s.turn).toBe(1);
  });

  it('hặc sai: người tấu lật chức minh oan, việc thi hành ngay, người hặc chịu tội', () => {
    let s = act(setup(), 'a', { type: 'act', kind: 'dangSo' });
    s = act(s, 'c', { type: 'challenge' });
    expect(s.revealed[0]).toBe(true);
    expect(s.favor[0]).toBe(2);
    expect(s.crimes[2]).toBe(1);
    expect(s.phase).toBe('turn');
  });

  it('can dâng sớ bằng ngự sử; ai cũng can được, lời can bị hặc được', () => {
    let s = act(setup(), 'a', { type: 'act', kind: 'dangSo' });
    expect(canReact(s, 1).block).toBe(true);
    s = act(s, 'b', { type: 'block' }); // b là võ tướng, can dối
    expect(s.phase).toBe('block');
    expect(s.blocker).toBe(1);
    expect(act(s, 'b', { type: 'challenge' })).toBe(s);
    s = act(s, 'a', { type: 'challenge' });
    expect(s.crimes[1]).toBe(1);
    expect(s.favor[0]).toBe(2); // +1 hặc trúng, +1 dâng sớ
  });

  it('can thật đứng vững thì việc tấu bị hủy', () => {
    let s = act(setup(), 'a', { type: 'act', kind: 'dangSo' });
    s = act(s, 'c', { type: 'block' }); // c là ngự sử thật
    s = act(s, 'a', { type: 'pass' });
    s = act(s, 'b', { type: 'pass' });
    expect(s.favor[0]).toBe(0);
    expect(s.turn).toBe(1);
  });

  it('uy hiếp: chỉ người bị nhắm mới can, người đó chọn nộp bạc hay chịu tội', () => {
    let s = setup(['quanvan', 'votuong', 'ngusu'], { turn: 1 });
    s = act(s, 'b', { type: 'act', kind: 'uyHiep', target: 2 });
    expect(canReact(s, 0).block).toBe(false);
    expect(canReact(s, 2).block).toBe(true);
    s = act(s, 'a', { type: 'pass' });
    s = act(s, 'c', { type: 'pass' });
    expect(s.phase).toBe('choose');
    expect(s.turn).toBe(2);
    expect(act(s, 'b', { type: 'choose', pay: true })).toBe(s);
    s = act(s, 'c', { type: 'choose', pay: true });
    expect(s.silver).toEqual([2, 4, 0]);
    expect(s.turn).toBe(2);
  });

  it('chơi 1 máy: chủ phòng bấm hộ người phản ứng bằng by', () => {
    let s = act(setup(), 'a', { type: 'act', kind: 'dangSo' });
    s = trieuGame.reduce(s, { type: 'challenge', by: 2 }, ctx('a', true));
    expect(s.crimes[2]).toBe(1);
    // khách thường gửi by thì bị bỏ qua, tính theo người gửi
    let t = act(setup(), 'a', { type: 'act', kind: 'dangSo' });
    t = trieuGame.reduce(t, { type: 'pass', by: 2 }, ctx('b', false));
    expect(t.passed).toEqual([false, true, false]);
  });
});

describe('mưu triều: thắng thua', () => {
  it('đủ 3 tội bị cách chức; còn một người thì người đó thắng', () => {
    let s = setup(['quanvan', 'votuong', 'ngusu'], { crimes: [0, 2, 2], silver: [8, 2, 2] });
    s = act(s, 'a', { type: 'act', kind: 'vuCao', target: 1 });
    expect(s.out[1]).toBe(true);
    expect(s.turn).toBe(2);
    s = act(s, 'c', { type: 'act', kind: 'lamAn' });
    expect(s.turn).toBe(0); // bỏ qua người đã bị cách chức
    s = act(s, 'a', { type: 'act', kind: 'vuCao', target: 2 });
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
  });

  it('đạt đủ ân thì thắng, chủ phòng mở ván mới', () => {
    let s = setup(['quanvan', 'votuong', 'ngusu'], { favor: [5, 0, 0] });
    s = act(s, 'a', { type: 'act', kind: 'dangSo' });
    s = act(s, 'b', { type: 'pass' });
    s = act(s, 'c', { type: 'pass' });
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
    expect(act(s, 'b', { type: 'restart' })).toBe(s);
    expect(act(s, 'a', { type: 'restart' }).phase).toBe('turn');
  });
});
