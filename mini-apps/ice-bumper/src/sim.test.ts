import { describe, expect, it } from 'vitest';
import { BALL_MIN, ICE_R, SCALE, SLIP, STEP, arenaOf, closestToCenter, decode, encode, lobPath, spawn, step, type Input } from './sim';
import { MAP_IDS, MAPS, onIce, spawnPoint } from './maps';
import { iceBumperGame } from './game';

const slick = arenaOf('floe', 1, 0.9);

const run = (n: number, f: () => void) => {
  for (let i = 0; i < n; i++) f();
};

describe('vật lý snowar', () => {
  it('lái thì chạy và cầu tuyết to dần; không lái thì trôi chậm lại', () => {
    const w = spawn(['a', 'b'], 0, slick);
    const a = w.bodies.a;
    const inputs: Record<string, Input> = { a: { angle: 0, shots: 0 } };
    const x0 = a.x;
    run(60, () => step(w, inputs, true));
    expect(a.x).toBeGreaterThan(x0 + 50);
    expect(a.ball).toBeGreaterThan(BALL_MIN);
    const speed = Math.hypot(a.vx, a.vy);
    run(60, () => step(w, { a: { angle: null, shots: 0 } }, true));
    expect(Math.hypot(a.vx, a.vy)).toBeLessThan(speed);
  });

  it('trượt khỏi mép băng là rơi', () => {
    const w = spawn(['a', 'b'], 0, slick);
    Object.assign(w.bodies.a, { x: ICE_R - 1, y: 0, vx: 200 });
    const events = [];
    for (let i = 0; i < 10; i++) events.push(...step(w, {}, true));
    expect(w.bodies.a.alive).toBe(false);
    expect(events.some((e) => e.type === 'fall' && e.id === 'a')).toBe(true);
  });

  it('bắn thẳng: cầu to bay chậm hơn để còn né được, người giật lùi nhẹ; trúng thì đẩy người kia và ghi ai đẩy', () => {
    const launch = (r: number) => {
      const w = spawn(['a', 'b'], 0, arenaOf('floe', 1, 0.35));
      Object.assign(w.bodies.a, { x: 0, y: 0, face: 0, ball: r, vx: 0 });
      Object.assign(w.bodies.b, { x: 0, y: 200 });
      step(w, { a: { angle: null, shots: 1 } }, true);
      return { speed: Math.hypot(w.shots[0].vx, w.shots[0].vz), recoil: -w.bodies.a.vx };
    };
    const small = launch(12);
    const big = launch(80);
    expect(small.speed).toBeGreaterThan(450);
    expect(big.speed).toBeLessThan(small.speed * 0.6);
    expect(big.speed).toBeGreaterThan(250);
    expect(big.recoil).toBeLessThan(60);

    const w = spawn(['a', 'b'], 0, arenaOf('floe', 1.5, 0.5));
    Object.assign(w.bodies.a, { x: -100, y: 0, face: 0, ball: 30, vx: 50, vy: 0 });
    Object.assign(w.bodies.b, { x: 80, y: 0 });
    run(30, () => step(w, { a: { angle: null, shots: 1 } }, true));
    // Bị trúng thì văng ra rồi ma sát làm dừng: xét quãng đã bị đẩy đi.
    expect(w.bodies.b.x).toBeGreaterThan(80 + 5);
    expect(w.bodies.b.hitBy).toBe('a');
  });

  it('bắn sát người: cầu không vỡ mất, người bị đẩy văng ra', () => {
    const w = spawn(['a', 'b'], 0, arenaOf('floe', 1, 0.35));
    Object.assign(w.bodies.a, { x: -60, y: 0, face: 0, ball: 30 });
    // Người kia đứng ngay trước cầu đang đẩy.
    Object.assign(w.bodies.b, { x: 30, y: 0 });
    let maxV = 0;
    step(w, { a: { angle: null, shots: 1, lob: 0 } }, true);
    for (let i = 0; i < 5; i++) {
      step(w, {}, true);
      maxV = Math.max(maxV, w.bodies.b.vx);
    }
    expect(w.shots).toHaveLength(1);
    expect(maxV).toBeGreaterThan(100);
  });

  it('cầu càng to bắn trúng càng đẩy văng xa', () => {
    const pushed = (r: number) => {
      const w = spawn(['a', 'b'], 0, arenaOf('floe', 1.5, 0.35));
      Object.assign(w.bodies.a, { x: -150, y: 0, face: 0, ball: r });
      Object.assign(w.bodies.b, { x: 30, y: 0 });
      run(60, () => step(w, { a: { angle: null, shots: 1 } }, true));
      return w.bodies.b.x - 30;
    };
    expect(pushed(60)).toBeGreaterThan(pushed(15) * 3);
  });

  it('chưa vào hiệp (đếm ngược) thì không lái được', () => {
    const w = spawn(['a'], 0, slick);
    run(30, () => step(w, { a: { angle: 0, shots: 0 } }, false));
    expect(Math.hypot(w.bodies.a.vx, w.bodies.a.vy)).toBe(0);
  });

  it('hết giờ: người còn trên băng đứng gần tâm nhất thắng', () => {
    const w = spawn(['a', 'b', 'c'], 0, slick);
    Object.assign(w.bodies.a, { x: 100, y: 0 });
    Object.assign(w.bodies.b, { x: 30, y: 10 });
    Object.assign(w.bodies.c, { x: 0, y: 0, alive: false });
    expect(closestToCenter(w, ['a', 'b', 'c'])).toBe('b');
    expect(closestToCenter(w, [])).toBeNull();
  });

  it('ảnh chụp mã hóa rồi giải mã giữ nguyên thế giới (làm tròn)', () => {
    const w = spawn(['a', 'b'], 1234, slick);
    run(20, () => step(w, { a: { angle: 1, shots: 0 } }, true));
    const back = decode(JSON.parse(JSON.stringify(encode(w, {}))), slick);
    expect(back.bodies.a.x).toBeCloseTo(w.bodies.a.x, 0);
    expect(back.t).toBe(Math.round(w.t));
    expect(Math.abs(back.t - (1234 + 20 * STEP * 1000))).toBeLessThan(1);
  });
});

