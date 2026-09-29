export type Topic = 'vn' | 'world' | 'science' | 'fun';
export type TopicChoice = Topic | 'mix';

export interface Question {
  topic: Topic;
  q: string;
  /** Đáp án đúng luôn đứng đầu; khi hỏi sẽ được xáo trộn. */
  a: readonly [string, string, string, string];
}

export const questions: readonly Question[] = [
  // Việt Nam
  { topic: 'vn', q: 'Đỉnh núi cao nhất Việt Nam?', a: ['Fansipan', 'Bà Đen', 'Ngọc Linh', 'Tây Côn Lĩnh'] },
  { topic: 'vn', q: 'Ai là tác giả Truyện Kiều?', a: ['Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Trãi', 'Nguyễn Đình Chiểu'] },
  { topic: 'vn', q: 'Vịnh Hạ Long thuộc tỉnh nào?', a: ['Quảng Ninh', 'Hải Phòng', 'Thái Bình', 'Nam Định'] },
  { topic: 'vn', q: 'Thành phố nào được gọi là "thành phố ngàn hoa"?', a: ['Đà Lạt', 'Sa Pa', 'Huế', 'Nha Trang'] },
  { topic: 'vn', q: 'Tết Trung thu là ngày nào âm lịch?', a: ['15 tháng 8', '15 tháng 7', '1 tháng 8', '10 tháng 10'] },
  { topic: 'vn', q: 'Con sông dài nhất chảy qua Việt Nam?', a: ['Mê Kông', 'Sông Hồng', 'Sông Đà', 'Sông Đồng Nai'] },
  { topic: 'vn', q: 'Hồ Hoàn Kiếm nằm ở thành phố nào?', a: ['Hà Nội', 'Hải Phòng', 'Huế', 'Đà Nẵng'] },
  { topic: 'vn', q: 'Chiến thắng Điện Biên Phủ diễn ra năm nào?', a: ['1954', '1945', '1975', '1968'] },
  { topic: 'vn', q: 'Kinh đô Huế là kinh đô của triều đại nào?', a: ['Nhà Nguyễn', 'Nhà Lý', 'Nhà Trần', 'Nhà Lê'] },
  { topic: 'vn', q: 'Đảo lớn nhất Việt Nam?', a: ['Phú Quốc', 'Côn Đảo', 'Cát Bà', 'Lý Sơn'] },
  { topic: 'vn', q: 'Bún chả là món nổi tiếng của nơi nào?', a: ['Hà Nội', 'Huế', 'Sài Gòn', 'Cần Thơ'] },
  { topic: 'vn', q: 'Đơn vị tiền tệ của Việt Nam?', a: ['Đồng', 'Hào', 'Xu', 'Nguyên'] },

  // Thế giới
  { topic: 'world', q: 'Thủ đô của Úc là thành phố nào?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
  { topic: 'world', q: 'Kim tự tháp Giza nằm ở nước nào?', a: ['Ai Cập', 'Mexico', 'Hy Lạp', 'Iraq'] },
  { topic: 'world', q: 'Đại dương lớn nhất thế giới?', a: ['Thái Bình Dương', 'Đại Tây Dương', 'Ấn Độ Dương', 'Bắc Băng Dương'] },
  { topic: 'world', q: 'Nước nào đông dân nhất thế giới hiện nay?', a: ['Ấn Độ', 'Trung Quốc', 'Mỹ', 'Indonesia'] },
  { topic: 'world', q: 'Quốc kỳ Nhật Bản có hình tròn màu gì?', a: ['Đỏ', 'Vàng', 'Xanh', 'Đen'] },
  { topic: 'world', q: 'Tháp Eiffel nằm ở thành phố nào?', a: ['Paris', 'London', 'Rome', 'Berlin'] },
  { topic: 'world', q: 'Thủ đô của Canada?', a: ['Ottawa', 'Toronto', 'Vancouver', 'Montreal'] },
  { topic: 'world', q: 'Châu lục lớn nhất thế giới?', a: ['Châu Á', 'Châu Phi', 'Châu Mỹ', 'Châu Âu'] },
  { topic: 'world', q: 'Vạn Lý Trường Thành thuộc nước nào?', a: ['Trung Quốc', 'Mông Cổ', 'Hàn Quốc', 'Nhật Bản'] },
  { topic: 'world', q: 'Sa mạc nóng lớn nhất thế giới?', a: ['Sahara', 'Gobi', 'Kalahari', 'Atacama'] },
  { topic: 'world', q: 'Thủ đô của Hàn Quốc?', a: ['Seoul', 'Busan', 'Incheon', 'Daegu'] },
  { topic: 'world', q: 'Đơn vị tiền tệ của Nhật Bản?', a: ['Yên', 'Won', 'Nhân dân tệ', 'Baht'] },

  // Khoa học
  { topic: 'science', q: 'Hành tinh lớn nhất trong hệ Mặt Trời?', a: ['Sao Mộc', 'Sao Thổ', 'Trái Đất', 'Sao Hải Vương'] },
  { topic: 'science', q: 'Hành tinh gần Mặt Trời nhất?', a: ['Sao Thủy', 'Sao Kim', 'Sao Hỏa', 'Trái Đất'] },
  { topic: 'science', q: 'Một năm nhuận có bao nhiêu ngày?', a: ['366', '365', '364', '360'] },
  { topic: 'science', q: 'Ký hiệu hóa học của vàng?', a: ['Au', 'Ag', 'Fe', 'Go'] },
  { topic: 'science', q: 'Nước sôi ở bao nhiêu độ C (áp suất thường)?', a: ['100', '90', '120', '80'] },
  { topic: 'science', q: 'Con vật nào có ba quả tim?', a: ['Bạch tuộc', 'Cá heo', 'Rùa', 'Ếch'] },
  { topic: 'science', q: 'Cơ quan lớn nhất trên cơ thể người?', a: ['Da', 'Gan', 'Phổi', 'Ruột'] },
  { topic: 'science', q: 'Tam giác đều có mỗi góc bao nhiêu độ?', a: ['60', '45', '90', '30'] },
  { topic: 'science', q: 'Khí nào chiếm nhiều nhất trong không khí?', a: ['Ni-tơ', 'Ô-xy', 'Các-bô-níc', 'Hi-đrô'] },
  { topic: 'science', q: 'Con nhện có bao nhiêu chân?', a: ['8', '6', '10', '12'] },
  { topic: 'science', q: 'Công thức hóa học của nước?', a: ['H₂O', 'CO₂', 'O₂', 'NaCl'] },
  { topic: 'science', q: 'Xương dài nhất cơ thể người?', a: ['Xương đùi', 'Xương cánh tay', 'Xương sống', 'Xương ống chân'] },
  { topic: 'science', q: 'Loài động vật lớn nhất hiện nay?', a: ['Cá voi xanh', 'Voi châu Phi', 'Cá mập voi', 'Hươu cao cổ'] },

  // Giải trí & thể thao
  { topic: 'fun', q: 'Bàn cờ vua có bao nhiêu ô?', a: ['64', '81', '100', '48'] },
  { topic: 'fun', q: 'Mỗi đội bóng đá có bao nhiêu người trên sân?', a: ['11', '10', '9', '12'] },
  { topic: 'fun', q: 'Bia được nấu chủ yếu từ loại hạt nào?', a: ['Lúa mạch', 'Gạo nếp', 'Ngô', 'Đậu nành'] },
  { topic: 'fun', q: 'World Cup bóng đá nam tổ chức mấy năm một lần?', a: ['4 năm', '2 năm', '3 năm', '5 năm'] },
  { topic: 'fun', q: 'Pikachu là nhân vật của loạt nào?', a: ['Pokémon', 'Digimon', 'Doraemon', 'Naruto'] },
  { topic: 'fun', q: 'Doraemon là gì?', a: ['Mèo máy', 'Chó máy', 'Người máy', 'Gấu máy'] },
  { topic: 'fun', q: 'Bộ bài tây (không tính Joker) có bao nhiêu lá?', a: ['52', '54', '48', '56'] },
  { topic: 'fun', q: 'Lá cờ Olympic có bao nhiêu vòng tròn?', a: ['5', '4', '6', '7'] },
  { topic: 'fun', q: 'Harry Potter học ở trường nào?', a: ['Hogwarts', 'Durmstrang', 'Beauxbatons', 'Ilvermorny'] },
  { topic: 'fun', q: 'Lionel Messi nổi tiếng với môn thể thao nào?', a: ['Bóng đá', 'Bóng rổ', 'Quần vợt', 'Bóng chày'] },
  { topic: 'fun', q: 'Vũ khí của Tôn Ngộ Không là gì?', a: ['Gậy Như Ý', 'Đinh ba', 'Kiếm', 'Quạt ba tiêu'] },
  { topic: 'fun', q: 'Mỗi đội bóng rổ có bao nhiêu người trên sân?', a: ['5', '6', '7', '4'] },
];

export const strings = {
  title: 'đố nhanh',
  rule: 'Mỗi người một câu, 10 giây để chọn. Đúng +1 điểm, trả lời trong 4 giây đầu +2. Sai hoặc hết giờ thì chịu phạt. Đúng 3 câu liền được chỉ định người chịu phạt. Mỗi người có một quyền 50/50. Chủ phòng chọn chủ đề ở phòng chờ.',
  topicLabel: 'chủ đề',
  topics: { mix: 'trộn', vn: 'Việt Nam', world: 'thế giới', science: 'khoa học', fun: 'giải trí' } satisfies Record<TopicChoice, string>,
  ask: 'rút câu hỏi',
  waitAsk: (name: string) => `chờ ${name} rút câu hỏi`,
  ready: 'sẵn sàng chưa?',
  seconds: (n: number) => `${n} giây`,
  correct: 'đúng rồi, an toàn',
  streak: '3 câu liền! chỉ định 1 người chịu phạt',
  wrong: 'sai rồi, dính phạt',
  timeout: 'hết giờ, dính phạt',
  answerWas: (a: string) => `đáp án: ${a}`,
  gained: (n: number, fast: boolean) => `+${n} điểm${fast ? ' (trả lời nhanh)' : ''}`,
  fifty: '50/50',
  fiftyUsed: 'đã dùng 50/50',
  scoreboard: 'bảng điểm',
  points: (n: number) => `${n} điểm`,
  streakBadge: (n: number) => `${n} liền`,
  letters: ['A', 'B', 'C', 'D'],
  markRight: '✓ đúng',
  markWrong: '✕ sai',
} as const;
