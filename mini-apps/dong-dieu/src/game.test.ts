import { describe, expect, it } from 'vitest';
import { areAnswersSimilar, dongDieuGame } from './game';

const players = [
  { id: 'p1', name: 'An' },
  { id: 'p2', name: 'Bình' },
  { id: 'p3', name: 'Châu' },
];

const ctx = (from: string) => ({ from, players, host: from === 'p1' });

describe('areAnswersSimilar', () => {
  it('nhận diện đáp án trùng nhau dù khác dấu, hoa thường, khoảng trắng', () => {
    expect(areAnswersSimilar('Trà Sữa', 'tra sua')).toBe(true);
    expect(areAnswersSimilar('Mì Tôm Hảo Hảo', 'hảo hảo')).toBe(true);
    expect(areAnswersSimilar('boba', 'pizza')).toBe(false);
  });
});

describe('dongDieuGame', () => {
  it('khởi tạo với phase pair_pick và chọn 2 người đầu tiên', () => {
    const s = dongDieuGame.init(players);
    expect(s.phase).toBe('pair_pick');
    expect(s.pairIds).toEqual(['p1', 'p2']);
  });

  it('chuyển sang typing khi start_typing', () => {
    let s = dongDieuGame.init(players);
    s = dongDieuGame.reduce(s, { type: 'start_typing' }, ctx('p1'));
    expect(s.phase).toBe('typing');
  });

  it('tự động phát hiện đồng điệu khi 2 đáp án trùng khớp', () => {
    let s = dongDieuGame.init(players);
    s = dongDieuGame.reduce(s, { type: 'start_typing' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'Trà sữa' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'tra sua' }, ctx('p2'));

    expect(s.phase).toBe('revealed');
    expect(s.isMatched).toBe(true);
    expect(s.result?.safe).toBe(true);
  });

  it('báo lệch pha và kích hoạt hình phạt khi 2 đáp án khác nhau', () => {
    let s = dongDieuGame.init(players);
    s = dongDieuGame.reduce(s, { type: 'start_typing' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'Trà sữa' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'Pizza' }, ctx('p2'));

    expect(s.phase).toBe('revealed');
    expect(s.isMatched).toBe(false);
    expect(s.result?.safe).toBe(false);
  });

  it('cho phép chủ phòng phán quyết lại (judge) nếu câu trả lời na ná nhau', () => {
    let s = dongDieuGame.init(players);
    s = dongDieuGame.reduce(s, { type: 'start_typing' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'Trà xanh' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'Matcha' }, ctx('p2'));

    expect(s.isMatched).toBe(false);

    // Chủ phòng công nhận đồng điệu
    s = dongDieuGame.reduce(s, { type: 'judge', matched: true }, ctx('p1'));
    expect(s.isMatched).toBe(true);
    expect(s.result?.safe).toBe(true);
  });

  it('chuyển sang vòng tiếp theo với cặp người chơi mới', () => {
    let s = dongDieuGame.init(players);
    s = dongDieuGame.reduce(s, { type: 'start_typing' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'A' }, ctx('p1'));
    s = dongDieuGame.reduce(s, { type: 'submit_answer', answer: 'A' }, ctx('p2'));
    s = dongDieuGame.reduce(s, { type: 'next_round' }, ctx('p1'));

    expect(s.phase).toBe('pair_pick');
    expect(s.pairIds).toEqual(['p2', 'p3']);
  });
});