describe('cầu tuyết', () => {
  it('lăn lâu thì cầu lớn mãi (vượt cỡ cũ 28), nhưng có giới hạn theo sân', () => {
    const w = spawn(['a'], 0, arenaOf('floe', 1.5, 0.5));
    const a = w.bodies.a;
    // Chạy vòng tròn quanh tâm để không rơi.
    for (let i = 0; i < 60 * 40; i++) {
      Object.assign(a, { x: 0, y: 0 });
      step(w, { a: { angle: (i / 60) % (Math.PI * 2), shots: 0 } }, true);
    }
    expect(a.ball).toBeGreaterThan(40);
    expect(a.ball).toBeLessThanOrEqual(w.arena.R * 0.35);
  });

  it('lấy đà bắn cầu to thì đẩy lùi được cả người đang lao tới; cầu nhỏ thì không', () => {
    const knock = (r: number) => {
      const w = spawn(['a', 'b'], 0, arenaOf('floe', 1.5, 0.5));
      Object.assign(w.bodies.a, { x: -150, y: 0, face: 0, ball: r, vx: 200 });
      Object.assign(w.bodies.b, { x: 30, y: 0, vx: -200 });
      const inputs: Record<string, Input> = { a: { angle: null, shots: 1 }, b: { angle: Math.PI, shots: 0 } };
      step(w, inputs, true);
      for (let i = 0; i < 40 && w.shots.length; i++) step(w, inputs, true);
      return w.bodies.b.vx;
    };
    expect(knock(15)).toBeLessThan(0);
    expect(knock(80)).toBeGreaterThan(50);
  });

  it('cần lái analog: kéo nhẹ đi chậm, kéo hết chạy nhanh', () => {
    const speed = (power: number) => {
      const w = spawn(['a'], 0, arenaOf('floe', 1.5, 0.35));
      Object.assign(w.bodies.a, { x: 0, y: 0, face: 0, ball: BALL_MIN });
      run(90, () => step(w, { a: { angle: 0, power, shots: 0 } }, true));
      return w.bodies.a.vx;
    };
    expect(speed(0.3)).toBeLessThan(speed(1) * 0.5);
  });

  it('đẩy cầu càng nặng càng tăng tốc chậm', () => {
    const speedAfter = (r: number) => {
      const w = spawn(['a'], 0, arenaOf('floe', 1.5, 0.5));
      Object.assign(w.bodies.a, { x: 0, y: 0, face: 0, ball: r });
      run(15, () => step(w, { a: { angle: 0, shots: 0 } }, true));
      return w.bodies.a.vx;
    };
    expect(speedAfter(60)).toBeLessThan(speedAfter(BALL_MIN) * 0.5);
  });

  it('cầu lớn theo quãng đường lăn', () => {
    const w = spawn(['a'], 0, arenaOf('floe', 1.5, 0.5));
    Object.assign(w.bodies.a, { x: -200, y: 0, face: 0, ball: 10 });
    const x0 = w.bodies.a.x;
    run(60, () => step(w, { a: { angle: 0, shots: 0 } }, true));
    const rolled = w.bodies.a.x - x0;
    expect(w.bodies.a.ball - 10).toBeCloseTo(rolled * 0.032, 0);
  });

  it('cầu to chìa ra mép kéo cả người rơi (trọng tâm ra khỏi băng)', () => {
    const fallsWith = (r: number) => {
      const w = spawn(['a', 'b'], 0, slick);
      Object.assign(w.bodies.a, { x: ICE_R - 30, y: 0, face: 0, ball: r });
      step(w, {}, true);
      return !w.bodies.a.alive;
    };
    expect(fallsWith(BALL_MIN)).toBe(false);
    expect(fallsWith(60)).toBe(true);
  });
});

