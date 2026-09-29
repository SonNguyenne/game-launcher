export interface Prompt {
  category: string;
  p: string;
}

export const prompts: readonly Prompt[] = [
  // Ăn uống & La cà
  { category: 'ẩm thực', p: 'Một món ăn bạn thèm nhất lúc 12 giờ đêm?' },
  { category: 'ẩm thực', p: 'Một thương hiệu trà sữa bạn ghé nhiều nhất?' },
  { category: 'ẩm thực', p: 'Một món ăn vỉa hè kinh điển của giới trẻ?' },
  { category: 'ẩm thực', p: 'Một loại topping không thể thiếu khi uống trà sữa?' },
  { category: 'ẩm thực', p: 'Một món ăn tuyệt đối không bao giờ cho dứa (thơm) vào?' },
  { category: 'ẩm thực', p: 'Một hương vị mì tôm quốc dân của người Việt?' },
  { category: 'ẩm thực', p: 'Một món nước giải khát cứu tinh cho ngày hè oi bức?' },

  // Đời sống & Thói quen
  { category: 'thói quen', p: 'Một lý do bùng kèo kinh điển nhất quả đất?' },
  { category: 'thói quen', p: 'Điều đầu tiên bạn làm ngay khi mở mắt thức dậy?' },
  { category: 'thói quen', p: 'Một ứng dụng bạn mở ra đầu tiên khi cầm điện thoại?' },
  { category: 'thói quen', p: 'Một câu nói dối bạn hay dùng nhất?' },
  { category: 'thói quen', p: 'Một lý do đi làm / đi học muộn phổ biến nhất?' },
  { category: 'thói quen', p: 'Nơi cất giấu tiền an toàn nhất trong phòng ngủ?' },
  { category: 'thói quen', p: 'Một việc ai cũng từng làm lén lút khi còn đi học?' },

  // Tình cảm & Bạn bè
  { category: 'tình cảm', p: 'Một tính từ miêu tả đúng nhất về người yêu cũ?' },
  { category: 'tình cảm', p: 'Hành động cờ đỏ (red flag) lớn nhất trong tình yêu?' },
  { category: 'tình cảm', p: 'Địa điểm hẹn hò lãng mạn nhưng tiết kiệm nhất?' },
  { category: 'tình cảm', p: 'Câu nói chia tay kinh điển mà ai nghe cũng cay?' },
  { category: 'tình cảm', p: 'Món quà sinh nhật thực tế nhất tặng bạn thân?' },
  { category: 'tình cảm', p: 'Điều đáng sợ nhất khi ra mắt gia đình người yêu?' },

  // Giải trí & MXH
  { category: 'giải trí', p: 'Một bài hát nổi tiếng nhất của Sơn Tùng M-TP?' },
  { category: 'giải trí', p: 'Một nhân vật siêu anh hùng mạnh nhất vũ trụ Marvel?' },
  { category: 'giải trí', p: 'Một bộ phim hoạt hình bạn xem đi xem lại không chán?' },
  { category: 'giải trí', p: 'Một idol K-pop nổi tiếng nhất thế giới hiện nay?' },
  { category: 'giải trí', p: 'Một trò chơi dân gian ngày bé ai cũng từng chơi?' },
  { category: 'giải trí', p: 'Một câu cửa miệng / từ lóng Gen Z hot nhất dạo này?' },
];

export const strings = {
  title: 'thần giao',
  rule: 'Máy chọn 2 người lên thớt cùng một chủ đề mở. Cả 2 bí mật gõ đáp án. Trùng khớp thì an toàn, lệch pha thì cả 2 cùng dính phạt!',
  pairTitle: 'CẶP ĐÔI THỬ THÁCH',
  promptLabel: 'chủ đề thử thách',
  typingWait: (name: string) => `Đang chờ ${name} nhập đáp án…`,
  typeYourAnswer: 'Nhập đáp án của bạn (ngắn gọn 1-4 từ):',
  answerPlaceholder: 'Ví dụ: Trà sữa trân châu, Pizza...',
  submitAnswer: 'xác nhận đáp án',
  waitingPartner: 'Đã gửi! Chờ bạn cặp trả lời…',
  bothAnswered: 'Đã đủ 2 đáp án! Cùng lật mở xem độ ăn ý!',
  revealButton: 'lật mở đáp án!',
  matchedTitle: '🎉 ĐỒNG ĐIỆU 100%! 🎉',
  matchedDesc: 'Hai bộ não đã kết nối thành công! Cả 2 an toàn!',
  mismatchTitle: '⚡ LỆCH PHA HOÀN TOÀN! ⚡',
  mismatchDesc: 'Mỗi người một phách! Cả 2 cùng chịu phạt!',
  judgeMatch: 'đồng điệu (hợp lý)',
  judgeMismatch: 'lệch pha (chịu phạt)',
  nextRound: 'vòng tiếp theo',
  penaltyLabel: 'hình phạt khi lệch pha',
  defaultPenalty: 'cả 2 người cùng dính phạt!',
  penaltyPresets: [
    'cả 2 cùng dính phạt!',
    'mỗi người uống 1 ngụm đồ uống',
    'cùng chống đẩy 5 cái',
    'cùng song ca 1 đoạn bài hát',
    'bắt tay xin lỗi nhau',
  ],
} as const;
