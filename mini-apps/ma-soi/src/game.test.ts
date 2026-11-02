import { describe, expect, it } from 'vitest';
import { cleanConfig, defaultConfig, roleCounts, wolfGame, winnerOf, type WolfAction, type WolfState } from './game';
import type { Role } from './strings';

const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
let clock = 1000;
const ctx = (from: string, host = from === 'p0') => ({ from, players, host, now: clock });
const act = (s: WolfState, from: string, a: WolfAction) => wolfGame.reduce(s, a, ctx(from));

/** Ván 8 người với vai cố định: p0 sói, p1 sói, p2 tiên tri, p3 bảo vệ, p4 phù thủy, p5 thợ săn, p6 p7 dân. */
const ROLES: Role[] = ['soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'dan', 'dan'];
function fixed(roles: Role[] = ROLES): WolfState {
  const s = wolfGame.init(players.slice(0, roles.length));
  return { ...s, roles };
}
function allReady(s: WolfState) {
  return s.seats.reduce((st, id) => act(st, id, { type: 'ready' }), s);
}

describe('chia vai', () => {
  it('gợi ý theo số người, sói luôn ít hơn nửa', () => {
    const c5 = roleCounts(5, defaultConfig);
    expect(c5.soi).toBe(1);
    expect(c5.tientri).toBe(1);
    expect(Object.values(c5).reduce((a, b) => a + b)).toBe(5);
    const c10 = roleCounts(10, defaultConfig);
    expect(c10.soi).toBe(3);
    expect(c10.thosan).toBe(1);
    const tooMany = roleCounts(5, cleanConfig({ wolves: '4' }));
    expect(tooMany.soi).toBe(2);
  });

  it('dưới 5 người thì không chơi', () => {
    const s = wolfGame.init(players.slice(0, 4));
    expect(s.phase).toBe('few');
  });

  it('hơn 12 người thì 12 người đầu chơi', () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ id: `x${i}`, name: `X${i}` }));
    const s = wolfGame.init(many);
    expect(s.seats).toHaveLength(12);
    expect(s.roles).toHaveLength(12);
  });
});

describe('một đêm', () => {
  it('nhận vai xong thì vào đêm, bảo vệ đi trước', () => {
    let s = fixed();
    expect(act(s, 'p0', { type: 'ready' }).ready[0]).toBe(true);
    s = allReady(s);
    expect(s.phase).toBe('night');
    expect(s.step).toBe('baove');
    expect(s.turn).toBe(3);
  });

  it('chỉ đúng vai được hành động, sói không cắn đồng bọn', () => {
    let s = allReady(fixed());
    expect(act(s, 'p6', { type: 'guard', target: 6 })).toBe(s);
    s = act(s, 'p3', { type: 'guard', target: 6 });
    expect(s.step).toBe('soi');
    expect(act(s, 'p0', { type: 'bite', target: 1 })).toBe(s);
    expect(act(s, 'p2', { type: 'bite', target: 6 })).toBe(s);
    s = act(s, 'p0', { type: 'bite', target: 7 });
    expect(s.step).toBe('soi');
    expect(s.turn).toBe(1);
    s = act(s, 'p1', { type: 'bite', target: 7 });
    expect(s.step).toBe('tientri');
    expect(s.victim).toBe(7);
  });

  it('tiên tri soi được sói, phù thủy cứu, đêm bình yên', () => {
    let s = allReady(fixed());
    s = act(s, 'p3', { type: 'guard', target: 3 });
    s = act(s, 'p0', { type: 'bite', target: 6 });
    s = act(s, 'p1', { type: 'bite', target: 6 });
    expect(act(s, 'p2', { type: 'done' })).toBe(s);
    s = act(s, 'p2', { type: 'peek', target: 1 });
    expect(s.seen[0]).toEqual({ night: 1, target: 1, wolf: true });
    expect(act(s, 'p2', { type: 'peek', target: 0 })).toBe(s);
    s = act(s, 'p2', { type: 'done' });
    expect(s.step).toBe('phuthuy');
    // không được dùng cả hai bình một đêm
    expect(act(s, 'p4', { type: 'witch', save: true, poison: 0 })).toBe(s);
    s = act(s, 'p4', { type: 'witch', save: true, poison: null });
    expect(s.phase).toBe('day');
    expect(s.deaths).toEqual([]);
    expect(s.heal).toBe(false);
  });

  it('bảo vệ che đúng người bị cắn thì người đó sống, đêm sau không che lại được', () => {
    let s = allReady(fixed());
    s = act(s, 'p3', { type: 'guard', target: 6 });
    s = act(s, 'p0', { type: 'bite', target: 6 });
    s = act(s, 'p1', { type: 'bite', target: 6 });
    s = act(s, 'p2', { type: 'peek', target: 6 });
    s = act(s, 'p2', { type: 'done' });
    s = act(s, 'p4', { type: 'witch', save: false, poison: null });
    expect(s.alive[6]).toBe(true);
    expect(s.lastGuard).toBe(6);
    s = act(s, 'p0', { type: 'startVote' });
    s = s.seats.reduce((st, id) => act(st, id, { type: 'vote', target: -1 }), s);
    expect(s.phase).toBe('verdict');
    expect(s.hanged).toBe(-1);
    s = act(s, 'p0', { type: 'continue' });
    expect(s.phase).toBe('night');
    expect(act(s, 'p3', { type: 'guard', target: 6 })).toBe(s);
  });

  it('phù thủy đầu độc, thợ săn chết được bắn', () => {
    let s = allReady(fixed());
    s = act(s, 'p3', { type: 'guard', target: 3 });
    s = act(s, 'p0', { type: 'bite', target: 5 });
    s = act(s, 'p1', { type: 'bite', target: 5 });
    s = act(s, 'p2', { type: 'peek', target: 0 });
    s = act(s, 'p2', { type: 'done' });
    s = act(s, 'p4', { type: 'witch', save: false, poison: 7 });
    expect(s.deaths.sort()).toEqual([5, 7]);
    expect(s.phase).toBe('hunter');
    expect(act(s, 'p0', { type: 'shoot', target: 1 })).toBe(s);
    s = act(s, 'p5', { type: 'shoot', target: 1 });
    expect(s.alive[1]).toBe(false);
    expect(s.phase).toBe('day');
  });

  it('vai đã chết vẫn được gọi giả, hết giờ mới qua', () => {
    let s = allReady(fixed());
    s = { ...s, alive: s.alive.map((a, i) => (i === 2 ? false : a)) };
    s = act(s, 'p3', { type: 'guard', target: 3 });
    s = act(s, 'p0', { type: 'bite', target: 6 });
    s = act(s, 'p1', { type: 'bite', target: 6 });
    expect(s.step).toBe('tientri');
    expect(s.deadline).toBeGreaterThan(clock);
    expect(act(s, 'p0', { type: 'tick' })).toBe(s);
    clock += 10_000;
    s = act(s, 'p0', { type: 'tick' });
    expect(s.step).toBe('phuthuy');
  });
});