describe('nút thắng', () => {
  it('giữ thắng thì dừng gấp hơn hẳn so với thả trôi', () => {
    const stopAfter = (brake: boolean) => {
      const w = spawn(['a'], 0, arenaOf('floe', 1.5, 0.5));
      Object.assign(w.bodies.a, { x: 0, y: 0, vx: 200 });
      run(20, () => step(w, { a: { angle: null, shots: 0, brake } }, true));
      return w.bodies.a.x;
    };
    expect(stopAfter(true)).toBeLessThan(stopAfter(false) * 0.6);
  });

  it('đứng tấn (giữ thắng) bị cầu to bắn trúng thì văng ít hơn hẳn', () => {
    const pushed = (brake: boolean) => {
      const w = spawn(['a', 'b'], 0, arenaOf('floe', 2, 0.35));
      Object.assign(w.bodies.a, { x: -200, y: 0, face: 0, ball: 60 });
      Object.assign(w.bodies.b, { x: 80, y: 0 });
      const inputs: Record<string, Input> = { a: { angle: null, shots: 1, lob: 0 }, b: { angle: null, shots: 0, brake } };
      run(120, () => step(w, inputs, true));
      return w.bodies.b.x - 80;
    };
    expect(pushed(true)).toBeLessThan(pushed(false) * 0.4);
  });

  it('giữ thắng thì không chạy được nhưng vẫn xoay người để ngắm', () => {
    const w = spawn(['a'], 0, arenaOf('floe', 1, 0.35));
    Object.assign(w.bodies.a, { x: 0, y: 0, face: 0 });
    run(30, () => step(w, { a: { angle: Math.PI / 2, shots: 0, brake: true } }, true));
    expect(Math.hypot(w.bodies.a.vx, w.bodies.a.vy)).toBe(0);
    expect(w.bodies.a.face).toBeGreaterThan(1);
  });
});

describe('ma sát và va chạm', () => {
  it('ma sát trượt làm dừng hẳn sau thời gian hữu hạn', () => {
    const w = spawn(['a'], 0, arenaOf('floe', 1.5, 0.5));
    Object.assign(w.bodies.a, { x: 0, y: 0, vx: 100 });
    run(120, () => step(w, {}, true));
    expect(w.bodies.a.vx).toBe(0);
  });

  it('hai cánh cụt va nhau: tổng động lượng giữ nguyên', () => {
    // Mặt rất trơn để ma sát gần như không lấy mất động lượng trong bước va chạm.
    const w = spawn(['a', 'b'], 0, arenaOf('floe', 1.5, 1));
    Object.assign(w.bodies.a, { x: -30, y: 0, vx: 150, ball: 1, face: Math.PI / 2 });
    Object.assign(w.bodies.b, { x: 15, y: 0, vx: 0, ball: 1, face: Math.PI / 2 });
    const p0 = w.bodies.a.vx + w.bodies.b.vx;
    step(w, {}, true);
    expect(w.bodies.b.vx).toBeGreaterThan(50);
    expect(w.bodies.a.vx + w.bodies.b.vx).toBeCloseTo(p0, -1);
  });
});

