export type Topic = 'mix' | 'bua' | 'tinh-yeu' | 'hoc-duong';

export interface Question {
  topic: Topic;
  q: string;
}

export const questions: readonly Question[] = [
  // Bựa lầy & Drama
  { topic: 'bua', q: 'Ai là người có khả năng đi tù vì một lý do ngớ ngẩn nhất?' },
  { topic: 'bua', q: 'Ai nhìn mặt ngoan hiền nhưng bên trong quậy ngầm nhất?' },
  { topic: 'bua', q: 'Ai là người hay bùng kèo sát giờ nhất hội?' },
  { topic: 'bua', q: 'Ai nghèo rớt mồng tơi nhưng mua sắm như triệu phú?' },
  { topic: 'bua', q: 'Ai dễ bị lừa mua hàng online kém chất lượng nhất?' },
  { topic: 'bua', q: 'Ai hay quên trả tiền hoặc giả vờ quên ví nhất?' },
  { topic: 'bua', q: 'Ai có nết ngủ xấu nhất (ngáy, đạp, mớ)?' },
  { topic: 'bua', q: 'Ai lười tắm nhất khi trời lạnh hoặc ở nhà cả ngày?' },
  { topic: 'bua', q: 'Ai là chúa hóng hớt drama trên mạng xã hội?' },
  { topic: 'bua', q: 'Ai hay giả vờ bận rộn để trốn đi chơi?' },
  { topic: 'bua', q: 'Ai dễ cười sặc nước vào mặt người đối diện nhất?' },
  { topic: 'bua', q: 'Ai uống say xong hay đi gọi điện linh tinh nhất?' },
  { topic: 'bua', q: 'Ai là người có gu ăn mặc dị hợm nhất?' },
  { topic: 'bua', q: 'Ai nói đạo lý nhiều nhất nhưng làm thì ngược lại?' },
  { topic: 'bua', q: 'Ai dễ bị lạc đường dù có bật Google Maps?' },

  // Tình yêu & Thả thính
  { topic: 'tinh-yeu', q: 'Ai là người dễ bị cắm sừng nhất trong nhóm?' },
  { topic: 'tinh-yeu', q: 'Ai hay stalk Facebook người yêu cũ lúc 2 giờ sáng?' },
  { topic: 'tinh-yeu', q: 'Ai là chúa lụy tình, chia tay khóc trôi sông trôi biển?' },
  { topic: 'tinh-yeu', q: 'Ai thả thính dạo nhiều nhất nhưng vẫn ế trường tồn?' },
  { topic: 'tinh-yeu', q: 'Ai dễ rơi vào lưới tình ngay từ cái nhìn đầu tiên?' },
  { topic: 'tinh-yeu', q: 'Ai hay làm bạn bè tàng hình mỗi khi có người yêu?' },
  { topic: 'tinh-yeu', q: 'Ai có tiêu chuẩn chọn người yêu trên trời nhất?' },
  { topic: 'tinh-yeu', q: 'Ai dễ quay lại với người yêu cũ nhất?' },
  { topic: 'tinh-yeu', q: 'Ai có nhiều mối quan hệ mập mờ, mượn cớ anh/em gái mưa nhất?' },
  { topic: 'tinh-yeu', q: 'Ai hay ghen tuông vô cớ nhất?' },
  { topic: 'tinh-yeu', q: 'Ai là người sẽ kết hôn sớm nhất hội?' },
  { topic: 'tinh-yeu', q: 'Ai hay đi tư vấn tình cảm cho người khác dù mình ế?' },

  // Học đường & Đời sống
  { topic: 'hoc-duong', q: 'Ai hay đi học / đi làm muộn nhất nhóm?' },
  { topic: 'hoc-duong', q: 'Ai là người nước đến chân mới nhảy, sát hạn mới nộp bài?' },
  { topic: 'hoc-duong', q: 'Ai hay ngủ gật trong giờ học / cuộc họp nhất?' },
  { topic: 'hoc-duong', q: 'Ai hay xin chép bài tập về nhà nhất?' },
  { topic: 'hoc-duong', q: 'Ai là người hay cúp học / trốn việc đi chơi net nhất?' },
  { topic: 'hoc-duong', q: 'Ai nghiện trà sữa / cà phê nặng nhất, không uống là đơ não?' },
  { topic: 'hoc-duong', q: 'Ai dán mắt vào điện thoại nhiều nhất mỗi khi tụ tập?' },
  { topic: 'hoc-duong', q: 'Ai luôn là người chụp ảnh dìm hàng bạn bè nhiều nhất?' },
  { topic: 'hoc-duong', q: 'Ai hay than thở hết tiền nhất mỗi cuối tháng?' },
  { topic: 'hoc-duong', q: 'Ai có bàn học / phòng ngủ bừa bộn nhất?' },
  { topic: 'hoc-duong', q: 'Ai dễ trở thành người thành công kiếm nhiều tiền nhất hội?' },
];

export const strings = {
  title: 'chỉ tay',
  rule: 'Máy đưa câu hỏi bóc phốt. Đếm ngược 3... 2... 1... cả bàn đồng thời vote (hoặc chỉ tay vào mặt). Ai bị vote nhiều nhất là nạn nhân dính phạt!',
  topicLabel: 'chủ đề câu hỏi',
  topics: {
    mix: 'trộn tất cả',
    bua: 'bựa & drama',
    'tinh-yeu': 'tình cảm',
    'hoc-duong': 'học đường & đời sống',
  } satisfies Record<Topic, string>,
  penaltyLabel: 'hình phạt nạn nhân',
  defaultPenalty: 'người bị chỉ tay nhiều nhất dính phạt!',
  penaltyPresets: [
    'người bị vote nhiều nhất dính phạt!',
    'uống 1 ngụm đồ uống',
    'chống đẩy 5 cái',
    'hát 1 đoạn điệp khúc',
    'kể 1 bí mật thật lòng',
    'tự đăng 1 story ngớ ngẩn',
  ],
  readyVote: 'sẵn sàng chỉ tay!',
  voteCountdown: (s: number) => `Chỉ tay sau: ${s}s`,
  pointNow: '👉 CHỈ TAY NGAY! 👈',
  whoVoted: 'Ai bị cả bàn chỉ tay nhiều nhất?',
  confirmVictim: 'chốt nạn nhân',
  victimBadge: 'NẠN NHÂN BAY MÀU',
  nextQuestion: 'câu tiếp theo',
  votingOnline: 'Bấm chọn người bạn muốn chỉ tay:',
  waitingVotes: (done: number, total: number) => `Đang chờ vote (${done}/${total})…`,
  votesCount: (n: number) => `${n} phiếu`,
  tieResult: 'Hòa phiếu! Tất cả những người cao phiếu nhất cùng dính phạt!',
} as const;
