import { describe, expect, it } from 'vitest';
import { dapTayGame, speedToMs } from './game';
import { cardItems } from './strings';

const players = [
  { id: 'p1', name: 'An' },
  { id: 'p2', name: 'Bình' },
];

const ctx = (from: string) => ({ from, players, host: from === 'p1' });

describe('speedToMs', () => {
  it('chuyển đổi đúng tốc độ sang mili-giây', () => {
    expect(speedToMs('vua')).toBe(650);
    expect(speedToMs('nhanh')).toBe(450);
    expect(speedToMs('dien')).toBe(300);
  });
});

describe('dapTayGame', () => {
  it('khởi tạo với phase ready và speed nhanh', () => {
    const s = dapTayGame.init(players);
    expect(s.phase).toBe('ready');
    expect(s.speed).toBe('nhanh');
    expect(s.currentCard).toBeNull();
  });

  it('chuyển sang running khi start_round', () => {
    let s = dapTayGame.init(players);
    s = dapTayGame.reduce(s, { type: 'start_round' }, ctx('p1'));
    expect(s.phase).toBe('running');
  });

  it('cập nhật thẻ đang lật khi flip_card', () => {
    let s = dapTayGame.init(players);
    s = dapTayGame.reduce(s, { type: 'start_round' }, ctx('p1'));
    s = dapTayGame.reduce(s, { type: 'flip_card', card: cardItems[0] }, ctx('p1'));

    expect(s.currentCard).toEqual(cardItems[0]);
    expect(s.cardCount).toBe(1);
  });

  it('ghi nhận đập chuẩn xác và an toàn cho người đập', () => {
    let s = dapTayGame.init(players);
    s = dapTayGame.reduce(s, { type: 'start_round' }, ctx('p1'));
    s = dapTayGame.reduce(s, { type: 'slap', outcome: 'success' }, ctx('p1'));

    expect(s.phase).toBe('slapped');
    expect(s.slapperId).toBe('p1');
    expect(s.slapOutcome).toBe('success');
    expect(s.result?.safe).toBe(true);
  });

  it('bắt phạt khi đập nhầm thẻ bẫy', () => {
    let s = dapTayGame.init(players);
    s = dapTayGame.reduce(s, { type: 'start_round' }, ctx('p1'));
    s = dapTayGame.reduce(s, { type: 'slap', outcome: 'trap' }, ctx('p2'));

    expect(s.phase).toBe('slapped');
    expect(s.slapperId).toBe('p2');
    expect(s.slapOutcome).toBe('trap');
    expect(s.result?.safe).toBe(false);
  });

  it('cho phép chuyển sang vòng tiếp theo với luật mới', () => {
    let s = dapTayGame.init(players);
    s = dapTayGame.reduce(s, { type: 'start_round' }, ctx('p1'));
    s = dapTayGame.reduce(s, { type: 'slap', outcome: 'success' }, ctx('p1'));
    s = dapTayGame.reduce(s, { type: 'next_round' }, ctx('p1'));

    expect(s.phase).toBe('ready');
    expect(s.ruleIndex).toBe(1);
    expect(s.currentCard).toBeNull();
  });
});