describe('bản đồ và độ trơn', () => {
  it('mọi bản đồ, mọi cỡ: chỗ xuất phát của 1-6 người đều nằm trên băng', () => {
    for (const id of MAP_IDS) {
      for (const size of [0.7, 1, 1.5]) {
        const { map, R } = arenaOf(id, size, 0.5);
        for (let n = 1; n <= 6; n++) {
          for (let i = 0; i < n; i++) {
            const p = spawnPoint(map, R, i, n);
            expect(onIce(map, R, p.x, p.y, 20), `${id} ${size} ${i}/${n}`).toBe(true);
          }
        }
      }
    }
  });

  it('vành khuyên: lọt lỗ giữa là rơi', () => {
    const w = spawn(['a', 'b'], 0, arenaOf('ring', 1, 0.5));
    Object.assign(w.bodies.a, { x: 0, y: 0 });
    step(w, {}, true);
    expect(w.bodies.a.alive).toBe(false);
    expect(MAPS.ring.holes).toHaveLength(1);
  });

  it('giữ nút bắn vồng: bay qua lỗ nước vành khuyên, rơi đúng điểm đường bay dự kiến chỉ ra', () => {
    const w = spawn(['a', 'b'], 0, arenaOf('ring', 1, 0.5));
    const { R } = w.arena;
    // Đứng gần mép lỗ (lỗ bán kính 0.4R) mà bắn qua.
    Object.assign(w.bodies.a, { x: -0.55 * R, y: 0, face: 0, ball: 12 });
    Object.assign(w.bodies.b, { x: 0, y: 0.7 * R });
    const lob = 0.8;
    const plan = lobPath(w, 'a', lob)!;
    expect(plan.land.safe).toBe(true);
    const inputs: Record<string, Input> = { a: { angle: null, shots: 1, lob } };
    const events = [...step(w, inputs, true)];
    const shot = w.shots[0];
    expect(shot.vz).toBeGreaterThan(0);
    let peak = 0;
    // Chạy tới lần chạm đất đầu tiên.
    for (let i = 0; i < 120 && shot.z > 0; i++) {
      events.push(...step(w, inputs, true));
      peak = Math.max(peak, shot.z);
    }
    expect(peak).toBeGreaterThan(10);
    expect(peak).toBeLessThan(40);
    expect(events.some((e) => e.type === 'splash')).toBe(false);
    expect(shot.x).toBeGreaterThan(0.4 * R);
    // Rơi gần đúng điểm đường bay dự kiến (sai lệch nhỏ do bước thời gian rời rạc).
    expect(Math.hypot(shot.x - plan.land.x, shot.y - plan.land.y)).toBeLessThan(12);
  });

  it('chạm nhanh nút bắn: bắn thẳng, cầu lăn sát mặt băng', () => {
    const w = spawn(['a', 'b'], 0, arenaOf('floe', 1, 0.5));
    Object.assign(w.bodies.a, { x: 0, y: 0, face: 0, ball: 12 });
    step(w, { a: { angle: null, shots: 1, lob: 0 } }, true);
    expect(w.shots[0].z).toBe(0);
    expect(w.shots[0].vz).toBe(0);
    expect(w.shots[0].vx).toBeGreaterThan(400);
  });

  it('đường bay dự kiến báo rơi xuống nước khi canh vào lỗ', () => {
    const w = spawn(['a', 'b'], 0, arenaOf('ring', 1, 0.5));
    const { R } = w.arena;
    Object.assign(w.bodies.a, { x: -0.6 * R, y: 0, face: 0, ball: 12 });
    expect(lobPath(w, 'a', 0.05)!.land.safe).toBe(false);
  });

  it('bắn vồng: rơi xuống ngay trên lỗ nước thì chìm', () => {
    const w = spawn(['a', 'b'], 0, arenaOf('ring', 1, 0.5));
    w.shots.push({ id: 1, owner: 'a', x: 0, y: 0, vx: 0, vy: 0, r: 12, life: 1, z: 20, vz: 0 });
    const events = [];
    for (let i = 0; i < 30; i++) events.push(...step(w, {}, true));
    expect(events.some((e) => e.type === 'splash')).toBe(true);
    expect(w.shots).toHaveLength(0);
  });

  it('mặt băng bám thì bị húc trượt ngắn hơn mặt băng trơn', () => {
    const slide = (slip: number) => {
      const w = spawn(['a', 'b'], 0, arenaOf('floe', 1.5, slip));
      Object.assign(w.bodies.a, { x: 0, y: 0, vx: 300, vy: 0 });
      Object.assign(w.bodies.b, { x: 0, y: 200 });
      run(90, () => step(w, {}, true));
      return w.bodies.a.x;
    };
    expect(slide(0)).toBeLessThan(slide(1) * 0.5);
  });
});