describe('ban ngày', () => {
  function toDay() {
    let s = allReady(fixed());
    s = act(s, 'p3', { type: 'guard', target: 3 });
    s = act(s, 'p0', { type: 'bite', target: 6 });
    s = act(s, 'p1', { type: 'bite', target: 6 });
    s = act(s, 'p2', { type: 'peek', target: 0 });
    s = act(s, 'p2', { type: 'done' });
    return act(s, 'p4', { type: 'witch', save: false, poison: null });
  }

  it('hết giờ thảo luận thì sang bỏ phiếu, người chết không bỏ phiếu', () => {
    let s = toDay();
    expect(s.phase).toBe('day');
    expect(s.alive[6]).toBe(false);
    expect(act(s, 'p0', { type: 'tick' })).toBe(s);
    clock += Number(s.talk) * 1000 + 1;
    s = act(s, 'p2', { type: 'tick' });
    expect(s.phase).toBe('vote');
    expect(act(s, 'p6', { type: 'vote', target: 0 })).toBe(s);
    expect(act(s, 'p2', { type: 'vote', target: 2 })).toBe(s);
    expect(act(s, 'p2', { type: 'vote', target: 6 })).toBe(s);
  });

  it('phiếu nhiều nhất bị treo; hòa phiếu không ai chết', () => {
    let s = act(toDay(), 'p0', { type: 'startVote' });
    const plan: [string, number][] = [['p0', 2], ['p1', 2], ['p2', 0], ['p3', 0], ['p4', 1], ['p5', -1], ['p7', -1]];
    const tie = plan.reduce((st, [id, t]) => act(st, id, { type: 'vote', target: t }), s);
    expect(tie.phase).toBe('verdict');
    expect(tie.hanged).toBe(-1);

    s = plan.map(([id, t]): [string, number] => [id, id === 'p4' ? 0 : t]).reduce((st, [id, t]) => act(st, id, { type: 'vote', target: t }), s);
    expect(s.hanged).toBe(0);
    expect(s.alive[0]).toBe(false);
  });

  it('chủ phòng chốt phiếu sớm, ai chưa bỏ coi như không bỏ', () => {
    let s = act(toDay(), 'p0', { type: 'startVote' });
    s = act(s, 'p2', { type: 'vote', target: 0 });
    expect(act(s, 'p2', { type: 'closeVote' })).toBe(s);
    s = act(s, 'p0', { type: 'closeVote' });
    expect(s.hanged).toBe(0);
  });
});

describe('thắng thua', () => {
  it('hết sói thì dân thắng, sói bằng dân thì sói thắng', () => {
    expect(winnerOf({ roles: ROLES, alive: [false, false, true, true, true, true, true, true] })).toBe('village');
    expect(winnerOf({ roles: ROLES, alive: [true, true, true, true, false, false, false, false] })).toBe('wolf');
    expect(winnerOf({ roles: ROLES, alive: ROLES.map(() => true) })).toBeNull();
  });

  it('treo con sói cuối thì hết ván, chủ phòng mở ván mới', () => {
    let s = fixed(['soi', 'dan', 'dan', 'dan', 'tientri']);
    s = allReady(s);
    s = act(s, 'p0', { type: 'bite', target: 1 });
    s = act(s, 'p4', { type: 'peek', target: 0 });
    s = act(s, 'p4', { type: 'done' });
    expect(s.phase).toBe('day');
    s = act(s, 'p0', { type: 'startVote' });
    for (const id of ['p0', 'p2', 'p3', 'p4']) s = act(s, id, { type: 'vote', target: id === 'p0' ? 2 : 0 });
    expect(s.phase).toBe('verdict');
    s = act(s, 'p2', { type: 'continue' });
    expect(s.phase).toBe('over');
    expect(s.winner).toBe('village');
    expect(act(s, 'p2', { type: 'restart' })).toBe(s);
    s = act(s, 'p0', { type: 'restart' });
    expect(s.phase).toBe('reveal');
  });
});
