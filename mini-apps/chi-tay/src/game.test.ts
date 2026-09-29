import { describe, expect, it } from 'vitest';
import { chiTayGame } from './game';

const players = [
  { id: 'p1', name: 'An' },
  { id: 'p2', name: 'Bình' },
  { id: 'p3', name: 'Châu' },
];

const ctx = (from: string) => ({ from, players, host: from === 'p1' });

describe('chiTayGame', () => {
  it('khởi tạo với phase question và topic mix', () => {
    const s = chiTayGame.init(players);
    expect(s.phase).toBe('question');
    expect(s.topic).toBe('mix');
    expect(s.votes).toEqual({});
  });

  it('chuyển sang voting khi bấm ready', () => {
    let s = chiTayGame.init(players);
    s = chiTayGame.reduce(s, { type: 'ready' }, ctx('p1'));
    expect(s.phase).toBe('voting');
  });

  it('tổng hợp phiếu và xác định nạn nhân khi cả bàn vote xong', () => {
    let s = chiTayGame.init(players);
    s = chiTayGame.reduce(s, { type: 'ready' }, ctx('p1'));
    s = chiTayGame.reduce(s, { type: 'vote', targetId: 'p2' }, ctx('p1'));
    s = chiTayGame.reduce(s, { type: 'vote', targetId: 'p2' }, ctx('p2'));
    s = chiTayGame.reduce(s, { type: 'vote', targetId: 'p3' }, ctx('p3'));

    expect(s.phase).toBe('revealed');
    expect(s.victimIds).toEqual(['p2']);
    expect(s.result?.playerId).toBe('p2');
  });

  it('hỗ trợ chốt nạn nhân trong chế độ 1 máy', () => {
    let s = chiTayGame.init(players);
    s = chiTayGame.reduce(s, { type: 'ready' }, ctx('p1'));
    s = chiTayGame.reduce(s, { type: 'confirm_local', victimId: 'p3' }, ctx('p1'));

    expect(s.phase).toBe('revealed');
    expect(s.victimIds).toEqual(['p3']);
    expect(s.result?.playerId).toBe('p3');
  });

  it('đổi sang câu hỏi tiếp theo khi next_question', () => {
    let s = chiTayGame.init(players);
    const firstQ = s.qIndex;
    s = chiTayGame.reduce(s, { type: 'ready' }, ctx('p1'));
    s = chiTayGame.reduce(s, { type: 'confirm_local', victimId: 'p1' }, ctx('p1'));
    s = chiTayGame.reduce(s, { type: 'next_question' }, ctx('p1'));

    expect(s.phase).toBe('question');
    expect(s.qIndex).not.toBe(firstQ);
    expect(s.victimIds).toEqual([]);
  });

  it('cho phép chủ phòng đổi cài đặt chủ đề và hình phạt', () => {
    let s = chiTayGame.init(players);
    s = chiTayGame.reduce(
      s,
      { type: 'config', config: { topic: 'bua', penaltyText: 'chống đẩy 10 cái' } },
      ctx('p1'),
    );
    expect(s.topic).toBe('bua');
    expect(s.penaltyText).toBe('chống đẩy 10 cái');
  });
});