describe('luật ván snowar', () => {
  const players = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ];
  const ctx = (from: string) => ({ from, players, host: from === 'a', now: 1000 });

  it('chủ phòng vào trận, hết hiệp cộng thắng, đủ hiệp thì hết trận', () => {
    let s = iceBumperGame.reduce(iceBumperGame.init(players), { type: 'config', config: { maxRounds: 3 } }, ctx('a'));
    s = iceBumperGame.reduce(s, { type: 'start' }, ctx('b'));
    expect(s.stage).toBe('garage');
    s = iceBumperGame.reduce(s, { type: 'start' }, ctx('a'));
    expect(s).toMatchObject({ stage: 'playing', round: 1, roster: ['a', 'b'] });
    for (let r = 1; r <= 3; r++) {
      s = iceBumperGame.reduce(s, { type: 'round_end', round: r, winnerId: 'b', kos: { b: 1 } }, ctx('a'));
      // Báo trùng (gói đến trễ) không cộng thêm.
      s = iceBumperGame.reduce(s, { type: 'round_end', round: r, winnerId: 'b', kos: { b: 1 } }, ctx('a'));
      if (r < 3) s = iceBumperGame.advance(s, ctx('a'));
    }
    expect(s.stage).toBe('game_over');
    expect(s.wins.b).toBe(3);
    expect(s.kos.b).toBe(3);
    expect(iceBumperGame.advance(s, ctx('a')).stage).toBe('garage');
  });

  it('bản đồ ngẫu nhiên: mỗi hiệp bốc bản đồ khác hiệp trước', () => {
    let s = iceBumperGame.reduce(iceBumperGame.init(players), { type: 'config', config: { map: 'random', scale: 1.3, slip: 0.1, maxRounds: 7 } }, ctx('a'));
    expect(s).toMatchObject({ map: 'random', scale: 1.3, slip: 0.1 });
    s = iceBumperGame.reduce(s, { type: 'start' }, ctx('a'));
    for (let r = 1; r < 6; r++) {
      const before = s.roundMap;
      s = iceBumperGame.reduce(s, { type: 'round_end', round: r, winnerId: null, kos: {} }, ctx('a'));
      s = iceBumperGame.advance(s, ctx('a'));
      expect(s.roundMap).not.toBe(before);
    }
  });

  it('thời gian mỗi hiệp: chọn được các mức và vô hạn, giữ qua trận mới; số lạ bị bỏ qua', () => {
    let s = iceBumperGame.reduce(iceBumperGame.init(players), { type: 'config', config: { roundSeconds: 0 } }, ctx('a'));
    expect(s.roundSeconds).toBe(0);
    s = iceBumperGame.reduce(s, { type: 'config', config: { roundSeconds: 45 } }, ctx('a'));
    expect(s.roundSeconds).toBe(0);
    s = iceBumperGame.reduce(s, { type: 'config', config: { roundSeconds: 90 } }, ctx('a'));
    s = iceBumperGame.reduce({ ...s, maxRounds: 3 }, { type: 'start' }, ctx('a'));
    for (let r = 1; r <= 3; r++) {
      s = iceBumperGame.reduce(s, { type: 'round_end', round: r, winnerId: null, kos: {} }, ctx('a'));
      s = iceBumperGame.advance(s, ctx('a'));
    }
    expect(s.stage).toBe('garage');
    expect(s.roundSeconds).toBe(90);
  });

  it('cài đặt sai bị bỏ qua', () => {
    const s = iceBumperGame.reduce(iceBumperGame.init(players), { type: 'config', config: { map: 'xyz' as never, scale: 9, slip: -1 } }, ctx('a'));
    expect(s).toMatchObject({ map: 'floe', scale: SCALE.default, slip: SLIP.default });
  });

  it('khách không báo hết hiệp được', () => {
    let s = iceBumperGame.reduce(iceBumperGame.init(players), { type: 'start' }, ctx('a'));
    s = iceBumperGame.reduce(s, { type: 'round_end', round: 1, winnerId: 'b', kos: {} }, ctx('b'));
    expect(s.stage).toBe('playing');
  });
});
