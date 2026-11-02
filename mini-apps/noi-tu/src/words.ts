/**
 * Từ điển gọn: từ ghép 2 âm tiết thông dụng, dùng để kiểm tra và gợi ý trong trò nối từ.
 * File này được tải lazy (import động) nên không làm nặng lúc mở game.
 * Mỗi dòng một nhóm, các từ cách nhau bằng dấu phẩy.
 */
const RAW = `
a dua
ai oán, ai điếu
am hiểu, am tường
an toàn, an ninh, an ủi, an tâm, an khang, an nhàn, an bình, an cư, an táng, an phận, an lành, an nghỉ, an vui, an dưỡng, an định, an sinh, an thai, an hưởng
anh hùng, anh em, anh chị, anh dũng, anh minh, anh tài, anh đào, anh rể, anh họ, anh trai, anh kiệt, anh thư, anh linh
ao ước, ao hồ, ao làng, ao cá, ao tù, ao sâu
áo dài, áo khoác, áo mưa, áo len, áo ngủ, áo gối, áo quan, áo tắm, áo giáp, áo bông, áo choàng, áo thun, áo cưới, áo trắng
ác độc, ác mộng, ác cảm, ác ý, ác liệt, ác nghiệt, ác quỷ, ác ôn, ác thú, ác tính
ám ảnh, ám chỉ, ám sát, ám hiệu, ám muội, ám thị
án mạng, án phí, án treo, án ngữ
ánh sáng, ánh nắng, ánh trăng, ánh mắt, ánh đèn, ánh lửa
ảnh hưởng, ảnh hình, ảnh chụp, ảnh viện
ảo ảnh, ảo giác, ảo tưởng, ảo thuật, ảo mộng, ảo não, ảo vọng
ăn uống, ăn năn, ăn mặc, ăn ở, ăn chơi, ăn cắp, ăn mày, ăn xin, ăn khớp, ăn mừng, ăn hại, ăn tiền, ăn trộm, ăn chay, ăn mòn, ăn ý, ăn nói, ăn sáng, ăn trưa, ăn tối, ăn vặt, ăn khách, ăn nhập, ăn thua, ăn ảnh, ăn cơm, ăn hỏi
âm thanh, âm nhạc, âm mưu, âm dương, âm thầm, âm lịch, âm điệu, âm ấm, âm u, âm hưởng, âm vang, âm tiết, âm phủ, âm binh, âm tính, âm lượng
ân cần, ân hận, ân nhân, ân tình, ân huệ, ân nghĩa, ân xá, ân oán, ân điển
ấm áp, ấm cúng, ấm no, ấm ức, ấm trà, ấm áp, ấm êm, ấm lòng, ấm ớ
ẩm thực, ẩm ướt, ẩm thấp, ẩm mốc
ấn tượng, ấn định, ấn loát, ấn phẩm, ấn hành
ẩn náu, ẩn dụ, ẩn danh, ẩn số, ẩn ý, ẩn sĩ, ẩn hiện, ẩn mình, ẩn khuất, ẩn nấp
âu yếm, âu lo, âu sầu, âu phục
ấu trùng, ấu thơ, ấu trĩ
ba lô, ba hoa, ba mẹ, ba má, ba chỉ, ba phải, ba gai, ba sinh
bà con, bà ngoại, bà nội, bà già, bà đỡ, bà mụ, bà chủ, bà cô
bá chủ, bá đạo, bá quyền, bá tước, bá vơ, bá cáo
bác sĩ, bác ái, bác học, bác bỏ, bác gái, bác trai, bác tài
bạc màu, bạc nhược, bạc tình, bạc bẽo, bạc đãi, bạc phận, bạc hà, bạc tiền, bạc trắng, bạc mệnh
bách khoa, bách hóa, bách bộ, bách niên, bách chiến
bạch tuộc, bạch kim, bạch dương, bạch đàn, bạch cầu, bạch mã, bạch tạng, bạch huyết
bài bản, bài học, bài hát, bài thơ, bài tập, bài văn, bài giảng, bài báo, bài trừ, bài xích, bài ca, bài bạc, bài thi, bài vở, bài toán, bài viết
bãi biển, bãi bỏ, bãi công, bãi rác, bãi cỏ, bãi cát, bãi đỗ, bãi nại, bãi khóa
bại trận, bại hoại, bại lộ, bại liệt, bại sản, bại tướng
ban ngày, ban đêm, ban đầu, ban công, ban hành, ban phát, ban thưởng, ban mai, ban chiều, ban sáng, ban nhạc
bàn bạc, bàn tay, bàn chân, bàn ghế, bàn cờ, bàn phím, bàn ăn, bàn giao, bàn luận, bàn thờ, bàn tán, bàn học, bàn chải, bàn thắng
bán hàng, bán buôn, bán lẻ, bán đảo, bán kính, bán cầu, bán nguyệt, bán chạy, bán rẻ, bán đấu, bán thân
bạn bè, bạn đời, bạn học, bạn thân, bạn gái, bạn trai, bạn hữu, bạn đọc, bạn đường, bạn hàng
bang giao, bang hội, bang chủ
bàng hoàng, bàng quan, bàng quang, bàng thính
báng bổ
bảng đen, bảng hiệu, bảng tên
banh trướng
bánh mì, bánh xe, bánh kẹo, bánh chưng, bánh giầy, bánh ngọt, bánh bao, bánh cuốn, bánh tét, bánh xèo, bánh đa, bánh trôi, bánh lái, bánh răng, bánh quy, bánh dày
bao la, bao gồm, bao bì, bao bọc, bao dung, bao giờ, bao nhiêu, bao quát, bao vây, bao tử, bao lâu, bao che, bao tay
bào chế, bào chữa, bào thai, bào ngư, bào mòn, bào tử
báo cáo, báo chí, báo động, báo hiệu, báo thù, báo đáp, báo tin, báo giá, báo hại, báo ân, báo thức, báo danh, báo mộng
bảo vệ, bảo đảm, bảo hiểm, bảo tàng, bảo quản, bảo trì, bảo hành, bảo tồn, bảo mật, bảo lãnh, bảo thủ, bảo trợ, bảo bối, bảo vật, bảo hộ, bảo an, bảo kê, bảo dưỡng, bảo toàn
bão táp, bão tố, bão hòa, bão lũ, bão bùng
bạo lực, bạo động, bạo loạn, bạo dạn, bạo chúa, bạo hành, bạo phát, bạo bệnh
bát ngát, bát cơm, bát đĩa, bát quái, bát canh, bát hương
bay bổng, bay lượn, bay nhảy, bay hơi, bay màu, bay mùi
bày tỏ, bày biện, bày vẽ, bày trò, bày bán
bảy màu
bắc cầu, bắc cực, bắc bộ, bắc phạt, bắc thang
bằng hữu, bằng lòng, bằng cấp, bằng chứng, bằng phẳng, bằng nhau, bằng khen, bằng lái, bằng hữu
bắt đầu, bắt buộc, bắt chước, bắt cóc, bắt nạt, bắt gặp, bắt tay, bắt bớ, bắt mắt, bắt nguồn, bắt giữ, bắt bẻ, bắt thăm, bắt nhịp
bậc thầy, bậc thang, bậc cửa
bầm dập, bầm tím
bấm bụng, bấm giờ, bấm nút, bấm chuông
bận rộn, bận bịu, bận lòng, bận tâm
bất ngờ, bất an, bất cẩn, bất công, bất động, bất hạnh, bất hòa, bất kể, bất lực, bất lợi, bất mãn, bất tử, bất tiện, bất tỉnh, bất thường, bất trị, bất tài, bất chấp, bất khuất, bất diệt, bất tận, bất biến, bất cập, bất chợt, bất ổn, bất quá
bậc nhất
bầu trời, bầu bạn, bầu cử, bầu chọn, bầu bĩnh, bầu rượu
bấy giờ, bấy lâu, bấy nhiêu
bẫy chuột
bé nhỏ, bé bỏng, bé con, bé xíu, bé tí
bẽ bàng
bên trong, bên ngoài, bên cạnh, bên kia, bên này, bên trên, bên dưới
bền bỉ, bền vững, bền chặt, bền lòng, bền gan
bến xe, bến tàu, bến cảng, bến đò, bến bờ, bến nước
bện chặt
bếp núc, bếp lửa, bếp ga, bếp điện, bếp trưởng
bệnh viện, bệnh nhân, bệnh tật, bệnh hoạn, bệnh án, bệnh lý, bệnh tình, bệnh dịch
bí mật, bí ẩn, bí quyết, bí thư, bí danh, bí đỏ, bí xanh, bí bách, bí hiểm, bí truyền
bì thư
bỉ ổi, bỉ cực
bị động, bị cáo, bị can, bị thương
bia mộ, bia rượu, bia đá
bích họa, bích báo
biên giới, biên bản, biên tập, biên độ, biên lai, biên chế, biên cương, biên phòng, biên soạn, biên dịch, biên ải
biến đổi, biến động, biến hóa, biến cố, biến dạng, biến mất, biến thái, biến tướng, biến chứng, biến thể, biến số
biển cả, biển khơi, biển báo, biển hiệu, biển đông, biển xanh, biển số, biển lửa, biển người
biện pháp, biện minh, biện luận, biện hộ, biện bạch, biện chứng
biếng nhác, biếng ăn
biết ơn, biết điều, biết đâu, biết bao, biết mấy, biết thân
biệt danh, biệt thự, biệt đội, biệt tài, biệt hiệu, biệt ly, biệt xứ, biệt tăm, biệt kích, biệt lập
biểu diễn, biểu hiện, biểu tình, biểu quyết, biểu tượng, biểu đồ, biểu cảm, biểu dương, biểu mẫu, biểu thị
bình an, bình đẳng, bình minh, bình thường, bình tĩnh, bình yên, bình dân, bình luận, bình chọn, bình phẩm, bình hoa, bình nước, bình dị, bình ổn, bình nguyên, bình phong, bình xét, bình thản, bình địa
binh lính, binh sĩ, binh đoàn, binh pháp, binh khí, binh biến, binh nghiệp, binh lửa
bênh vực
bò sữa, bò sát, bò rừng, bò tót, bò cạp
bó tay, bó buộc, bó hoa, bó gối
bỏ phiếu, bỏ qua, bỏ rơi, bỏ trốn, bỏ dở, bỏ cuộc, bỏ lỡ, bỏ học, bỏ bê, bỏ mặc, bỏ túi, bỏ thầu
bọ cạp, bọ ngựa, bọ rùa, bọ xít, bọ hung
bóc lột, bóc vỏ, bóc phốt, bóc mẽ
bọc lót
bói toán
bom đạn
bón phân
bóng đá, bóng bàn, bóng chuyền, bóng rổ, bóng tối, bóng đèn, bóng râm, bóng mát, bóng dáng, bóng bay, bóng gió, bóng ma, bóng loáng, bóng hình, bóng cây
bọt biển, bọt bóng
bô lão
bổ sung, bổ ích, bổ dưỡng, bổ nhiệm, bổ trợ, bổ đề, bổ khuyết, bổ ngữ
bộ đội, bộ trưởng, bộ phận, bộ môn, bộ mặt, bộ óc, bộ máy, bộ nhớ, bộ lạc, bộ tộc, bộ phim, bộ dạng, bộ xương, bộ đồ, bộ hành, bộ binh, bộ luật
bốc hơi, bốc cháy, bốc mùi, bốc đồng, bốc thăm, bốc vác, bốc dỡ, bốc phét
bối rối, bối cảnh
bồi thường, bồi dưỡng, bồi đắp, bồi hồi, bồi bàn, bồi bổ, bồi thẩm
bội bạc, bội thu, bội phần, bội tín, bội ước, bội số, bội nhiễm
bồn chồn, bồn tắm, bồn hoa, bồn rửa, bồn cầu
bốn phương, bốn mùa, bốn bể
bông hoa, bông lúa, bông đùa, bông tai, bông gòn, bông băng
bồng bềnh, bồng bột, bồng lai
bổng lộc
bỗng dưng, bỗng nhiên, bỗng chốc
bơ vơ, bơ phờ
bờ biển, bờ cõi, bờ vai, bờ sông, bờ hồ, bờ đê, bờ rào, bờ vực, bờ tre
bơi lội, bơi thuyền
bởi vì, bởi thế, bởi vậy
bớt xén
bụi bặm, bụi đời, bụi rậm, bụi phấn, bụi tre
bùn lầy, bùn đất
bún chả, bún bò, bún riêu, bún ốc, bún đậu
bùng nổ, bùng cháy, bùng phát
bụng dạ, bụng bầu
buồn bã, buồn rầu, buồn ngủ, buồn cười, buồn phiền, buồn tẻ, buồn chán, buồn nôn, buồn tênh, buồn thiu
buôn bán, buôn lậu, buôn làng
buổi sáng, buổi chiều, buổi tối, buổi trưa, buổi học, buổi lễ, buổi họp
buông tha, buông xuôi, buông thả, buông lơi
buồng trứng, buồng phổi, buồng lái, buồng ngủ
búp bê, búp sen
bút chì, bút mực, bút danh, bút pháp, bút ký, bút bi, bút lông, bút chiến, bút tích
bức tranh, bức tường, bức xúc, bức xạ, bức thư, bức bối, bức hại, bức ảnh
bực bội, bực mình, bực tức
bước đi, bước chân, bước ngoặt, bước đầu, bước tiến, bước sóng
bướm hoa
bướng bỉnh
bưu điện, bưu phẩm, bưu chính, bưu kiện, bưu thiếp
bữa ăn, bữa cơm, bữa tiệc, bữa sáng, bữa trưa, bữa tối
ca sĩ, ca hát, ca dao, ca khúc, ca ngợi, ca kịch, ca nô, ca trù, ca tụng, ca sĩ, ca từ
cà phê, cà chua, cà rốt, cà tím, cà vạt, cà khịa, cà kê, cà mèn
cá nhân, cá tính, cá biệt, cá cược, cá thể, cá voi, cá mập, cá heo, cá chép, cá rô, cá vàng, cá kho, cá khô, cá sấu, cá lóc
các bạn, các anh, các chị
cách mạng, cách thức, cách điệu, cách biệt, cách ly, cách ngôn, cách nhiệt, cách âm, cách trở, cách xa, cách chức
cạch mặt
cai trị, cai quản, cai nghiện, cai sữa, cai ngục
cài đặt, cài cắm
cái ác, cái đẹp, cái tôi, cái chết
cải cách, cải tạo, cải thiện, cải tiến, cải trang, cải lương, cải biên, cải tổ, cải chính, cải tử, cải bắp, cải xanh
cãi nhau, cãi vã, cãi lộn
cam kết, cam đoan, cam chịu, cam lòng, cam go, cam thảo, cam tâm
cảm ơn, cảm động, cảm giác, cảm hứng, cảm nhận, cảm tình, cảm xúc, cảm thông, cảm phục, cảm nghĩ, cảm tưởng, cảm kích, cảm hóa, cảm lạnh, cảm cúm, cảm biến, cảm quan, cảm thán, cảm tử
cám dỗ, cám ơn
can đảm, can thiệp, can ngăn, can trường, can tội, can dự, can hệ, can qua
càn quét, càn rỡ
cán bộ, cán cân, cán sự, cán bút
cản trở, cản phá
cạn kiệt, cạn lời, cạn tàu
càng ngày
cảng biển
canh gác, canh tác, canh giữ, canh cánh, canh chua, canh bạc, canh tân, canh khuya, canh me
cành cây, cành lá, cành hoa
cánh đồng, cánh tay, cánh cửa, cánh chim, cánh hoa, cánh gà, cánh diều, cánh quạt, cánh cụt
cảnh báo, cảnh sát, cảnh giác, cảnh quan, cảnh sắc, cảnh vật, cảnh tượng, cảnh ngộ, cảnh giới, cảnh cáo, cảnh vệ, cảnh trí
cạnh tranh, cạnh khóe
cao cả, cao cấp, cao điểm, cao độ, cao hứng, cao lớn, cao minh, cao nguyên, cao quý, cao răng, cao siêu, cao su, cao tầng, cao thủ, cao thượng, cao tốc, cao trào, cao xa, cao ốc, cao ráo, cao sang, cao kiến, cao vút
cáo già, cáo buộc, cáo trạng, cáo phó, cáo biệt, cáo lỗi
cạo râu, cạo gió
cát bụi, cát tường, cát cánh
cau mày, cau có
cày cấy, cày bừa, cày xới
căm thù, căm phẫn, căm hờn, căm ghét, căm tức
căn bản, căn cứ, căn hộ, căn phòng, căn nguyên, căn dặn, căn nhà, căn bệnh, căn cước, căn ke
cằn nhằn, cằn cỗi
cắn rứt, cắn răng, cắn câu
cẩn thận, cẩn trọng, cẩn mật
cận thị, cận vệ, cận chiến, cận cảnh, cận kề, cận đại
cấp cứu, cấp bách, cấp tốc, cấp phát, cấp độ, cấp bậc, cấp trên, cấp dưới, cấp thiết, cấp vốn, cấp ba, cấp hai
cập nhật, cập bến
cất cánh, cất giữ, cất giấu, cất nhắc, cất tiếng, cất công
câu chuyện, câu đố, câu hỏi, câu cá, câu nệ, câu thơ, câu văn, câu kết, câu giờ, câu đối
cầu nguyện, cầu thủ, cầu thang, cầu vồng, cầu cứu, cầu xin, cầu kỳ, cầu hôn, cầu may, cầu khẩn, cầu tiến, cầu treo, cầu lông, cầu toàn, cầu nối
cấu trúc, cấu tạo, cấu thành, cấu kết
cẩu thả
cây cối, cây cầu, cây xanh, cây số, cây bút, cây đàn, cây trồng, cây cảnh, cây gậy, cây nến, cây khế
cấy ghép
cha mẹ, cha con, cha ông, cha xứ, cha đẻ
chà đạp, chà xát
chả cá, chả giò, chả lụa
chai sạn, chai lọ
chải chuốt, chải tóc
chăm chỉ, chăm sóc, chăm chút, chăm lo, chăm bón, chăm chăm, chăm nom
chạm khắc, chạm trán, chạm mặt
chan hòa, chan chứa
chán nản, chán ghét, chán chường, chán ngán, chán đời, chán ngắt
chang chang
chàng trai, chàng rể
chanh chua, chanh leo, chanh dây
chánh án
chao đảo
cháo lòng, cháo gà
chào hỏi, chào mừng, chào đón, chào hàng, chào cờ, chào đời, chào giá
cháu chắt, cháu nội, cháu ngoại
chay tịnh
chạy bộ, chạy trốn, chạy đua, chạy chọt, chạy việc, chạy tiếp, chạy thử, chạy loạn
chắc chắn, chắc nịch, chắc ăn, chắc hẳn
chăn nuôi, chăn bông, chăn gối, chăn dắt, chăn màn
chặn đứng, chặn đường
chằng chịt
chặt chẽ, chặt chém
châm biếm, châm chọc, châm ngôn, châm cứu, châm chích, châm lửa
chầm chậm
chậm chạp, chậm trễ, chậm rãi, chậm tiến
chân thành, chân dung, chân lý, chân trời, chân tay, chân thật, chân chính, chân tình, chân không, chân dài, chân giò, chân vịt
chấn động, chấn thương, chấn chỉnh, chấn hưng, chấn song
chất lượng, chất liệu, chất độc, chất xám, chất phác, chất vấn, chất đống, chất béo, chất lỏng, chất khí
chật chội, chật hẹp, chật vật
châu báu, châu lục, châu thổ, châu chấu
chầu chực
che chở, che giấu, che đậy, che khuất, che chắn
chè xanh
chế biến, chế độ, chế tạo, chế ngự, chế giễu, chế tác, chế tài, chế phẩm
chê bai, chê cười, chê trách
chết đói, chết đuối, chết tiệt, chết chóc, chết điếng, chết lặng
chỉ huy, chỉ thị, chỉ tiêu, chỉ dẫn, chỉ đạo, chỉ định, chỉ số, chỉ trích, chỉ trỏ, chỉ điểm, chỉ vàng, chỉ thêu
chị em, chị gái, chị dâu, chị họ
chi tiết, chi phí, chi tiêu, chi nhánh, chi trả, chi phối, chi bộ, chi viện, chi li
chí khí, chí hướng, chí công, chí lý, chí thú, chí tình, chí tuyến
chìa khóa
chia sẻ, chia tay, chia cắt, chia lìa, chia buồn, chia rẽ, chia phần, chia ly
chích ngừa
chiếc lá, chiếc xe, chiếc thuyền
chiêm bao, chiêm ngưỡng, chiêm tinh
chiến đấu, chiến thắng, chiến tranh, chiến lược, chiến thuật, chiến sĩ, chiến dịch, chiến binh, chiến công, chiến hữu, chiến trường, chiến tích, chiến hạm, chiến xa, chiến khu
chiêng trống
chiều cao, chiều dài, chiều rộng, chiều sâu, chiều chuộng, chiều tà, chiều hướng, chiều lòng, chiều theo
chiếu sáng, chiếu cố, chiếu phim, chiếu chỉ, chiếu nghỉ, chiếu khán
chim chóc, chim cút, chim ưng, chim sẻ, chim én, chim non
chìm đắm, chìm nổi, chìm ngập
chín chắn, chín muồi
chinh phục, chinh chiến, chinh phạt
chính phủ, chính trị, chính sách, chính xác, chính thức, chính quyền, chính đáng, chính nghĩa, chính trực, chính diện, chính tả, chính chủ, chính quy, chính kiến, chính khách, chính văn
chỉnh tề, chỉnh sửa, chỉnh đốn, chỉnh lý, chỉnh trang, chỉnh hình
chịu đựng, chịu khó, chịu thua, chịu đòn, chịu trách
chó sói, chó săn, chó mèo
choáng váng, choáng ngợp
chói chang, chói lọi, chói tai
chọn lọc, chọn lựa
chóng mặt, chóng vánh
chống đối, chống chọi, chống cự, chống lại, chống đỡ, chống trả, chống chế, chống nạng
chồng chất, chồng chéo, chồng con
chỗ ngồi, chỗ dựa, chỗ ở, chỗ làm
chốn quê
chờ đợi, chờ mong, chờ chực
chở che, chở hàng
chợ búa, chợ đêm, chợ phiên, chợ quê, chợ trời, chợ nổi
chơi bời, chơi đùa, chơi khăm, chơi trội, chơi chữ, chơi vơi
chớp nhoáng, chớp mắt, chớp bóng
chủ nhân, chủ nghĩa, chủ quan, chủ động, chủ đề, chủ đạo, chủ tịch, chủ nhiệm, chủ nhật, chủ quyền, chủ trương, chủ yếu, chủ lực, chủ ý, chủ hộ, chủ nợ, chủ mưu, chủ thể, chủ ngữ, chủ quán
chú ý, chú thích, chú tâm, chú rể, chú giải
chua chát, chua cay, chua ngoa, chua xót
chùa chiền
chúa tể, chúa nhật
chuẩn bị, chuẩn mực, chuẩn xác, chuẩn hóa, chuẩn y
chúc mừng, chúc tụng, chúc phúc
chui rúc
chung cư, chung kết, chung thủy, chung sống, chung quanh, chung tay, chung chung, chung thân, chung vốn, chung kết
chúng ta, chúng tôi, chúng sinh, chúng mình
chuồn chuồn
chuông gió
chuột rút
chuyên gia, chuyên môn, chuyên nghiệp, chuyên cần, chuyên đề, chuyên chở, chuyên chế, chuyên khoa, chuyên ngành, chuyên quyền, chuyên trách, chuyên tâm, chuyên viên
chuyển động, chuyển giao, chuyển hóa, chuyển khoản, chuyển nhượng, chuyển tiếp, chuyển đổi, chuyển biến, chuyển hướng, chuyển nhà, chuyển phát
chuyện trò, chuyện phiếm, chuyện tình
chữ ký, chữ nghĩa, chữ viết, chữ số, chữ cái
chưa chắc
chửi bới, chửi rủa
chữa bệnh, chữa cháy, chữa trị, chữa lành
chức năng, chức vụ, chức danh, chức sắc, chức quyền
chứng chỉ, chứng cứ, chứng kiến, chứng minh, chứng nhận, chứng khoán, chứng thực, chứng từ, chứng bệnh, chứng tỏ
chương trình, chương mục
chướng ngại, chướng tai, chướng mắt
cố gắng, cố định, cố vấn, cố hương, cố ý, cố tình, cố chấp, cố đô, cố hữu, cố nhân, cố thủ, cố quốc
cổ điển, cổ động, cổ đông, cổ phần, cổ phiếu, cổ tích, cổ truyền, cổ vũ, cổ xưa, cổ kính, cổ đại, cổ họng, cổ tay, cổ chân, cổ áo, cổ hủ, cổ vật, cổ trang
cỗ máy, cỗ bàn
cối xay
cội nguồn, cội rễ
côn trùng, côn đồ
công an, công bằng, công bố, công cộng, công cụ, công dân, công danh, công đoàn, công hiệu, công khai, công lao, công lý, công nghệ, công nghiệp, công nhân, công nhận, công phu, công suất, công sức, công tác, công thức, công ty, công trình, công việc, công viên, công vụ, công chúa, công tử, công chức, công văn, công kích, công thương, công nợ, công đức, công ước, công an, công trường, công xưởng, công lập
cống hiến, cống rãnh, cống phẩm
cộng đồng, cộng sự, cộng tác, cộng hòa, cộng sản, cộng hưởng, cộng điểm
cơ bản, cơ hội, cơ quan, cơ sở, cơ thể, cơ cấu, cơ chế, cơ khí, cơ động, cơ man, cơ nghiệp, cơ ngơi, cơ duyên, cơ mật, cơ trưởng, cơ bắp, cơ cực, cơ hàn
cờ bạc, cờ vua, cờ tướng, cờ vây, cờ hiệu, cờ lau
cởi mở, cởi trói
cơm nước, cơm áo, cơm tấm, cơm chiên, cơm nắm, cơm hộp, cơm canh, cơm bữa
cớ sao
cửa hàng, cửa sổ, cửa khẩu, cửa ngõ, cửa biển, cửa hiệu, cửa chính, cửa quan
cựu chiến, cựu binh
cứng rắn, cứng cỏi, cứng đầu, cứng nhắc, cứng họng
cười cợt, cười đùa, cười nói, cười trừ
cưới hỏi, cưới xin
cướp bóc, cướp biển, cướp giật, cướp đoạt
cường quốc, cường độ, cường tráng, cường điệu, cường hào
cưỡng bức, cưỡng chế, cưỡng ép, cưỡng đoạt
cứu hộ, cứu trợ, cứu thương, cứu nạn, cứu tinh, cứu viện, cứu rỗi, cứu cánh, cứu hỏa, cứu nguy
cừu non
cự ly, cự tuyệt
cử chỉ, cử động, cử nhân, cử tri, cử hành, cử tạ
cụ thể, cụ già, cụ ông, cụ bà
cung cấp, cung điện, cung đình, cung kính, cung ứng, cung đường, cung thủ, cung phi, cung cầu
cùng nhau, cùng cực, cùng khổ, cùng đường
củng cố
cũng như
cuộc sống, cuộc đời, cuộc chiến, cuộc thi, cuộc họp, cuộc gọi
cuối cùng, cuối tuần, cuối năm, cuối tháng
cuốn sách, cuốn hút
cuồng nhiệt, cuồng phong, cuồng loạn, cuồng vọng, cuồng si
cúi đầu, cúi chào
củi lửa
cụm từ
cưng chiều
da diết, da thịt, da trời, da cam, da dẻ, da đen, da trắng, da beo
dã man, dã ngoại, dã tâm, dã thú, dã chiến, dã sử
dạ dày, dạ hội, dạ tiệc, dạ khúc, dạ quang, dạ con
dai dẳng, dai sức
dài dòng, dài hạn, dài lâu
dại dột, dại khờ
dám nghĩ
dàn nhạc, dàn xếp, dàn dựng, dàn trải
dán mắt
dạn dĩ
dang dở, dang tay
dáng vẻ, dáng điệu, dáng người
danh dự, danh hiệu, danh lam, danh sách, danh tiếng, danh từ, danh nghĩa, danh phận, danh vọng, danh nhân, danh mục, danh thiếp, danh hài, danh tướng, danh y, danh giá
dành dụm, dành riêng
dao động, dao kéo, dao găm, dao phay
dạo chơi, dạo này, dạo bước, dạo phố, dạo đầu
dạy bảo, dạy dỗ, dạy học, dạy nghề, dạy kèm
dày dặn, dày công, dày đặc, dày vò
dắt díu
dặn dò
dằn vặt, dằn mặt
dâm dục, dâm đãng
dầm dề, dầm mưa
dân tộc, dân chủ, dân số, dân gian, dân sự, dân cư, dân quân, dân chúng, dân ca, dân trí, dân dụng, dân sinh, dân phòng, dân làng, dân quyền, dân vận
dẫn dắt, dẫn đầu, dẫn đường, dẫn chứng, dẫn độ, dẫn giải, dẫn lối, dẫn truyền
dấn thân
dần dần
dập dìu, dập dờn, dập tắt
dấu hiệu, dấu vết, dấu chân, dấu ấn, dấu chấm, dấu phẩy, dấu hỏi
dầu ăn, dầu mỏ, dầu khí, dầu gội, dầu gió, dầu hỏa, dầu nhớt
dây dưa, dây điện, dây chuyền, dây cáp, dây thừng, dây leo, dây xích, dây đàn, dây chun
dậy sớm
dễ dàng, dễ chịu, dễ thương, dễ dãi, dễ tính, dễ coi, dễ sợ, dễ dụ
dệt may, dệt kim, dệt vải
di chuyển, di sản, di tích, di truyền, di cư, di dân, di động, di chúc, di vật, di dời, di ảnh, di căn, di hài
dì ghẻ
dí dỏm
dị ứng, dị dạng, dị thường, dị nghị, dị biệt, dị bản, dị giáo
dĩ nhiên, dĩ vãng
dìu dắt, dìu dặt
dịu dàng, dịu ngọt, dịu êm, dịu hiền
dịch vụ, dịch bệnh, dịch thuật, dịch giả, dịch chuyển, dịch tễ
diễn viên, diễn đàn, diễn đạt, diễn biến, diễn giả, diễn tập, diễn thuyết, diễn xuất, diễn văn, diễn kịch, diễn tả, diễn giải
diện tích, diện mạo, diện kiến
diệt vong, diệt trừ, diệt chủng, diệt khuẩn
diều hâu
diệu kỳ
dinh dưỡng, dinh thự, dinh điền
dính líu, dính dáng
do dự, do thám
dò xét, dò hỏi, dò la, dò dẫm, dò tìm
dọa nạt, dọa dẫm
doanh nghiệp, doanh nhân, doanh thu, doanh số, doanh trại, doanh lợi
dọn dẹp, dọn nhà
dòng sông, dòng họ, dòng điện, dòng chảy, dòng máu, dòng dõi, dòng chữ, dòng nước
dồi dào
dối trá, dối gian
dồn dập, dồn nén
dông dài, dông tố
dỗ dành
dốc lòng, dốc sức, dốc ngược
dội bom
dở dang, dở hơi, dở tệ, dở chứng
dời đô
dũng cảm, dũng khí, dũng sĩ, dũng mãnh
dụng cụ, dụng tâm, dụng ý, dụng binh
dung dịch, dung hòa, dung lượng, dung mạo, dung nạp, dung tích, dung túng, dung thân, dung nham
dùng bữa
duy nhất, duy trì, duy tâm, duy vật, duy mỹ
duyên dáng, duyên phận, duyên nợ, duyên số, duyên hải, duyên cớ
duyệt binh
dư luận, dư dật, dư thừa, dư âm, dư địa, dư vị, dư giả, dư nợ, dư đồ
dữ dội, dữ kiện, dữ liệu, dữ tợn
dự án, dự báo, dự bị, dự đoán, dự định, dự kiến, dự phòng, dự thảo, dự thi, dự tính, dự toán, dự trữ, dự luật, dự cảm, dự giờ, dự khán
dựa dẫm
dừa xiêm
dựng nghiệp
dược liệu, dược phẩm, dược sĩ, dược thảo
dưới đất
dương cầm, dương lịch, dương tính, dương liễu, dương xỉ
dưỡng sinh, dưỡng chất, dưỡng khí, dưỡng lão, dưỡng da
đa dạng, đa số, đa năng, đa phần, đa tạ, đa tình, đa nghi, đa sầu, đa mưu
đà điểu
đá bóng, đá quý, đá vôi, đá lạnh, đá cầu
đả kích, đả thông, đả phá, đả động
đã đời
đại biểu, đại chúng, đại diện, đại dương, đại gia, đại học, đại hội, đại lý, đại lộ, đại sứ, đại tá, đại tướng, đại úy, đại khái, đại loại, đại ngàn, đại nghĩa, đại sự, đại tiện, đại từ, đại số, đại án, đại công, đại gia
đài các, đài thọ
đãi ngộ, đãi khách
đam mê
đàm phán, đàm thoại, đàm đạo, đàm tiếu
đảm bảo, đảm đang, đảm nhận, đảm nhiệm, đảm trách
đám cưới, đám ma, đám đông, đám cháy, đám mây, đám tang
đàn ông, đàn bà, đàn hồi, đàn áp, đàn anh, đàn em, đàn hát, đàn tranh, đàn bầu, đàn ghi
đạn dược
đang khi
đảng viên, đảng phái, đảng bộ
đáng kể, đáng yêu, đáng ghét, đáng sợ, đáng tin, đáng giá, đáng tiếc, đáng thương, đáng đời
đanh đá, đanh thép
đánh bạc, đánh bại, đánh bắt, đánh cắp, đánh dấu, đánh giá, đánh đổi, đánh nhau, đánh rơi, đánh thức, đánh vần, đánh máy, đánh đập, đánh đố, đánh lừa, đánh liều, đánh bóng
đào tạo, đào thải, đào tẩu, đào hoa, đào ngũ, đào sâu, đào bới, đào hố
đảo chính, đảo lộn, đảo ngược, đảo quốc, đảo điên, đảo mắt
đạo đức, đạo lý, đạo diễn, đạo luật, đạo văn, đạo hàm, đạo sĩ, đạo giáo, đạo nghĩa, đạo hiếu, đạo tặc, đạo quân, đạo cụ
đáp án, đáp ứng, đáp lễ, đáp trả, đáp số
đạp xe
đau đớn, đau khổ, đau lòng, đau buồn, đau thương, đau xót, đau đầu, đau bụng, đau ốm, đau răng
đáy biển, đáy lòng
đặc biệt, đặc điểm, đặc sản, đặc sắc, đặc trưng, đặc quyền, đặc tính, đặc vụ, đặc san, đặc ân, đặc cách, đặc nhiệm, đặc thù, đặc xá
đăng ký, đăng quang, đăng tải, đăng đàn
đắm đuối, đắm say, đắm chìm
đằm thắm
đắn đo
đăng tin
đắng cay, đắng chát
đắp đập
đặt cược, đặt hàng, đặt tên, đặt cọc, đặt chỗ
đâm chém, đâm sầm
đầm ấm, đầm lầy, đầm đìa
đậm đà, đậm đặc
đần độn
đập phá, đập tan
đất đai, đất nước, đất liền, đất trời, đất sét, đất khách, đất mẹ, đất thánh, đất hứa
đầu bếp, đầu óc, đầu tiên, đầu tư, đầu tàu, đầu hàng, đầu mối, đầu nguồn, đầu đàn, đầu gối, đầu đời, đầu lòng, đầu não, đầu cơ, đầu độc, đầu quân
đấu tranh, đấu giá, đấu thầu, đấu trường, đấu sĩ, đấu khẩu, đấu trí, đấu tố
đậu phụ, đậu xanh, đậu đen, đậu nành, đậu phộng
đây đó
đầy đủ, đầy đặn, đầy ắp, đầy tớ, đầy rẫy
đẩy mạnh, đẩy lùi, đẩy nhanh
đe dọa, đe nẹt
đè nén, đè bẹp
đẹp đẽ, đẹp trai, đẹp lòng, đẹp mắt
đen tối, đen đủi, đen sì
đèn pin, đèn đường, đèn lồng, đèn dầu, đèn điện, đèn bàn
đế quốc, đế chế, đế vương, đế giày
để dành, để tâm, để ý, để lại
đề án, đề bài, đề cao, đề cập, đề cử, đề nghị, đề phòng, đề tài, đề xuất, đề thi, đề can, đề kháng
đệ tử, đệ nhất, đệ trình
đêm khuya, đêm nay, đêm đông, đêm trắng, đêm thâu
đếm xỉa
đến nơi, đến nỗi
đền bù, đền đáp, đền thờ, đền tội, đền ơn
đi bộ, đi chơi, đi học, đi làm, đi lại, đi đường, đi vắng, đi xa, đi săn, đi tu, đi lạc, đi dạo, đi văng
địa cầu, địa chỉ, địa danh, địa hình, địa lý, địa phương, địa vị, địa ngục, địa chủ, địa bàn, địa điểm, địa chất, địa đạo, địa thế, địa ốc
điểm danh, điểm số, điểm tâm, điểm tựa, điểm yếu, điểm mạnh, điểm hẹn, điểm báo, điểm xuyết
điên cuồng, điên rồ, điên đảo, điên tiết, điên loạn
điện ảnh, điện thoại, điện tử, điện lực, điện năng, điện tín, điện thờ, điện áp, điện trở, điện báo, điện hạ
điều chỉnh, điều động, điều hành, điều hòa, điều khiển, điều kiện, điều lệ, điều tra, điều trị, điều độ, điều phối, điều tiết, điều chế
điệu bộ, điệu nhảy, điệu đà, điệu hát
đinh ninh
đình chỉ, đình công, đình đám, đình làng, đình trệ
đính hôn, đính kèm, đính chính
định cư, định hướng, định kiến, định lý, định mệnh, định nghĩa, định giá, định kỳ, định luật, định vị, định lượng, định hình, định đoạt
đỉnh cao, đỉnh núi, đỉnh điểm
đo đạc, đo lường
đỏ mặt, đỏ thắm, đỏ tươi, đỏ ửng, đỏ chót
đọc sách, đọc báo, đọc thầm
đói khát, đói khổ, đói nghèo, đói rét
đòi hỏi, đòi nợ
đoàn kết, đoàn thể, đoàn tụ, đoàn viên, đoàn tàu, đoàn quân, đoàn xe
đoán chừng, đoán mò
đoạn tuyệt, đoạn đường, đoạn văn, đoạn trường
đón tiếp, đón chào, đón đầu, đón dâu
đóng góp, đóng cửa, đóng kịch, đóng phim, đóng vai, đóng băng, đóng gói, đóng quân, đóng thuế
đồ ăn, đồ chơi, đồ dùng, đồ đạc, đồ họa, đồ uống, đồ cổ, đồ án, đồ nghề, đồ thị, đồ tể, đồ đệ, đồ sộ, đồ hộp
đổ vỡ, đổ máu, đổ bộ, đổ lỗi, đổ nát, đổ xăng
độ lượng, độ ẩm, độ cao, độ dài, độ tuổi, độ sâu
độc lập, độc đáo, độc giả, độc hại, độc tài, độc thân, độc quyền, độc ác, độc đoán, độc dược, độc tố, độc tấu, độc thoại, độc chiếm, độc đắc
đôi khi, đôi mắt, đôi bạn, đôi co, đôi lứa, đôi đũa
đối diện, đối đầu, đối mặt, đối phó, đối tác, đối thủ, đối tượng, đối xử, đối ngoại, đối lập, đối chiếu, đối thoại, đối kháng, đối ứng, đối xứng
đồi núi, đồi trọc
đổi mới, đổi thay, đổi chác
đội ngũ, đội trưởng, đội tuyển, đội viên, đội hình, đội bóng, đội quân
đông đúc, đông đảo, đông y, đông dược, đông lạnh, đông nam, đông bắc, đông phương, đông người, đông vui
đồng bào, đồng chí, đồng đội, đồng hồ, đồng hương, đồng nghiệp, đồng ruộng, đồng tiền, đồng tình, đồng ý, đồng phục, đồng thời, đồng minh, đồng bằng, đồng cỏ, đồng hành, đồng loạt, đồng nghĩa, đồng âm, đồng điệu, đồng lòng, đồng môn, đồng thuận, đồng xu, đồng quê, đồng bộ, đồng dạng, đồng thau, đồng tử
động cơ, động đất, động lực, động vật, động viên, động tác, động mạch, động não, động tĩnh, động từ, động thái, động phòng
đơn giản, đơn độc, đơn vị, đơn côi, đơn sơ, đơn điệu, đơn thuần, đơn phương, đơn hàng, đơn thuốc
đờn ca
đợt sóng
đu đủ, đu quay, đu dây
đúc kết
đùa giỡn, đùa cợt
đua đòi, đua tranh, đua xe
đức hạnh, đức tính, đức tin, đức độ
đủ điều, đủ đầy
đúng đắn, đúng giờ, đúng hẹn, đúng mực
đuổi bắt, đuổi việc
đức vua
được mùa, được việc
đường đi, đường phố, đường sá, đường xá, đường thẳng, đường cong, đường kính, đường hầm, đường sắt, đường bay, đường biển, đường dây, đường lối, đường mòn, đường phèn, đường ray, đường tắt, đường đời
đương đại, đương nhiên, đương sự, đương đầu, đương chức, đương thời
đứng đắn, đứng đầu, đứng tuổi
em bé, em út, em gái, em trai, em họ
êm ái, êm đềm, êm dịu, êm ả, êm ấm, êm tai
ếch nhái
gà con, gà mái, gà trống, gà rán, gà luộc, gà gáy, gà tây, gà chọi
gác chuông, gác mái, gác xép, gác cổng
gạch ngói, gạch đá, gạch chân
gai góc, gai mắt
gái quê
gan dạ, gan góc, gan lì
gán ghép, gán nợ
gần gũi, gần đây, gần xa
gánh nặng, gánh vác, gánh hát, gánh hàng
gạo nếp, gạo tẻ, gạo lứt
gào thét
gay gắt, gay go, gay cấn
gắn bó, gắn kết, gắn liền
gắng sức, gắng gượng
gặp gỡ, gặp mặt, gặp nạn
gắt gỏng, gắt gao
gấp gáp, gấp rút, gấp đôi, gấp bội
gật đầu, gật gù
gầy gò, gầy yếu, gầy còm
gây gổ, gây hấn, gây quỹ, gây dựng, gây mê, gây sự
gậy gộc
ghe thuyền
ghen tuông, ghen ghét, ghen tị
ghê gớm, ghê tởm, ghê rợn
ghế đá, ghế dài, ghế đẩu
ghét bỏ
ghi chép, ghi nhận, ghi nhớ, ghi danh, ghi âm, ghi hình, ghi điểm, ghi bàn, ghi công
ghép đôi, ghép nối, ghép tạng, ghép cây
gia đình, gia cảnh, gia chủ, gia công, gia dụng, gia giáo, gia hạn, gia nhập, gia phả, gia sư, gia súc, gia tài, gia tăng, gia tộc, gia truyền, gia vị, gia cầm, gia sản, gia trưởng, gia phong, gia nhân, gia tốc, gia cố, gia đạo
già cả, già nua, già dặn, già làng, già yếu
giá cả, giá trị, giá rẻ, giá đỡ, giá lạnh, giá vẽ, giá thành, giá sách
giả dối, giả định, giả mạo, giả thuyết, giả vờ, giả tạo, giả trang, giả danh, giả sử, giả bộ, giả thiết, giả kim
giã từ, giã biệt
giác ngộ, giác quan, giác mạc
giai cấp, giai điệu, giai đoạn, giai nhân, giai thoại
giải trí, giải pháp, giải quyết, giải thích, giải thưởng, giải phóng, giải đáp, giải tán, giải cứu, giải khát, giải nhiệt, giải phẫu, giải mã, giải ngân, giải thoát, giải trình, giải vây, giải nghệ, giải hòa, giải lao, giải độc, giải nhất
giam cầm, giam giữ, giam lỏng
giám đốc, giám sát, giám khảo, giám định, giám thị, giám hộ, giám mục
giảm giá, giảm thiểu, giảm sút, giảm nhẹ, giảm cân, giảm tốc, giảm thuế
gian dối, gian khổ, gian lận, gian nan, gian hàng, gian manh, gian xảo, gian trá, gian truân, gian phòng, gian tà
giản dị, giản đơn, giản lược, giản tiện
giãn nở, giãn cách
gián điệp, gián đoạn, gián tiếp
giang hồ, giang sơn, giang mai
giảng dạy, giảng đường, giảng viên, giảng giải, giảng hòa
giáng sinh, giáng chức, giáng trần
giành giật
giao tiếp, giao thông, giao lưu, giao dịch, giao hàng, giao kèo, giao hảo, giao hưởng, giao lộ, giao phó, giao thừa, giao ban, giao du, giao chiến, giao điểm, giao hẹn, giao thoa, giao nộp
giáo dục, giáo viên, giáo sư, giáo trình, giáo án, giáo khoa, giáo lý, giáo hội, giáo phái, giáo dân, giáo đường, giáo điều, giáo huấn, giáo hoàng
giàu có, giàu sang, giàu mạnh
giày dép, giày vải, giày da, giày vò
giặc giã
giặt giũ
giấc mơ, giấc ngủ, giấc mộng
giận dữ, giận hờn, giận dỗi
giấu giếm, giấu tên
giấy tờ, giấy phép, giấy bạc, giấy báo, giấy mời, giấy khen, giấy vụn, giấy nháp
gieo trồng, gieo rắc, gieo mạ
giết hại, giết chóc
giếng nước, giếng khoan
gìn giữ
giỏi giang
giọng nói, giọng hát, giọng điệu
giông bão, giông tố
giống nòi, giống hệt, giống loài
giờ giấc, giờ đây, giờ học, giờ nghỉ
giới hạn, giới thiệu, giới tính, giới tuyến, giới trẻ, giới nghiêm
giữ gìn, giữ chỗ, giữ lời, giữ nhà, giữ kẽ
giúp đỡ, giúp việc, giúp sức
giường ngủ, giường chiếu, giường bệnh
góc cạnh, góc nhìn, góc phố, góc khuất
góp ý, góp sức, góp mặt, góp vốn, góp phần, góp nhặt
gối đầu, gối ôm
gốc rễ, gốc gác, gốc cây
gỗ quý, gỗ lim
gội đầu
gốm sứ
gợi ý, gợi cảm, gợi nhớ, gợi mở
gửi gắm, gửi tiền, gửi thư
gương mặt, gương mẫu, gương soi, gương sáng
gượng gạo, gượng ép
hà khắc, hà tiện, hà mã, hà hơi
hạ cánh, hạ giá, hạ màn, hạ sát, hạ tầng, hạ thấp, hạ nhiệt, hạ lưu, hạ tuần, hạ thủ, hạ sách, hạ huyệt, hạ thổ
hạch toán, hạch sách
hai bên, hai lòng
hài hòa, hài hước, hài lòng, hài kịch, hài cốt, hài tử
hái lượm, hái lộc
hải quân, hải sản, hải cảng, hải đảo, hải ngoại, hải phận, hải quan, hải dương, hải âu, hải đăng, hải tặc, hải lý, hải cẩu
hãi hùng
hại não
ham mê, ham muốn, ham chơi, ham học, ham vui, ham hố
hàm ý, hàm số, hàm răng, hàm ơn, hàm lượng, hàm súc, hàm oan
hãm hại, hãm phanh
hạm đội
hạn chế, hạn hán, hạn mức, hạn định, hạn ngạch, hạn hẹp
hang động, hang ổ
hàng hóa, hàng ngày, hàng xóm, hàng không, hàng rào, hàng đầu, hàng hải, hàng quán, hàng loạt, hàng ngũ, hàng tháng, hàng năm, hàng tuần, hàng rong, hàng giả
hãng phim
hạng mục, hạng nhất
hanh khô, hanh thông
hành chính, hành động, hành hạ, hành khách, hành lang, hành lý, hành tinh, hành trình, hành vi, hành nghề, hành quân, hành hình, hành hương, hành tung, hành tây, hành pháp, hành văn
hạnh phúc, hạnh kiểm, hạnh ngộ, hạnh nhân
hào hoa, hào hùng, hào phóng, hào quang, hào hứng, hào kiệt, hào nhoáng, hào khí
háo hức, háo thắng
hảo hán, hảo tâm, hảo hạng
hát hò, hát ru, hát văn, hát xẩm
hạt giống, hạt nhân, hạt điều, hạt tiêu, hạt dẻ, hạt cơm, hạt bụi
hay ho, hay hớm
hằng ngày, hằng năm, hằng số
hăng hái, hăng say, hăng máu
hẳn hoi
hắt hủi, hắt hơi
hầm mỏ, hầm hố, hầm trú
hân hạnh, hân hoan
hận thù
hấp dẫn, hấp thụ, hấp thu, hấp tấp, hấp hối
hậu quả, hậu duệ, hậu phương, hậu đậu, hậu cần, hậu vệ, hậu thuẫn, hậu đãi, hậu môn, hậu sinh, hậu trường, hậu thế, hậu hĩnh
hẻm núi
hèn nhát, hèn hạ, hèn mọn
hẹn hò, hẹn gặp
hẹp hòi
hết sức, hết lòng, hết hạn, hết hồn
hệ thống, hệ quả, hệ số, hệ lụy, hệ phái, hệ trọng
hiền lành, hiền hòa, hiền hậu, hiền từ, hiền thục, hiền tài, hiền triết, hiền minh
hiến pháp, hiến chương, hiến máu, hiến kế, hiến dâng, hiến tặng
hiểm họa, hiểm nguy, hiểm trở, hiểm ác, hiểm hóc
hiếm hoi, hiếm muộn
hiện đại, hiện tại, hiện thực, hiện tượng, hiện trường, hiện hành, hiện diện, hiện hữu, hiện trạng, hiện vật, hiện thân, hiện hình, hiện nay
hiệp hội, hiệp định, hiệp sĩ, hiệp lực, hiệp ước, hiệp khách, hiệp nghĩa
hiệu quả, hiệu trưởng, hiệu lực, hiệu suất, hiệu ứng, hiệu chỉnh, hiệu đính, hiệu lệnh
hiểu biết, hiểu lầm, hiểu ý, hiểu thấu
hiếu học, hiếu khách, hiếu thảo, hiếu động, hiếu kỳ, hiếu thắng, hiếu chiến, hiếu sinh, hiếu nghĩa
hình ảnh, hình dáng, hình dung, hình học, hình mẫu, hình phạt, hình sự, hình thức, hình thành, hình tượng, hình hài, hình nộm, hình xăm, hình nền
hít thở
hò hẹn, hò hét, hò reo
họ hàng, họ tên, họ tộc
hoa hồng, hoa hậu, hoa lá, hoa quả, hoa văn, hoa mỹ, hoa tai, hoa khôi, hoa đào, hoa mai, hoa sen, hoa cúc, hoa lan, hoa giấy, hoa tiêu, hoa liễu
hòa bình, hòa giải, hòa hợp, hòa nhập, hòa thuận, hòa tan, hòa âm, hòa nhạc, hòa khí, hòa đồng, hòa hoãn, hòa ước, hòa vốn
hóa chất, hóa học, hóa đơn, hóa trang, hóa thạch, hóa giải, hóa thân, hóa trị
họa sĩ, họa tiết, họa mi, họa báo, họa hoằn
hoài bão, hoài nghi, hoài niệm, hoài cổ, hoài công
hoan hô, hoan nghênh, hoan lạc
hoàn cảnh, hoàn chỉnh, hoàn hảo, hoàn tất, hoàn thành, hoàn thiện, hoàn toàn, hoàn mỹ, hoàn trả, hoàn lương, hoàn vũ, hoàn cầu
hoãn binh
hoạn nạn, hoạn quan
hoang dã, hoang mang, hoang phí, hoang tàn, hoang vắng, hoang đường, hoang vu, hoang sơ, hoang tưởng, hoang dại
hoàng hôn, hoàng hậu, hoàng tử, hoàng đế, hoàng cung, hoàng gia, hoàng thượng, hoàng kim, hoàng thành
hoảng hốt, hoảng loạn, hoảng sợ
hoạt động, hoạt hình, hoạt bát, hoạt chất
hoặc là
học bổng, học hành, học hỏi, học phí, học sinh, học tập, học thuật, học viên, học vấn, học vị, học kỳ, học trò, học giả, học đường, học thuyết, học bạ
hỏi han, hỏi thăm, hỏi đáp, hỏi cung
hòm thư
hỏng hóc
hồ nước, hồ sơ, hồ bơi, hồ đồ, hồ hởi, hồ điệp, hồ tiêu, hồ ly
hổ báo, hổ thẹn, hổ phách
hộ chiếu, hộ khẩu, hộ tống, hộ vệ, hộ lý, hộ sinh, hộ pháp
hỗ trợ, hỗ tương
hốc hác
hối hận, hối lộ, hối thúc, hối hả, hối cải, hối đoái
hồi hộp, hồi phục, hồi ký, hồi sinh, hồi tưởng, hồi âm, hồi hương, hồi giáo, hồi đáp, hồi môn, hồi sức
hội họa, hội họp, hội nghị, hội thảo, hội trường, hội viên, hội chợ, hội đồng, hội tụ, hội ngộ, hội chứng, hội thoại, hội nhập, hội quán, hội ý
hôm nay, hôm qua, hôm sau, hôm trước
hôn nhân, hôn lễ, hôn mê, hôn ước, hôn phu, hôn thê
hỗn loạn, hỗn hợp, hỗn độn, hỗn chiến, hỗn láo, hỗn hào, hỗn tạp
hồn nhiên, hồn phách
hồng hào, hồng nhan, hồng phúc, hồng quân, hồng trần, hồng tâm, hồng ngọc, hồng cầu, hồng hoang
hơi thở, hơi nước, hơi men, hơi ấm
hờn dỗi, hờn ghen
hợp đồng, hợp lý, hợp tác, hợp pháp, hợp nhất, hợp tình, hợp thời, hợp xướng, hợp âm, hợp lệ, hợp chất, hợp kim, hợp thức
hớt hải
hùng biện, hùng dũng, hùng hậu, hùng vĩ, hùng mạnh, hùng tráng, hùng cường, hùng hồn
hung dữ, hung hăng, hung thủ, hung tin, hung bạo, hung ác, hung thần
huấn luyện, huấn thị
húc đầu
huy chương, huy hiệu, huy động, huy hoàng
hủy bỏ, hủy diệt, hủy hoại
huyền bí, huyền thoại, huyền ảo, huyền diệu, huyền sử, huyền học
huyết áp, huyết thống, huyết mạch, huyết thanh, huyết tương
huynh đệ, huynh trưởng
hư hỏng, hư cấu, hư danh, hư vô, hư hại, hư không, hư ảo
hứa hẹn, hứa hôn
hưng thịnh, hưng phấn, hưng vượng
hứng thú, hứng khởi
hương thơm, hương vị, hương liệu, hương hoa, hương lửa, hương án, hương quê
hướng dẫn, hướng đi, hướng nội, hướng ngoại, hướng thiện, hướng dương
hưởng thụ, hưởng ứng, hưởng lạc, hưởng lợi
hữu ích, hữu hạn, hữu hình, hữu nghị, hữu tình, hữu dụng, hữu cơ, hữu duyên
ích kỷ, ích lợi
im lặng, im ắng, im lìm
in ấn, in đậm
ít ỏi, ít khi
kem dưỡng, kem que
kém cỏi
kèm cặp
kéo co, kéo dài
kẻ thù, kẻ trộm, kẻ cắp, kẻ gian
kẽ hở, kẽ tay
kế hoạch, kế toán, kế thừa, kế tiếp, kế sách, kế tục, kế mẫu, kế nhiệm
kể chuyện, kể lể
kênh rạch, kênh đào
kết quả, kết thúc, kết luận, kết hợp, kết nối, kết bạn, kết hôn, kết cấu, kết đoàn, kết nạp, kết duyên, kết tinh, kết tội, kết toán
kêu gọi, kêu ca, kêu cứu, kêu oan
khá giả
khả năng, khả ái, khả thi, khả quan, khả nghi, khả kính
khác biệt, khác nhau, khác thường
khách hàng, khách sạn, khách quan, khách mời, khách quý, khách khứa, khách thể
khai báo, khai giảng, khai mạc, khai phá, khai sinh, khai thác, khai trương, khai hoang, khai thông, khai hỏa, khai sáng, khai tâm, khai quật
khái niệm, khái quát
khám phá, khám bệnh, khám xét, khám nghiệm
khán giả, khán đài, khán phòng
khang trang
kháng chiến, kháng cự, kháng sinh, kháng nghị, kháng cáo, kháng thể
khao khát
khảo sát, khảo cổ, khảo nghiệm, khảo thí
khát vọng, khát khao
khắc khổ, khắc nghiệt, khắc phục, khắc sâu, khắc ghi, khắc tinh, khắc họa
khăn quàng, khăn tay, khăn mặt, khăn tắm
khẳng định
khắp nơi
khâm phục
khẩn cấp, khẩn trương, khẩn thiết, khẩn cầu, khẩn hoang
khấp khởi
khẩu hiệu, khẩu trang, khẩu vị, khẩu súng, khẩu phần, khẩu cung, khẩu khí, khẩu lệnh
khe khắt, khe núi, khe hở
khen thưởng, khen ngợi
khéo léo, khéo tay
khép kín
khi nào
khí hậu, khí phách, khí thế, khí tượng, khí quyển, khí chất, khí giới, khí công
khiêm tốn, khiêm nhường
khiến cho
khiển trách
khiêu vũ, khiêu khích, khiêu dâm
khinh bỉ, khinh miệt, khinh suất, khinh khí
khó khăn, khó chịu, khó tính, khó coi, khó nhọc, khó xử, khó hiểu, khó nói
khóa học, khóa luận, khóa sổ, khóa chặt
khoa học, khoa cử, khoa trương, khoa bảng
khoai lang, khoai tây, khoai môn, khoai mì
khoái lạc, khoái chí
khoan dung, khoan hồng, khoan thai, khoan nhượng
khoản vay, khoản tiền
khoảng cách, khoảng không, khoảng trống
khóc lóc, khóc than
khỏe mạnh, khỏe khoắn
khô khan, khô cằn, khô héo, khô ráo, khô hạn
khổ sở, khổ cực, khổ đau, khổ tâm, khổ luyện, khổ qua, khổ hạnh
khốc liệt
khối lượng, khối óc
khôi phục, khôi hài, khôi ngô
không khí, không gian, không quân, không trung, không tưởng, không thể, không ngờ, không những
khống chế
khờ dại, khờ khạo
khởi đầu, khởi động, khởi hành, khởi nghĩa, khởi nghiệp, khởi sắc, khởi công, khởi tố, khởi xướng
khu vực, khu phố, khu vườn, khu rừng
khuất phục, khuất tất
khúc khích, khúc mắc, khúc ca, khúc xạ
khuôn mặt, khuôn khổ, khuôn mẫu, khuôn phép
khuyên bảo, khuyên răn, khuyên nhủ
khuyến khích, khuyến mãi, khuyến học, khuyến nông, khuyến cáo
khuyết điểm, khuyết tật
khủng hoảng, khủng khiếp, khủng bố, khủng long
khuya khoắt
khứ hồi
kích thích, kích thước, kích động, kích hoạt, kích cỡ
kịch bản, kịch liệt, kịch tính, kịch nói
kiêm nhiệm
kiềm chế, kiềm tỏa
kiểm tra, kiểm soát, kiểm điểm, kiểm định, kiểm kê, kiểm duyệt, kiểm toán, kiểm lâm, kiểm chứng
kiếm tiền, kiếm hiệp, kiếm sống, kiếm ăn, kiếm khách
kiên cố, kiên định, kiên nhẫn, kiên quyết, kiên trì, kiên cường, kiên gan
kiến thức, kiến trúc, kiến nghị, kiến tạo, kiến giải, kiến hiệu, kiến lửa
kiện toàn, kiện cáo, kiện tướng, kiện hàng
kiệt tác, kiệt sức, kiệt quệ, kiệt xuất
kiêu ngạo, kiêu hãnh, kiêu căng, kiêu sa, kiêu kỳ
kiểu dáng, kiểu cách, kiểu mẫu
kim cương, kim loại, kim chỉ, kim tiền, kim ngạch, kim ngân, kim châm
kín đáo, kín kẽ
kinh doanh, kinh tế, kinh nghiệm, kinh điển, kinh hoàng, kinh khủng, kinh ngạc, kinh dị, kinh đô, kinh thành, kinh phí, kinh kệ, kinh nguyệt, kinh độ, kinh tuyến, kinh qua, kinh sợ, kinh lược
kính trọng, kính phục, kính nể, kính mến, kính lúp, kính râm, kính cận, kính thưa
kịp thời, kịp lúc
kỳ diệu, kỳ lạ, kỳ thi, kỳ quặc, kỳ vọng, kỳ công, kỳ tích, kỳ quan, kỳ nghỉ, kỳ thị, kỳ cục, kỳ hạn, kỳ cựu, kỳ ảo, kỳ lân
kỷ luật, kỷ niệm, kỷ lục, kỷ cương, kỷ vật, kỷ yếu, kỷ nguyên
kỹ năng, kỹ thuật, kỹ sư, kỹ lưỡng, kỹ càng, kỹ xảo
ký ức, ký túc, ký tên, ký kết, ký giả, ký sự, ký hiệu
la bàn, la hét, la mắng, la cà
lá cờ, lá thư, lá chắn, lá phổi, lá bài, lá gan, lá cây, lá số
lạ lùng, lạ kỳ, lạ mặt, lạ lẫm
lạc đà, lạc đề, lạc hậu, lạc lõng, lạc quan, lạc thú, lạc loài, lạc lối, lạc giọng, lạc nghiệp
lai lịch, lai giống, lai rai, lai tạo
lái xe, lái buôn, lái đò
lãi suất, lãi vay
lại gần, lại sức
làm việc, làm ăn, làm bài, làm đẹp, làm giàu, làm lành, làm nghề, làm phiền, làm quen, làm việc, làm thơ, làm thuê, làm chủ, làm dáng, làm duyên, làm khách, làm mẫu, làm nũng, làm ruộng, làm vườn, làm biếng
lạm dụng, lạm phát, lạm quyền, lạm bàn
lan can, lan man, lan tỏa, lan truyền, lan rộng
làn sóng, làn điệu, làn da, làn khói, làn đường
lãn công
lang thang, lang băm, lang bạt, lang sói
làng xóm, làng quê, làng mạc, làng nghề, làng chài
lãng mạn, lãng phí, lãng quên, lãng du, lãng tử, lãng đãng
lạnh lẽo, lạnh lùng, lạnh nhạt, lạnh giá, lạnh gáy, lạnh tanh
lành mạnh, lành lặn, lành nghề, lành tính
lãnh đạo, lãnh thổ, lãnh tụ, lãnh sự, lãnh hải, lãnh địa, lãnh chúa, lãnh cảm, lãnh đạm
lao động, lao công, lao tù, lao lực, lao đao, lao xao
lào xào
lão hóa, lão làng, lão luyện, lão bà, lão gia
lạp xưởng
lau chùi, lau sậy
láu cá, láu lỉnh
lắc lư
lặn lội
lắng nghe, lắng đọng, lắng dịu
lặng lẽ, lặng thầm, lặng im
lắp ráp, lắp đặt, lắp bắp
lâm nghiệp, lâm sản, lâm trường, lâm nguy, lâm bệnh, lâm sàng, lâm thời
lầm lỗi, lầm lì, lầm than, lầm đường
lẫm liệt
lân cận, lân la
lần lượt, lần đầu, lần mò
lận đận
lập công, lập luận, lập nghiệp, lập trình, lập trường, lập tức, lập pháp, lập kế, lập thân, lập thể
lật đật, lật đổ, lật lọng, lật tẩy
lâu dài, lâu đài, lâu năm, lâu đời
lấy lệ, lấy lòng, lấy cớ, lấy chồng, lấy vợ
lề lối, lề đường, lề mề
lễ hội, lễ phép, lễ nghi, lễ tân, lễ vật, lễ tình, lễ đường, lễ cưới, lễ độ, lễ bái, lễ tang
lệ phí, lệ thuộc, lệ làng
lên đường, lên ngôi, lên tiếng, lên men, lên án
lênh đênh
lệnh bài
lì xì
lịch sử, lịch sự, lịch trình, lịch thiệp, lịch lãm, lịch âm, lịch dương
liêm chính, liêm khiết, liêm sỉ
liên bang, liên doanh, liên hệ, liên hoan, liên kết, liên lạc, liên minh, liên quan, liên tục, liên tưởng, liên tiếp, liên đoàn, liên lụy, liên khu, liên hiệp, liên thông, liên ngành
liền kề, liền mạch
liệt sĩ, liệt kê
liều lĩnh, liều mạng, liều lượng, liều thuốc
liễu rủ
lính gác, lính thủy, lính tráng
linh hoạt, linh hồn, linh thiêng, linh tính, linh động, linh kiện, linh cảm, linh dược, linh vật, linh dương, linh đình
lĩnh vực, lĩnh hội
lo âu, lo lắng, lo sợ, lo toan, lo liệu, lo xa, lo ngại
lò sưởi, lò rèn, lò gạch, lò nướng
lọ mọ
loa phường
lòa xòa
loài người, loài vật
loại bỏ, loại trừ, loại hình
loan báo, loan tin
loạn lạc, loạn xạ, loạn luân
loang lổ
lóe sáng
lòng tin, lòng dạ, lòng tốt, lòng thành, lòng yêu, lòng vòng
lỏng lẻo
lọt tai, lọt lòng
lô đề
lố bịch, lố lăng
lỗ hổng, lỗ mãng, lỗ vốn, lỗ lãi
lộ trình, lộ diện, lộ liễu, lộ phí, lộ thiên
lối đi, lối thoát, lối sống, lối ra, lối vào
lỗi lầm, lỗi lạc, lỗi thời
lôi cuốn, lôi kéo, lôi thôi
lồng lộng, lồng tiếng, lồng đèn, lồng ghép, lồng ngực
lộng lẫy, lộng hành, lộng gió, lộng quyền
lơ đãng, lơ lửng, lơ mơ, lơ là
lời nói, lời hứa, lời khuyên, lời ca, lời chào, lời thề
lợi ích, lợi nhuận, lợi thế, lợi dụng, lợi hại, lợi khí
lớn lao, lớn mạnh, lớn tuổi
lớp học, lớp trưởng, lớp lang
lũ lụt, lũ quét
lúa gạo, lúa mì, lúa mạch, lúa nước
lụa là
luân phiên, luân chuyển, luân lý, luân hồi, luân thường
luận án, luận văn, luận điểm, luận cứ, luận bàn, luận tội
luật sư, luật pháp, luật lệ, luật gia, luật chơi
lúc nào, lúc đầu, lúc này
lục địa, lục lọi, lục quân, lục bát, lục đục, lục tung
lui tới
lùi bước
lùng sục
lung linh, lung lay, lung tung
lũng đoạn
luôn luôn
luồng gió, luồng điện
luyện tập, luyện thi, luyện kim, luyện đan
lừa đảo, lừa dối, lừa gạt, lừa bịp
lựa chọn
lửa trại, lửa tình
lực lượng, lực sĩ, lực học
lưng chừng, lưng tròng
lưới điện, lưới trời
lười biếng, lười nhác
lượm lặt
lương thiện, lương tâm, lương thực, lương y, lương tri, lương bổng, lương duyên, lương hưu
lường gạt
lượng giác
lưu ý, lưu trữ, lưu niệm, lưu luyến, lưu hành, lưu lại, lưu lượng, lưu vực, lưu manh, lưu đày, lưu học, lưu thông, lưu loát, lưu giữ, lưu vong, lưu động
lữ khách, lữ hành, lữ quán, lữ đoàn
ly biệt, ly hôn, ly dị, ly kỳ, ly tán, ly hương
lý do, lý lịch, lý luận, lý thuyết, lý trí, lý tưởng, lý giải, lý lẽ, lý tính
ma quỷ, ma túy, ma lực, ma thuật, ma trận, ma sát, ma chay, ma mãnh, ma men
mà thôi
má hồng, má lúm
mạ vàng, mạ non
mách bảo, mách lẻo
mạch máu, mạch lạc, mạch nước, mạch điện
mai mối, mai sau, mai táng, mai phục, mai một
mải mê, mải miết
mãi mãi, mãi lực, mãi dâm
man rợ, man mác
màn đêm, màn hình, màn kịch, màn sương, màn trập
mãn nguyện, mãn hạn, mãn tính, mãn đời, mãn kinh
mang thai, mang ơn, mang tiếng
mạng lưới, mạng sống, mạng nhện
manh mối, manh động, manh nha
mảnh mai, mảnh khảnh, mảnh đất, mảnh vỡ
mạnh mẽ, mạnh dạn, mạnh khỏe, mạnh tay, mạnh giỏi
mánh khóe, mánh lới
mãnh liệt, mãnh thú, mãnh hổ
mao mạch
mạo hiểm, mạo danh, mạo muội, mạo phạm
màu sắc, màu mỡ, màu nước, màu da, màu mè
máu me, máu mủ, máu lửa, máu thịt, máu xương
may mắn, may mặc, may rủi, may vá
máy bay, máy móc, máy tính, máy ảnh, máy in, máy giặt, máy lạnh, máy quay, máy chém
mắc cỡ, mắc nợ, mắc lỗi, mắc kẹt
mặc cả, mặc định, mặc kệ, mặc niệm, mặc cảm
mắm muối, mắm tôm
mặn mà, mặn nồng
măng non, măng tây
mắt kính, mắt xích, mắt bão
mặt trời, mặt trăng, mặt đất, mặt hàng, mặt nạ, mặt tiền, mặt trận, mặt bằng, mặt mũi, mặt mày, mặt phẳng
mâm cơm, mâm cỗ
mầm non, mầm mống
mẫn cảm, mẫn cán
mấp mô, mấp máy
mập mạp, mập mờ
mất mát, mất ngủ, mất tích, mất mùa, mất trí, mất gốc, mất lòng, mất công, mất giá
mật ong, mật khẩu, mật mã, mật thám, mật đàm, mật thiết, mật ngọt, mật độ, mật báo, mật lệnh
mâu thuẫn
mẫu giáo, mẫu mực, mẫu mã, mẫu số, mẫu hậu, mẫu thân
mây mưa, mây trời, mây trắng, mây đen
mẹ con, mẹ kế, mẹ chồng, mẹ vợ, mẹ đẻ
mèo con, mèo hoang
mê cung, mê hoặc, mê man, mê say, mê tín, mê mẩn, mê muội, mê sảng
mềm mại, mềm mỏng, mềm dẻo, mềm lòng, mềm nhũn
mến mộ, mến khách, mến thương
mệnh lệnh, mệnh đề, mệnh giá, mệnh danh, mệnh hệ
mệt mỏi, mệt nhọc, mệt lả
mi mắt
mía đường
miên man
miền núi, miền biển, miền quê, miền xuôi, miền ngược
miễn phí, miễn cưỡng, miễn dịch, miễn trừ, miễn nhiệm, miễn thuế, miễn là
miệng lưỡi, miệng núi
miêu tả
miếu mạo
minh bạch, minh chứng, minh họa, minh mẫn, minh tinh, minh oan, minh quân, minh triết, minh xác, minh tâm
mít tinh
mịt mù, mịt mờ
mô hình, mô phỏng, mô tả, mô tô
mồ côi, mồ hôi, mồ mả
mộ đạo
mốc meo
mối nối, mối tình, mối lo, mối thù
mồi nhử, mồi lửa
môi trường, môi giới, môi son
mỗi khi, mỗi ngày, mỗi người
môn đồ, môn học, môn phái, môn sinh
mông lung, mông muội
mộng mơ, mộng tưởng, mộng du, mộng mị
một lòng, một mình, một chiều, một mực, một thời, một khi
mơ hồ, mơ màng, mơ mộng, mơ ước, mơ tưởng
mờ ám, mờ nhạt, mờ mịt, mờ ảo
mở cửa, mở đầu, mở màn, mở mang, mở rộng, mở lòng, mở hàng
mới lạ, mới mẻ, mới toanh
mời mọc, mời gọi, mời khách
mua bán, mua sắm, mua chuộc, mua vui
múa may, múa rối, múa lân, múa hát
mùa xuân, mùa hạ, mùa hè, mùa thu, mùa đông, mùa màng, mùa vụ, mùa mưa, mùa khô, mùa lũ
mục đích, mục tiêu, mục lục, mục sư, mục nát, mục đồng, mục kích
mùi vị, mùi hương, mùi mẫn
mũi tên, mũi nhọn, mũi khoan
mũm mĩm
mưa bão, mưa phùn, mưa rào, mưa gió, mưa ngâu, mưa đá, mưa dầm
mức độ, mức sống, mức lương
mực in, mực nước, mực tàu
mừng rỡ, mừng thọ, mừng tuổi
mượn tạm
mưu mẹo, mưu kế, mưu đồ, mưu sinh, mưu trí, mưu lược, mưu mô, mưu sát
mỹ thuật, mỹ phẩm, mỹ nhân, mỹ lệ, mỹ mãn, mỹ quan, mỹ học, mỹ nữ, mỹ vị, mỹ miều, mỹ nghệ
na ná
nạ dòng
nài nỉ
nam châm, nam giới, nam nữ, nam nhi, nam tính, nam cực, nam tước
nản lòng, nản chí
nạn nhân, nạn đói, nạn lụt
nàng dâu, nàng tiên, nàng thơ
nạo vét
nay mai
nảy mầm, nảy sinh, nảy lửa
năm tháng, năm học, năm mới, năm nay
nằm mơ, nằm vùng
nắm bắt, nắm tay, nắm quyền, nắm giữ
năng động, năng khiếu, năng lực, năng lượng, năng suất, năng nổ
nắng nóng, nắng gắt, nắng mưa, nắng chiều, nắng hạ
nặng nề, nặng nhọc, nặng lòng, nặng tình, nặng trĩu
nấc thang
nâng cao, nâng đỡ, nâng niu, nâng cấp
nấu ăn, nấu nướng, nấu cơm
nề nếp
nể nang, nể phục
nền tảng, nền móng, nền nếp, nền nã
nệm êm
nết na
nếu như
ngã ba, ngã tư, ngã ngũ, ngã lòng
ngạc nhiên
ngai vàng
ngại ngùng, ngại ngần
ngàn năm
ngán ngẩm
ngang bướng, ngang hàng, ngang ngược, ngang nhiên, ngang tàng, ngang trái
ngành nghề, ngành học
ngao du
ngay thẳng, ngay ngắn, ngay thật
ngày mai, ngày nay, ngày tháng, ngày xưa, ngày đêm, ngày sinh, ngày giờ, ngày lễ, ngày công, ngày hội, ngày tết
ngắm cảnh, ngắm nghía, ngắm trăng
ngăn cách, ngăn cản, ngăn chặn, ngăn nắp, ngăn ngừa, ngăn kéo
ngắn gọn, ngắn hạn, ngắn ngủi
ngâm thơ, ngâm nga
ngầm hiểu
ngần ngại, ngần ngừ
ngập ngừng, ngập lụt, ngập tràn
ngất ngây, ngất xỉu
ngẫu hứng, ngẫu nhiên
nghe ngóng, nghe nhạc, nghe lời
nghèo khổ, nghèo đói, nghèo nàn, nghèo túng
nghẹn ngào
nghề nghiệp
nghệ sĩ, nghệ thuật, nghệ nhân, nghệ danh
nghi ngờ, nghi lễ, nghi vấn, nghi thức, nghi can, nghi hoặc, nghi án, nghi binh
nghỉ ngơi, nghỉ hưu, nghỉ phép, nghỉ hè, nghỉ việc
nghĩ ngợi
nghĩa vụ, nghĩa trang, nghĩa địa, nghĩa khí, nghĩa hiệp, nghĩa quân, nghĩa tình, nghĩa cử, nghĩa đen, nghĩa bóng
nghiêm khắc, nghiêm túc, nghiêm trọng, nghiêm chỉnh, nghiêm cấm, nghiêm ngặt, nghiêm trang, nghiêm minh, nghiêm nghị
nghiên cứu, nghiên mực
nghiến răng
nghiện ngập
nghiệp vụ, nghiệp dư, nghiệp chướng, nghiệp đoàn
nghịch lý, nghịch ngợm, nghịch cảnh, nghịch đảo, nghịch tặc
ngoan ngoãn, ngoan cố, ngoan cường, ngoan đạo
ngoại giao, ngoại hình, ngoại lệ, ngoại ngữ, ngoại thương, ngoại tình, ngoại ô, ngoại tệ, ngoại khóa, ngoại lực, ngoại quốc, ngoại vi
ngọc trai, ngọc bích, ngọc ngà, ngọc nữ, ngọc hoàng
ngọn lửa, ngọn núi, ngọn cờ, ngọn đèn, ngọn nguồn, ngọn gió
ngon lành, ngon miệng, ngon ngọt
ngọt ngào, ngọt lịm, ngọt xớt
ngô nghê, ngô đồng
ngộ nhận, ngộ độc, ngộ nghĩnh
ngôi sao, ngôi nhà, ngôi vua, ngôi trường, ngôi thứ
ngồi thiền
ngông cuồng, ngông nghênh
ngỡ ngàng
ngụ ý, ngụ ngôn, ngụ cư
nguy hiểm, nguy cơ, nguy nan, nguy kịch, nguy hại, nguy nga, nguy cấp
ngụy biện, ngụy trang, ngụy tạo
nguyên nhân, nguyên tắc, nguyên liệu, nguyên vẹn, nguyên thủy, nguyên tử, nguyên lý, nguyên đán, nguyên chất, nguyên soái, nguyên thủ, nguyên văn, nguyên khí, nguyên quán
nguyện vọng, nguyện ước
nguyệt san, nguyệt thực, nguyệt quế
ngư dân, ngư nghiệp, ngư lôi
người ta, người yêu, người dân, người lớn, người nhà, người đời, người mẫu, người hùng, người thân, người dưng
ngưỡng mộ, ngưỡng cửa
ngừng trệ
ngực áo
nhà cửa, nhà hàng, nhà nước, nhà thơ, nhà văn, nhà báo, nhà máy, nhà ga, nhà sách, nhà trường, nhà tù, nhà thờ, nhà quê, nhà nghỉ, nhà kho, nhà bếp, nhà tắm, nhà xe
nhã nhặn, nhã nhạc, nhã ý
nhạc cụ, nhạc sĩ, nhạc công, nhạc trưởng, nhạc kịch, nhạc phẩm, nhạc viện, nhạc nền, nhạc phụ, nhạc mẫu
nhai lại
nhàn nhã, nhàn rỗi, nhàn hạ
nhãn hiệu, nhãn quan, nhãn lồng, nhãn mác
nhanh chóng, nhanh nhẹn, nhanh trí, nhanh nhảu, nhanh gọn
nhánh sông
nhảy múa, nhảy dù, nhảy cao, nhảy xa, nhảy vọt
nhắc nhở, nhắc lại
nhắm mắt
nhăn nhó, nhăn nheo
nhắn tin, nhắn nhủ
nhẵn nhụi
nhặt nhạnh
nhầm lẫn
nhẫn nại, nhẫn nhục, nhẫn tâm, nhẫn cưới
nhận định, nhận thức, nhận xét, nhận diện, nhận lời, nhận lỗi, nhận dạng, nhận thầu, nhận vơ
nhân dân, nhân viên, nhân vật, nhân loại, nhân tài, nhân đạo, nhân ái, nhân hậu, nhân cách, nhân chứng, nhân danh, nhân duyên, nhân gian, nhân khẩu, nhân lực, nhân phẩm, nhân quả, nhân quyền, nhân sinh, nhân sự, nhân tạo, nhân tình, nhân tố, nhân từ, nhân văn, nhân vị, nhân bản
nhập học, nhập khẩu, nhập cư, nhập ngũ, nhập môn, nhập viện, nhập vai, nhập cuộc, nhập tâm
nhất định, nhất quán, nhất trí, nhất thời, nhất loạt
nhật ký, nhật thực, nhật báo, nhật trình
nhẹ nhàng, nhẹ nhõm, nhẹ dạ, nhẹ tênh
nhí nhảnh, nhí nhố
nhiệm vụ, nhiệm kỳ, nhiệm màu
nhiễm bệnh, nhiễm độc, nhiễm trùng, nhiễm khuẩn
nhiệt độ, nhiệt tình, nhiệt huyết, nhiệt đới, nhiệt kế, nhiệt liệt, nhiệt năng, nhiệt thành
nhiều lần, nhiều khi
nhìn nhận, nhìn thấy
nhỏ bé, nhỏ nhắn, nhỏ nhẹ, nhỏ nhoi, nhỏ mọn, nhỏ giọt
nhóm họp
nhọc nhằn
nhõng nhẽo
nhổ cỏ
nhộn nhịp, nhộn nhạo
nhớ nhung, nhớ thương, nhớ nhà
nhờ cậy, nhờ vả
nhu cầu, nhu mì, nhu nhược, nhu yếu
nhún nhường, nhún nhảy
nhung nhớ, nhung lụa
những ai, những khi
nhường nhịn
nhượng bộ, nhượng quyền
nói chuyện, nói dối, nói khoác, nói năng, nói xấu, nói đùa, nói thật, nói lái
nóng bỏng, nóng giận, nóng lòng, nóng nảy, nóng vội, nóng bức, nóng chảy, nóng ruột, nóng tính
nô lệ, nô đùa, nô nức, nô tỳ
nỗ lực
nổ lực, nổ súng, nổ mìn
nổi bật, nổi tiếng, nổi giận, nổi loạn, nổi dậy, nổi trội, nổi nóng, nổi danh, nổi gió
nỗi buồn, nỗi lòng, nỗi nhớ, nỗi niềm, nỗi đau
nội các, nội dung, nội địa, nội tâm, nội thất, nội trợ, nội vụ, nội bộ, nội công, nội chiến, nội gián, nội khoa, nội lực, nội quy, nội trú, nội tạng, nội thành, nội tình
nông dân, nông nghiệp, nông thôn, nông trại, nông sản, nông nổi, nông cạn, nông trường, nông lâm
nồng hậu, nồng nàn, nồng nhiệt, nồng ấm, nồng độ, nồng nặc
nơi chốn, nơi ở
nợ nần
nụ cười, nụ hôn, nụ hoa
núi non, núi rừng, núi lửa, núi đồi
nuôi dưỡng, nuôi nấng, nuôi dạy, nuôi trồng
nữ hoàng, nữ sinh, nữ sĩ, nữ tính, nữ thần, nữ tướng, nữ công, nữ trang, nữ giới, nữ chủ
nửa đêm, nửa vời, nửa đời
nước ngoài, nước mắt, nước non, nước nhà, nước đá, nước hoa, nước chấm, nước mắm, nước rút, nước cờ, nước sôi
nướng chả
nương tựa, nương náu, nương rẫy
oai hùng, oai nghiêm, oai phong, oai vệ
oan ức, oan gia, oan hồn, oan khuất, oan trái, oan uổng
óc chó
ong bướm, ong mật, ong chúa
ồn ào, ồn ã
ổn định, ổn thỏa
ông bà, ông nội, ông ngoại, ông trời, ông cụ, ông chủ, ông xã
ốm yếu, ốm đau, ốm nhom
ơn huệ, ơn nghĩa
pha chế, pha trò, pha lê, pha tạp, pha trộn
phá hoại, phá hủy, phá sản, phá vỡ, phá án, phá phách, phá cách, phá rừng, phá thai
phải chăng, phải lòng
phán đoán, phán quyết, phán xét
phản ánh, phản bội, phản công, phản đối, phản hồi, phản kháng, phản ứng, phản xạ, phản biện, phản cảm, phản động, phản chiếu, phản diện, phản lực
phạm nhân, phạm tội, phạm vi, phạm luật, phạm pháp, phạm húy
phàn nàn
phân biệt, phân bón, phân chia, phân công, phân loại, phân tích, phân phối, phân vân, phân xử, phân tâm, phân cấp, phân hủy, phân khúc, phân tán, phân trần, phân bua, phân số
phần mềm, phần cứng, phần lớn, phần thưởng, phần trăm, phần nào
phẫn nộ, phẫn uất
phấn khởi, phấn đấu, phấn chấn, phấn son, phấn hoa, phấn khích
phận sự
phẩm chất, phẩm giá, phẩm hạnh, phẩm cấp
phát biểu, phát động, phát hiện, phát huy, phát minh, phát sinh, phát triển, phát thanh, phát hành, phát âm, phát tài, phát đạt, phát điên, phát sóng, phát quang, phát xít, phát giác, phát lộc
phật tử, phật giáo, phật pháp
phẩy tay
phép màu, phép lạ, phép tắc, phép thuật, phép tính
phê bình, phê duyệt, phê chuẩn, phê phán, phê pha
phế liệu, phế phẩm, phế truất, phế tích
phí phạm, phí tổn
phi công, phi cơ, phi thuyền, phi trường, phi lý, phi pháp, phi thường, phi vụ, phi tần, phi đội
phía trước, phía sau, phía trên, phía dưới
phiên bản, phiên dịch, phiên tòa, phiên chợ, phiên âm, phiên họp
phiền hà, phiền muộn, phiền phức, phiền lòng, phiền não, phiền toái
phiêu lưu, phiêu bạt, phiêu diêu
phim ảnh, phim trường, phim truyện
phong ba, phong cách, phong cảnh, phong độ, phong kiến, phong phú, phong thủy, phong tục, phong trào, phong lưu, phong nhã, phong thư, phong tỏa, phong vũ, phong vị, phong thái, phong hóa, phong thấp
phóng đại, phóng khoáng, phóng sự, phóng viên, phóng xạ, phóng túng, phóng thích, phóng tác, phóng uế
phòng bệnh, phòng ngủ, phòng khách, phòng ngừa, phòng thủ, phòng vệ, phòng tắm, phòng ăn, phòng ban, phòng tuyến, phòng xa, phòng chống, phòng thân
phỏng vấn, phỏng đoán, phỏng theo
phố phường, phố xá, phố cổ, phố núi
phổ biến, phổ cập, phổ thông, phổ nhạc
phối hợp, phối cảnh, phối khí
phồn hoa, phồn thịnh, phồn vinh
phong cầm
phù du, phù hợp, phù sa, phù thủy, phù phiếm, phù dâu, phù rể, phù hiệu, phù trợ, phù phép
phụ huynh, phụ nữ, phụ tá, phụ cấp, phụ thuộc, phụ trách, phụ tùng, phụ âm, phụ lục, phụ bạc, phụ lòng, phụ đạo, phụ bếp, phụ khoa
phú quý, phú ông, phú hào
phủ định, phủ nhận, phủ sóng, phủ đầu
phúc lợi, phúc đức, phúc hậu, phúc âm, phúc khảo, phúc đáp
phục vụ, phục hồi, phục kích, phục sinh, phục tùng, phục thiện, phục chế, phục dựng, phục trang, phục hưng
phung phí
phụng sự, phụng dưỡng
phương án, phương châm, phương hướng, phương pháp, phương tiện, phương trình, phương thức, phương xa, phương ngữ, phương diện
phường hội, phường chèo
pháo hoa, pháo binh, pháo đài, pháo kích, pháo sáng
quà tặng, quà cáp, quà bánh, quà quê
quá khứ, quá trình, quá đáng, quá mức, quá tải, quá cố, quá giang, quá khích, quá hạn, quá độ
quả cảm, quả quyết, quả nhiên, quả thật, quả đất, quả bóng, quả đấm, quả tạ
quạ đen
quan điểm, quan hệ, quan tâm, quan sát, quan trọng, quan chức, quan niệm, quan thoại, quan tòa, quan lại, quan họ, quan ngại, quan quân, quan tài, quan liêu, quan hà, quan san
quán quân, quán xuyến, quán triệt, quán tính, quán ăn, quán trọ, quán rượu
quản lý, quản trị, quản gia, quản giáo, quản ngại, quản đốc, quản thúc
quang cảnh, quang đãng, quang minh, quang học, quang phổ, quang vinh, quang hợp, quang gánh
quảng cáo, quảng bá, quảng đại, quảng trường
quanh co, quanh quẩn, quanh năm
quay cuồng, quay lưng, quay phim, quay về, quay vòng
quân đội, quân nhân, quân sự, quân đoàn, quân khu, quân y, quân hàm, quân phục, quân lính, quân tử, quân sư, quân cờ, quân bài, quân địch, quân dịch
quần áo, quần chúng, quần đảo, quần thể, quần vợt, quần què
quấn quýt
quật cường, quật khởi
quấy rầy, quấy rối, quấy phá
quê hương, quê nhà, quê quán, quê mùa, quê ngoại, quê nội
quen biết, quen thuộc, quen thân
quên lãng
quyết định, quyết tâm, quyết liệt, quyết đoán, quyết chiến, quyết sách, quyết toán, quyết thắng
quyền lực, quyền lợi, quyền hạn, quyền uy, quyền anh, quyền hành, quyền quý, quyền thế
quyến rũ, quyến luyến
quyển sách, quyển vở
quý báu, quý giá, quý khách, quý tộc, quý phái, quý trọng, quý mến, quý tử, quý hiếm, quý bà, quý ông, quý phi
quỹ đạo, quỹ tích
quy định, quy luật, quy mô, quy tắc, quy trình, quy hoạch, quy chế, quy củ, quy phạm, quy ước, quy tụ, quy y, quy hàng, quy chuẩn
quỷ dữ, quỷ quyệt, quỷ thần
ra đi, ra mắt, ra lệnh, ra trận, ra sức, ra vẻ, ra đời, ra khơi
rã rời, rã đông
rác rưởi, rác thải
rạch ròi
rải rác
rau muống, rau cải, rau dền, rau má, rau sống, rau củ, rau thơm, rau ngót
rảnh rỗi, rảnh rang
rạng đông, rạng rỡ, rạng ngời
ranh giới, ranh mãnh, ranh ma
rao giảng, rao vặt, rao bán
rào cản, rào chắn, rào đón
rắc rối
rắn rỏi, rắn chắc, rắn độc, rắn hổ
rặng tre
rầm rộ, rầm rập
rậm rạp, rậm rì
rất mực
rầu rĩ
râu ria
rẻ rúng, rẻ tiền, rẻ mạt
rèn luyện, rèn đúc, rèn giũa
rét buốt, rét mướt, rét đậm
rễ cây
rêu phong
rì rào, rì rầm
ríu rít
rõ ràng, rõ rệt
rong chơi, rong ruổi, rong biển
ròng rã, ròng rọc
rót rượu
rỗi rãi
rối ren, rối loạn, rối rắm, rối bời, rối trí
rộn ràng, rộn rã, rộn rịp
rộng lớn, rộng rãi, rộng lượng, rộng mở, rộng khắp
rồng rắn, rồng phượng
rơi rớt, rơi lệ
rời rạc, rời bỏ, rời xa
rực rỡ, rực lửa, rực cháy
rủi ro
run rẩy, run sợ
rung động, rung cảm, rung chuyển, rung rinh
ruộng đồng, ruộng vườn, ruộng lúa, ruộng bậc
ruột thịt, ruột gan, ruột già, ruột non
rừng rậm, rừng núi, rừng xanh, rừng già, rừng thông, rừng tràm
rước dâu, rước đèn
rượu bia, rượu vang, rượu chè, rượu nếp, rượu đế
sa mạc, sa sút, sa đọa, sa thải, sa lưới, sa ngã, sa sầm, sa lầy, sa trường
sà lan
sạch sẽ, sạch bong
sách vở, sách báo, sách lược, sách nhiễu
sai lầm, sai sót, sai trái, sai khiến, sai phạm, sai lệch, sai hẹn
sản phẩm, sản xuất, sản lượng, sản nghiệp, sản phụ, sản khoa, sản vật
san hô, san sẻ, san bằng, san lấp
sang trọng, sang năm, sang tên, sang nhượng
sàng lọc
sáng kiến, sáng lập, sáng suốt, sáng tác, sáng tạo, sáng chế, sáng sủa, sáng tỏ, sáng ngời, sáng láng, sáng mai, sáng sớm, sáng dạ
sảng khoái
sanh nở
sao băng, sao chổi, sao chép, sao lục, sao mai, sao hôm, sao biển
sáo rỗng, sáo trúc
sạt lở
say mê, say sưa, say đắm, say xỉn, say nắng, say rượu, say xe, say sóng
sắc đẹp, sắc sảo, sắc thái, sắc lệnh, sắc tộc, sắc màu, sắc bén
sắm sửa, sắm vai
săn bắn, săn sóc, săn đón, săn lùng, săn mồi
sẵn sàng, sẵn lòng, sẵn có
sắp xếp, sắp đặt, sắp tới
sắt đá, sắt thép
sâm banh
sầm uất
sẩm tối
sân bay, sân khấu, sân chơi, sân trường, sân thượng, sân đình
sấm sét
sần sùi
sâu sắc, sâu xa, sâu lắng, sâu đậm, sâu bọ, sâu răng, sâu hiểm
sầu muộn, sầu não, sầu bi, sầu riêng, sầu đông
sẻ chia
sen vàng
sét đánh
sinh sống, sinh viên, sinh vật, sinh nhật, sinh học, sinh hoạt, sinh lực, sinh lý, sinh mạng, sinh sản, sinh thái, sinh tồn, sinh tử, sinh động, sinh linh, sinh thời, sinh khí, sinh kế
sính lễ
so sánh, so đo
sò điệp, sò huyết
soi sáng, soi xét
sói xám
sóng gió, sóng biển, sóng âm, sóng thần, sóng điện, sóng sánh
song song, song ca, song hành, song phương, song sinh, song toàn, song ngữ
sông núi, sông ngòi, sông hồ, sông nước
số đông, số phận, số liệu, số lượng, số mệnh, số học, số phức, số đỏ, số nhà, số dư
sổ sách, sổ tay, sổ đỏ
sôi nổi, sôi động, sôi sục
sống còn, sống động, sống sót, sống chết, sống ảo
sơ sài, sơ suất, sơ cứu, sơ đồ, sơ khai, sơ lược, sơ sinh, sơ tán, sơ cấp, sơ bộ, sơ kết
sợ hãi, sợ sệt
sơn hà, sơn thủy, sơn lâm, sơn dầu, sơn mài, sơn ca
sớm mai
sợi chỉ, sợi tóc
sung sướng, sung túc, sung mãn, sung công
súng đạn, súng ống
suối nguồn, suối tóc
suy nghĩ, suy luận, suy sụp, suy thoái, suy tàn, suy tính, suy đoán, suy diễn, suy xét, suy ngẫm, suy yếu, suy tư, suy giảm, suy tôn
sư phạm, sư phụ, sư tử, sư đoàn, sư thầy, sư huynh, sư muội
sứ giả, sứ mệnh, sứ quán, sứ thần
sử dụng, sử sách, sử học, sử thi, sử gia, sử ký
sự kiện, sự nghiệp, sự thật, sự việc, sự cố, sự tích, sự sống
sức khỏe, sức lực, sức mạnh, sức sống, sức ép, sức bền, sức chứa
sưu tầm, sưu tập, sưu tra
sương mù, sương muối, sương gió, sương đêm, sương sớm
sướng vui
ta thán
tà áo, tà dương, tà đạo, tà ác, tà thuật, tà khí
tác dụng, tác động, tác giả, tác phẩm, tác phong, tác hại, tác chiến, tác nghiệp, tác thành, tác quyền
tạc tượng
tai họa, tai nạn, tai ương, tai tiếng, tai hại, tai biến, tai nghe
tài chính, tài khoản, tài liệu, tài năng, tài nguyên, tài sản, tài xế, tài trợ, tài giỏi, tài hoa, tài tình, tài lộc, tài đức, tài tử, tài phiệt, tài trí, tài khóa
tái bản, tái chế, tái diễn, tái hiện, tái phát, tái sinh, tái tạo, tái hợp, tái ngộ, tái bút, tái cử
tại chỗ, tại sao, tại ngũ, tại gia, tại vị, tại chức
tam giác, tam quan, tam cấp, tam đại
tạm biệt, tạm thời, tạm trú, tạm ứng, tạm bợ, tạm giam, tạm ngưng
tàn ác, tàn bạo, tàn khốc, tàn nhẫn, tàn phá, tàn tật, tàn phế, tàn lụi, tàn dư, tàn tích, tàn sát
tán thành, tán gẫu, tán dương, tán thưởng, tán tỉnh, tán loạn
tản mạn, tản cư, tản văn, tản bộ
tang lễ, tang thương, tang chứng, tang tóc, tang vật
tăng cường, tăng giá, tăng tốc, tăng trưởng, tăng lương, tăng ca, tăng ni
tàng hình, tàng trữ, tàng thư
tảng đá, tảng sáng
tạnh mưa
tanh tưởi
tao nhã, tao ngộ, tao khang
táo bạo, táo tợn, táo bón
tạo hóa, tạo dựng, tạo hình, tạo tác, tạo lập
tát nước
tay chân, tay nghề, tay sai, tay trái, tay phải, tay lái, tay áo, tay vịn, tay đôi
tắc nghẽn, tắc trách
tắm biển, tắm rửa, tắm nắng, tắm gội
tằn tiện
tâm hồn, tâm huyết, tâm lý, tâm sự, tâm trạng, tâm tư, tâm điểm, tâm linh, tâm thần, tâm trí, tâm niệm, tâm đắc, tâm giao, tâm can, tâm thế, tâm địa, tâm phúc
tầm thường, tầm nhìn, tầm vóc, tầm xa, tầm cỡ
tấm lòng, tấm gương, tấm thân, tấm ảnh
tân binh, tân gia, tân hôn, tân khoa, tân thời, tân trang, tân tiến, tân thủ, tân văn
tần suất, tần số, tần ngần
tận dụng, tận hưởng, tận tâm, tận tình, tận tụy, tận cùng, tận thế, tận lực, tận mắt
tập đoàn, tập hợp, tập luyện, tập san, tập thể, tập trung, tập tục, tập quán, tập tành, tập kích
tất bật, tất cả, tất nhiên, tất yếu, tất niên
tây phương, tây y
tẩy chay, tẩy rửa, tẩy não, tẩy trắng
tem thư
tên gọi, tên lửa, tên tuổi, tên trộm
tết nhất
thả diều, thả lỏng, thả cửa
thác nước, thác loạn
thách thức, thách đấu
thạch anh, thạch cao, thạch sùng
thai nghén, thai nhi
thái bình, thái độ, thái hậu, thái tử, thái dương, thái quá, thái giám, thái cực, thái sư
thải loại
tham gia, tham khảo, tham lam, tham quan, tham vọng, tham dự, tham mưu, tham chiến, tham nhũng, tham số, tham luận, tham vấn, tham ô, tham tán
thảm họa, thảm kịch, thảm thương, thảm sát, thảm hại, thảm khốc, thảm cỏ, thảm đỏ
thám hiểm, thám tử, thám thính
than thở, than vãn, than đá, than củi, than phiền
thản nhiên
thán phục
thang máy, thang điểm, thang âm
tháng ngày, tháng giêng, tháng chạp, tháng năm
thanh bình, thanh danh, thanh đạm, thanh khiết, thanh lịch, thanh niên, thanh toán, thanh tra, thanh xuân, thanh nhã, thanh thản, thanh tịnh, thanh âm, thanh điệu, thanh minh, thanh lý, thanh mảnh, thanh cao, thanh bạch
thành công, thành phố, thành viên, thành tích, thành lập, thành quả, thành thật, thành tâm, thành kiến, thành ngữ, thành phần, thành phẩm, thành thị, thành trì, thành đạt, thành hôn, thành thạo, thành khẩn, thành danh
thánh thiện, thánh địa, thánh đường, thánh nhân, thánh ca, thánh chỉ, thánh thót
thảnh thơi
thao tác, thao túng, thao trường, thao luyện
tháo vát, tháo gỡ, tháo chạy
thảo dược, thảo luận, thảo nguyên, thảo mộc, thảo nào, thảo cầm
thay đổi, thay thế, thay mặt, thay lòng
thắc mắc
thăm dò, thăm hỏi, thăm nom, thăm thẳm, thăm viếng
thắm thiết
thăng tiến, thăng trầm, thăng hoa, thăng chức, thăng bằng
thằng bé
thẳng thắn, thẳng tính, thẳng tay, thẳng thừng
thắng lợi, thắng cảnh, thắng thế, thắng trận, thắng cử
thầm lặng, thầm kín, thầm thì
thẩm định, thẩm mỹ, thẩm phán, thẩm quyền, thẩm tra, thẩm thấu, thẩm vấn
thậm chí, thậm tệ
thân mật, thân phận, thân thể, thân thiện, thân thiết, thân hình, thân nhân, thân tín, thân thế, thân chủ, thân mến, thân yêu, thân quen, thân cận
thần đồng, thần kinh, thần thoại, thần tượng, thần thánh, thần linh, thần chết, thần dân, thần sắc, thần thái, thần tốc, thần bí, thần kỳ, thần dược
thận trọng
thấp bé, thấp hèn, thấp kém, thấp thoáng
thất bại, thất học, thất lạc, thất nghiệp, thất thường, thất vọng, thất tình, thất thủ, thất bát, thất lễ, thất hứa, thất sủng
thật thà, thật lòng, thật sự, thật tình
thâu đêm, thâu tóm
thầy giáo, thầy thuốc, thầy cô, thầy bói, thầy trò
thấy rõ
the thé
thèm muốn, thèm khát, thèm thuồng
then chốt
theo dõi, theo đuổi, theo gót
thép gai
thế giới, thế hệ, thế kỷ, thế lực, thế mạnh, thế thời, thế sự, thế gian, thế chấp, thế tục, thế trận
thể dục, thể hiện, thể loại, thể lực, thể thao, thể chất, thể chế, thể diện, thể lệ, thể tích, thể thức, thể trạng
thêm bớt, thêm thắt
thi ca, thi cử, thi đấu, thi đua, thi hành, thi sĩ, thi công, thi hào, thi nhân, thi pháp, thi thể, thi thố, thi vị, thi tuyển
thị trường, thị trấn, thị xã, thị giác, thị lực, thị phần, thị hiếu, thị thực, thị uy, thị trưởng, thị phi
thích thú, thích hợp, thích nghi, thích ứng
thiên đường, thiên hạ, thiên nhiên, thiên tai, thiên tài, thiên thần, thiên văn, thiên vị, thiên chức, thiên hướng, thiên lý, thiên thạch, thiên thể, thiên tử, thiên địa, thiên nga, thiên bẩm, thiên kiến, thiên thu
thiền sư, thiền định, thiền viện
thiện chí, thiện cảm, thiện ý, thiện nguyện, thiện xạ, thiện ác
thiết bị, thiết kế, thiết lập, thiết thực, thiết tha, thiết yếu, thiết giáp, thiết quân
thiệt hại, thiệt thòi, thiệt mạng
thiếu nhi, thiếu niên, thiếu nữ, thiếu sót, thiếu thốn, thiếu tá, thiếu tướng, thiếu úy, thiếu gia, thiếu phụ
thính giả, thính giác, thính phòng
thịnh vượng, thịnh hành, thịnh soạn, thịnh nộ, thịnh tình
thịt bò, thịt gà, thịt heo, thịt lợn, thịt kho, thịt nướng
thoải mái
thoát hiểm, thoát ly, thoát nạn, thoát thân, thoát tục, thoát vị
thỏa đáng, thỏa mãn, thỏa thuận, thỏa thích, thỏa hiệp, thỏa lòng
thói quen
thon thả
thô bạo, thô lỗ, thô sơ, thô tục, thô kệch, thô ráp
thổ cẩm, thổ địa, thổ dân, thổ lộ, thổ âm, thổ phỉ, thổ công
thôi thúc, thôi miên, thôi việc
thối nát, thối rữa
thôn quê, thôn xóm, thôn nữ, thôn tính
thông báo, thông cảm, thông dụng, thông minh, thông tin, thông thường, thông qua, thông suốt, thông thạo, thông điệp, thông hành, thông lệ, thông gia, thông tấn, thông tư, thông số, thông thái, thông thoáng
thống kê, thống nhất, thống trị, thống khổ, thống soái, thống đốc, thống lĩnh, thống thiết
thơ ca, thơ mộng, thơ ngây, thơ văn, thơ ấu
thờ cúng, thờ ơ, thờ phụng
thời gian, thời đại, thời kỳ, thời tiết, thời trang, thời sự, thời cơ, thời hạn, thời điểm, thời khóa, thời thế, thời vụ, thời hiệu, thời buổi
thợ may, thợ mộc, thợ điện, thợ xây, thợ cắt, thợ săn, thợ rèn
thu hoạch, thu hút, thu nhập, thu thập, thu xếp, thu nhỏ, thu âm, thu phục, thu hồi, thu ngân, thu gom, thu hẹp
thù địch, thù hận, thù oán, thù lao, thù hằn
thú vị, thú cưng, thú nhận, thú vui, thú y, thú dữ
thủ đô, thủ công, thủ lĩnh, thủ môn, thủ tục, thủ tướng, thủ thuật, thủ đoạn, thủ khoa, thủ phạm, thủ quỹ, thủ thư, thủ thỉ, thủ trưởng, thủ hạ, thủ tiêu, thủ công
thụ động, thụ hưởng, thụ thai, thụ phấn, thụ án
thua cuộc, thua lỗ, thua kém, thua thiệt
thuần khiết, thuần phục, thuần túy, thuần thục, thuần chủng, thuần hóa, thuần phong
thuận lợi, thuận tiện, thuận tay, thuận hòa, thuận tình
thuật ngữ, thuật toán, thuật lại
thúc đẩy, thúc giục, thúc ép
thuê bao
thung lũng
thùng rác, thùng xe
thủy chung, thủy thủ, thủy sản, thủy tinh, thủy triều, thủy điện, thủy lợi, thủy quân, thủy văn, thủy ngân, thủy tổ, thủy tiên, thủy cung
thuyền trưởng, thuyền buồm, thuyền nhân, thuyền rồng, thuyền chài
thuyết minh, thuyết phục, thuyết trình, thuyết giảng, thuyết giáo
thư viện, thư ký, thư từ, thư pháp, thư thái, thư giãn, thư tình, thư sinh, thư phòng, thư điện, thư mời
thử thách, thử nghiệm, thử việc, thử lửa, thử sức
thứ tự, thứ bậc, thứ yếu, thứ trưởng, thứ lỗi, thứ hạng
thừa kế, thừa nhận, thừa thãi, thừa hưởng, thừa cân, thừa sai
thức ăn, thức dậy, thức giấc, thức khuya, thức tỉnh, thức uống
thực đơn, thực hành, thực hiện, thực lực, thực phẩm, thực sự, thực tập, thực tế, thực tiễn, thực vật, thực chất, thực dân, thực dụng, thực nghiệm, thực tại, thực thi, thực lòng, thực thể
thương binh, thương cảm, thương hại, thương hiệu, thương lượng, thương mại, thương nhớ, thương tâm, thương tích, thương vong, thương xót, thương yêu, thương gia, thương thuyết, thương trường, thương cảng
thường dân, thường ngày, thường lệ, thường niên, thường trực, thường xuyên, thường thức, thường tình, thường vụ
thưởng thức, thưởng phạt, thưởng ngoạn
thượng đế, thượng nguồn, thượng hạng, thượng khách, thượng lưu, thượng sách, thượng tướng, thượng tá, thượng úy, thượng võ, thượng viện
tỉ mỉ, tỷ lệ, tỷ phú, tỷ số, tỷ giá, tỷ trọng
tí hon
tia chớp, tia nắng, tia lửa, tia sáng
tích cực, tích lũy, tích trữ, tích hợp, tích tụ, tích phân, tích điện, tích sự
tiếc nuối, tiếc thương
tiềm năng, tiềm lực, tiềm ẩn, tiềm thức, tiềm tàng
tiệm cận, tiệm vàng
tiên tiến, tiên phong, tiên đoán, tiên quyết, tiên nữ, tiên sinh, tiên tri, tiên cảnh, tiên liệu, tiên đề
tiền bạc, tiền bối, tiền đề, tiền đồ, tiền lương, tiền tệ, tiền tuyến, tiền vệ, tiền nhân, tiền sử, tiền thân, tiền mặt, tiền phạt, tiền boa, tiền kiếp
tiến bộ, tiến hành, tiến hóa, tiến sĩ, tiến triển, tiến trình, tiến công, tiến độ, tiến cử, tiến quân, tiến thoái
tiện lợi, tiện nghi, tiện ích, tiện tay, tiện thể
tiếng nói, tiếng động, tiếng tăm, tiếng hát, tiếng cười, tiếng khóc, tiếng mẹ, tiếng lóng
tiếp đón, tiếp nhận, tiếp tục, tiếp xúc, tiếp viên, tiếp thị, tiếp thu, tiếp tế, tiếp sức, tiếp cận, tiếp diễn, tiếp khách, tiếp nối, tiếp quản, tiếp tay, tiếp tuyến
tiết kiệm, tiết lộ, tiết mục, tiết học, tiết chế, tiết trời, tiết hạnh, tiết tấu, tiết canh
tiêu biểu, tiêu chí, tiêu chuẩn, tiêu cực, tiêu dùng, tiêu diệt, tiêu điểm, tiêu đề, tiêu hóa, tiêu thụ, tiêu tan, tiêu xài, tiêu điều, tiêu hủy, tiêu khiển, tiêu sầu, tiêu pha
tiểu học, tiểu sử, tiểu thuyết, tiểu thư, tiểu đội, tiểu bang, tiểu luận, tiểu thương, tiểu xảo, tiểu tiết, tiểu nhân, tiểu đường, tiểu phẩm
tím than
tìm kiếm, tìm tòi, tìm hiểu, tìm cách
tin cậy, tin học, tin tức, tin tưởng, tin đồn, tin nhắn, tin vui, tin dữ
tình bạn, tình cảm, tình cờ, tình hình, tình huống, tình nghĩa, tình nguyện, tình thương, tình trạng, tình yêu, tình thế, tình tiết, tình báo, tình nhân, tình ca, tình duyên, tình địch, tình tứ, tình sử
tinh anh, tinh hoa, tinh khiết, tinh thần, tinh tế, tinh thông, tinh vi, tinh tú, tinh nghịch, tinh ranh, tinh tường, tinh nhuệ, tinh xảo, tinh dầu, tinh túy, tinh giản
tính cách, tính toán, tính chất, tính mạng, tính năng, tính nết, tính tình, tính từ
tỉnh táo, tỉnh thành, tỉnh ngộ, tỉnh lỵ, tỉnh lộ, tỉnh giấc
tĩnh lặng, tĩnh mịch, tĩnh tâm, tĩnh dưỡng, tĩnh mạch, tĩnh vật
to lớn, to tát, to gan, to tiếng
tò mò, tò vò
tỏ tình, tỏ vẻ, tỏ lòng
tòa án, tòa nhà, tòa soạn
toàn bộ, toàn cầu, toàn diện, toàn quốc, toàn năng, toàn quyền, toàn thắng, toàn thể, toàn vẹn, toàn tâm, toàn văn, toàn cảnh
toán học
tỏa sáng, tỏa nhiệt
toại nguyện
tóc mây, tóc tai, tóc thề
tối tăm, tối cao, tối đa, tối thiểu, tối ưu, tối mật, tối hậu, tối mịt
tội lỗi, tội phạm, tội ác, tội nghiệp, tội danh, tội đồ, tội tình
tôn giáo, tôn kính, tôn sùng, tôn trọng, tôn vinh, tôn chỉ, tôn thờ, tôn ti, tôn nghiêm
tốn kém
tổn hại, tổn thất, tổn thương
tông đồ
tổng hợp, tổng kết, tổng số, tổng thống, tổng quát, tổng cộng, tổng thể, tổng đài
tốt bụng, tốt đẹp, tốt nghiệp, tốt lành, tốt tươi
tơ lụa, tơ tằm, tơ duyên, tơ hồng, tơ vương
tờ báo, tờ giấy
tới lui
tu hành, tu luyện, tu sĩ, tu viện, tu sửa, tu bổ, tu dưỡng, tu chính, tu từ, tu tâm
tù binh, tù nhân, tù tội, tù đày, tù túng
tủ lạnh, tủ sách, tủ quần, tủ kính
tụ họp, tụ tập, tụ điểm, tụ hội
tuần hoàn, tuần lễ, tuần tra, tuần trăng, tuần báo, tuần tự
tuân thủ, tuân lệnh, tuân theo
tuấn tú
túc trực
tục ngữ, tục lệ, tục tĩu
tung tích, tung hoành, tung hô, tung tăng, tung tin
tùng bách
tuổi thơ, tuổi trẻ, tuổi tác, tuổi già, tuổi xuân, tuổi hồng
tuy nhiên, tuy vậy
tùy ý, tùy tiện, tùy thích, tùy theo, tùy tùng, tùy bút
tuyên bố, tuyên truyền, tuyên dương, tuyên thệ, tuyên án, tuyên chiến, tuyên ngôn
tuyển chọn, tuyển dụng, tuyển sinh, tuyển tập, tuyển thủ, tuyển mộ
tuyệt vời, tuyệt đối, tuyệt đẹp, tuyệt tác, tuyệt vọng, tuyệt mật, tuyệt diệu, tuyệt chủng, tuyệt giao, tuyệt kỹ, tuyệt thực, tuyệt trần, tuyệt sắc
tư cách, tư duy, tư liệu, tư nhân, tư thế, tư tưởng, tư vấn, tư bản, tư chất, tư pháp, tư lệnh, tư sản, tư tình, tư lợi, tư thục, tư trang
từ bi, từ chối, từ điển, từ giã, từ ngữ, từ thiện, từ trường, từ tốn, từ đường, từ vựng, từ bỏ, từ biệt, từ chức, từ tâm
tử tế, tử thần, tử vong, tử hình, tử thi, tử vi, tử trận, tử tù, tử nạn
tự do, tự động, tự giác, tự hào, tự nhiên, tự tin, tự trọng, tự lập, tự chủ, tự học, tự sát, tự vệ, tự quản, tự lực, tự ái, tự cường, tự chế, tự kỷ, tự sự, tự tử, tự thân, tự hỏi, tự tại, tự túc
tửu lượng, tửu quán
tựa đề, tựa hồ
tức giận, tức tối, tức thì, tức cảnh
từng bước
tươi cười, tươi tắn, tươi sáng, tươi tốt, tươi mát, tươi trẻ, tươi vui
tương lai, tương đối, tương tự, tương trợ, tương xứng, tương ứng, tương phản, tương quan, tương thích, tương tác, tương tư, tương ớt, tương kế
tường thuật, tường tận, tường vi, tường rào
tưởng tượng, tưởng nhớ, tưởng niệm, tưởng thưởng, tưởng chừng
tượng trưng, tượng đài, tượng hình, tượng thanh
tước đoạt, tước vị
tỷ mỉ
tra cứu, tra hỏi, tra tấn, tra xét
trà đạo, trà sữa, trà xanh, trà đá, trà chanh, trà trộn
trả giá, trả lời, trả nợ, trả thù, trả ơn, trả góp, trả đũa, trả lương
trách nhiệm, trách móc, trách cứ, trách phạt
trai tráng, trai gái, trai làng
trải nghiệm, trải qua, trải dài, trải lòng
trái cây, trái đất, trái phép, trái tim, trái ngược, trái mùa, trái tính, trái chủ, trái phiếu, trái khoáy
trại hè, trại giam, trại lính, trại tù
tràn đầy, tràn ngập, tràn lan, tràn trề
trán cao
trang bị, trang điểm, trang hoàng, trang nghiêm, trang phục, trang sức, trang trại, trang trí, trang trọng, trang chủ, trang nhã, trang lứa, trang trải
tráng lệ, tráng miệng, tráng sĩ, tráng kiện
trạng thái, trạng nguyên, trạng từ, trạng sư
tranh ảnh, tranh cãi, tranh chấp, tranh đấu, tranh luận, tranh thủ, tranh giành, tranh tài, tranh cử, tranh biện, tranh vẽ, tranh sơn
tránh né, tránh mặt, tránh xa
trao đổi, trao tặng, trao giải, trao trả, trao quyền
trào lưu, trào phúng
tráo trở
trăm năm, trăm họ
trăn trở
trằn trọc
trắng trẻo, trắng trợn, trắng tinh, trắng xóa, trắng án
trăng tròn, trăng mật, trăng non, trăng khuyết
trầm cảm, trầm lặng, trầm mặc, trầm ngâm, trầm tích, trầm trọng, trầm tư, trầm hương, trầm luân, trầm bổng, trầm tĩnh
trận đấu, trận địa, trận mạc, trận chiến, trận tuyến
trần gian, trần thế, trần trụi, trần tục, trần thuật, trần nhà
trật tự, trật tự
trâu bò, trâu cày
trầu cau
tre trúc, tre pheo, tre ngà
trẻ con, trẻ em, trẻ trung, trẻ thơ, trẻ măng
trên đời
treo cổ, treo thưởng
trí nhớ, trí óc, trí thức, trí tuệ, trí khôn, trí lực, trí giả
trì hoãn, trì trệ, trì độn
trị giá, trị liệu, trị an, trị thủy, trị vì
trích dẫn, trích đoạn, trích lục
triển khai, triển lãm, triển vọng
triết gia, triết học, triết lý
triều đại, triều đình, triều cường, triều chính
triệu chứng, triệu phú, triệu tập, triệu hồi
trinh thám, trinh sát, trinh nữ, trinh tiết
trình bày, trình diễn, trình độ, trình duyệt, trình tự, trình diện
tro tàn, tro bụi
trò chơi, trò chuyện, trò đùa, trò hề, trò cười
trọ học
trọc phú
trói buộc
tròn trịa, tròn trĩnh
trọn vẹn, trọn đời
trong sạch, trong sáng, trong suốt, trong trẻo, trong veo, trong lành, trong xanh, trong ngoài, trong khi
trọng đại, trọng điểm, trọng lượng, trọng tài, trọng tâm, trọng thể, trọng trách, trọng yếu, trọng dụng, trọng lực, trọng thương, trọng án
trống trải, trống rỗng, trống đồng, trống trơn, trống canh
trồng trọt, trồng cây
trơ trẽn, trơ trọi
trở lại, trở thành, trở ngại, trở về, trở mặt, trở tay, trở mình
trời đất, trời cao, trời xanh, trời mưa
trợ cấp, trợ giúp, trợ lý, trợ giảng, trợ lực, trợ thủ
trơn tru, trơn trượt
trú ẩn, trú ngụ, trú quán
trụ sở, trụ cột, trụ trì
trùm sò
trung bình, trung gian, trung hòa, trung học, trung kiên, trung lập, trung tâm, trung thành, trung thực, trung tướng, trung ương, trung thu, trung niên, trung đoàn, trung đội, trung tá, trung úy, trung cấp, trung tuần, trung nguyên, trung hậu
trúng tuyển, trúng thưởng, trúng cử, trúng độc, trúng gió, trúng số
trùng hợp, trùng lặp, trùng phùng, trùng tu, trùng điệp
truy cập, truy cứu, truy đuổi, truy lùng, truy nã, truy tìm, truy tố, truy vấn, truy điệu, truy thu
truyền bá, truyền cảm, truyền đạt, truyền hình, truyền thống, truyền thuyết, truyền thông, truyền nhiễm, truyền máu, truyền tải, truyền thụ, truyền giáo, truyền nhân, truyền tụng
truyện cổ, truyện ngắn, truyện tranh, truyện kể
trưng bày, trưng cầu, trưng dụng, trưng thu
trưởng thành, trưởng phòng, trưởng nam, trưởng nữ, trưởng ban, trưởng lão, trưởng tộc
trường học, trường hợp, trường kỳ, trường thọ, trường độ, trường phái, trường ca, trường quay, trường thi
trước đây, trước sau, trước mắt, trước tiên
trượt chân, trượt tuyết, trượt băng, trượt giá
trừu tượng
uất ức, uất hận
ủng hộ
ung dung, ung thư, ung nhọt
uống nước, uống rượu, uống thuốc
uy tín, uy nghiêm, uy lực, uy quyền, uy hiếp, uy phong, uy thế, uy danh
ủy ban, ủy quyền, ủy viên, ủy thác, ủy nhiệm, ủy mị, ủy lạo
ưa chuộng, ưa thích
ước mơ, ước muốn, ước lượng, ước nguyện, ước tính, ước vọng, ước định, ước chừng, ước hẹn
ướt át, ướt đẫm, ướt sũng
ưu tiên, ưu điểm, ưu đãi, ưu thế, ưu tú, ưu việt, ưu sầu, ưu tư, ưu ái, ưu phiền
va chạm, va vấp
vạch trần, vạch mặt
vai trò, vai vế, vai diễn
vải vóc, vải thiều
vãi chài
van nài, van xin, van lơn
vạn năng, vạn vật, vạn sự, vạn tuế, vạn dặm, vạn kiếp, vạn lý
văn hóa, văn học, văn minh, văn phòng, văn bản, văn chương, văn nghệ, văn sĩ, văn xuôi, văn kiện, văn hào, văn phong, văn thư, văn miếu, văn vẻ, văn tự, văn nhân, văn thơ
vang dội, vang danh, vang lừng, vang vọng
vàng bạc, vàng son, vàng úa, vàng ròng, vàng hoe, vàng óng, vàng anh
vắng vẻ, vắng mặt, vắng lặng, vắng tanh, vắng bóng
vẳng lại
vận động, vận hành, vận mệnh, vận tải, vận tốc, vận dụng, vận chuyển, vận may, vận đơn, vận hạn, vận số
vấn đề, vấn đáp, vấn an, vấn vương
vẫn còn
vật chất, vật lý, vật liệu, vật dụng, vật nuôi, vật giá, vật lộn, vật vã, vật thể, vật tư, vật cản
vây cánh, vây hãm
về hưu, về quê, về nhà
vẽ vời, vẽ tranh
vệ sinh, vệ tinh, vệ binh, vệ quốc, vệ sĩ
vết thương, vết xe, vết nhơ, vết sẹo, vết bẩn
vi phạm, vi khuẩn, vi trùng, vi mạch, vi tính, vi diệu, vi phân, vi vu, vi hành, vi sinh
ví dụ, ví von, ví tiền
vĩ đại, vĩ nhân, vĩ tuyến, vĩ mô, vĩ cầm, vĩ thanh
vị trí, vị giác, vị thần, vị tha, vị thế, vị lai, vị kỷ
việc làm, việc nhà
viên chức, viên mãn, viên đạn, viên thuốc, viên ngọc
viễn cảnh, viễn thông, viễn tưởng, viễn chinh, viễn du, viễn xứ, viễn thị, viễn vông
viện dẫn, viện trợ, viện sĩ, viện binh, viện phí
viết lách, viết văn
vinh dự, vinh hạnh, vinh quang, vinh danh, vinh hoa, vinh hiển, vinh thăng
vĩnh biệt, vĩnh cửu, vĩnh hằng, vĩnh viễn, vĩnh hằng
vịnh biển
vịt quay
vô biên, vô cùng, vô danh, vô duyên, vô địch, vô giá, vô hại, vô hạn, vô hình, vô ích, vô lý, vô ơn, vô song, vô tận, vô tình, vô tư, vô vọng, vô dụng, vô cảm, vô tội, vô số, vô học, vô cớ, vô thường, vô tuyến, vô định, vô tâm, vô sản, vô thần
vỗ tay, vỗ về
vội vã, vội vàng
vốn liếng, vốn dĩ, vốn quý
vỡ lòng, vỡ mộng, vỡ nợ, vỡ òa, vỡ vụn
với tay
vợ chồng, vợ con
vua chúa
vui chơi, vui mừng, vui sướng, vui tươi, vui vẻ, vui lòng, vui nhộn, vui tính, vui thú, vui buồn, vui đùa
vùng đất, vùng biển, vùng trời, vùng ven, vùng sâu, vùng cao, vùng quê, vùng miền
vũ khí, vũ trụ, vũ công, vũ điệu, vũ đạo, vũ lực, vũ trường, vũ bão, vũ trang, vũ nữ
vụ án, vụ mùa, vụ việc, vụ lợi
vườn tược, vườn hoa, vườn rau, vườn thú
vương quốc, vương miện, vương giả, vương quyền, vương triều, vương vấn, vương phi, vương tôn
vướng mắc, vướng víu, vướng bận
vượt qua, vượt trội, vượt bậc, vượt ngục, vượt rào, vượt khó
vững chắc, vững vàng, vững mạnh, vững bền, vững tâm
xa cách, xa hoa, xa lạ, xa xôi, xa xỉ, xa vắng, xa lánh, xa xăm, xa quê, xa xưa, xa lộ
xà phòng, xà lách, xà beng, xà ích
xã hội, xã giao, xã luận, xã viên, xã đoàn, xã tắc
xác định, xác minh, xác nhận, xác suất, xác thực, xác chết, xác xơ
xám xịt, xám ngắt
xán lạn
xanh xao, xanh rờn, xanh lam, xanh ngắt, xanh tươi, xanh lục, xanh mướt, xanh biếc, xanh rì
xảo quyệt, xảo trá
xát muối
xay xát
xăm mình
xắn tay
xâm lược, xâm nhập, xâm phạm, xâm chiếm, xâm hại, xâm lăng, xâm thực
xấu hổ, xấu xa, xấu số, xấu tính, xấu xí
xây dựng, xây đắp, xây xát
xe buýt, xe cộ, xe đạp, xe hơi, xe lửa, xe máy, xe tăng, xe tải, xe ôm, xe điện, xe khách, xe ngựa
xem xét, xem trọng, xem nhẹ
xén tóc
xích đu, xích đạo, xích lô, xích mích
xiêm y
xiếc thú
xin lỗi, xin phép, xin việc, xin xỏ, xin chào
xinh đẹp, xinh xắn, xinh tươi, xinh xinh
xó xỉnh
xoa dịu, xoa bóp
xóa bỏ, xóa nhòa, xóa sổ
xoáy nước
xóm làng, xóm giềng, xóm trọ
xôi gấc, xôi xéo
xông pha, xông xáo, xông khói
xốp xộp
xơ xác
xúc động, xúc giác, xúc phạm, xúc tiến, xúc xích, xúc cảm, xúc tác
xuất bản, xuất hiện, xuất khẩu, xuất phát, xuất sắc, xuất xứ, xuất thân, xuất chúng, xuất ngũ, xuất hành, xuất trận, xuất viện, xuất quỹ
xuân xanh, xuân thì, xuân sắc
xung đột, xung kích, xung phong, xung quanh, xung lực, xung yếu
xứng đáng, xứng tầm
xử lý, xử án, xử sự, xử phạt, xử thế, xử trí, xử tử
xương sống, xương sườn, xương máu, xương cốt, xương rồng
xưởng phim, xưởng may
yếu đuối, yếu tố, yếu kém, yếu ớt, yếu điểm, yếu lược
yên bình, yên lặng, yên tâm, yên tĩnh, yên ổn, yên ả, yên vui, yên giấc, yên ngựa
yêu cầu, yêu dấu, yêu đời, yêu mến, yêu quý, yêu thương, yêu nước, yêu kiều, yêu quái, yêu ma, yêu sách, yêu chiều, yêu tinh, yêu thích, yêu đương
ý chí, ý kiến, ý nghĩa, ý thức, ý tưởng, ý định, ý muốn, ý niệm, ý đồ, ý tứ, ý nguyện
sĩ khí, sĩ quan, sĩ diện, sĩ tử, sĩ phu
đời sống, đời người, đời thường, đời đời, đời tư, đời xưa
pháp luật, pháp lý, pháp sư, pháp đình, pháp chế, pháp quyền, pháp danh, pháp nhân
sát thủ, sát cánh, sát nhân, sát hại, sát sườn, sát hạch, sát khí, sát thương
vọng tưởng, vọng cổ, vọng gác, vọng lâu, vọng ngoại
nhiên liệu, nhiên hậu
liệu pháp, liệu trình, liệu hồn
bản lĩnh, bản thân, bản chất, bản đồ, bản sắc, bản năng, bản quyền, bản xứ, bản tin, bản nhạc, bản địa, bản lề, bản thảo, bản án, bản vẽ, bản làng
gió mùa, gió bão, gió lốc, gió heo, gió đông, gió nồm, gió xuân
tướng quân, tướng lĩnh, tướng mạo, tướng số, tướng tá, tướng cướp
ngữ pháp, ngữ văn, ngữ điệu, ngữ cảnh, ngữ âm, ngữ liệu, ngữ nghĩa
con cái, con người, con đường, con số, con cháu, con mắt, con tim, con trai, con gái, con dấu, con buôn, con thuyền, con nuôi, con đẻ, con rối, con vật, con ngươi
ứng cử, ứng dụng, ứng phó, ứng xử, ứng viên, ứng biến, ứng nghiệm, ứng trước, ứng tuyển
tố cáo, tố giác, tố tụng, tố chất, tố khổ
cực khổ, cực đoan, cực điểm, cực kỳ, cực độ, cực hình, cực quang, cực nhọc, cực lạc
xét xử, xét duyệt, xét nghiệm, xét tuyển, xét lại
tuyến đường, tuyến tính, tuyến giáp, tuyến lệ, tuyến xe
non sông, non nớt, non trẻ, non nước, non tay, non bộ
thoại kịch
niệm phật
cư dân, cư trú, cư xử, cư ngụ, cư sĩ
qua đời, qua loa, qua lại, qua đêm, qua mặt, qua sông
lược bỏ, lược đồ, lược sử, lược dịch, lược thuật
quốc gia, quốc tế, quốc ca, quốc kỳ, quốc hội, quốc phòng, quốc tịch, quốc lộ, quốc huy, quốc khánh, quốc ngữ, quốc dân, quốc sự, quốc hồn, quốc túy, quốc học, quốc vương, quốc doanh
suất ăn, suất học
ngủ ngon, ngủ gật, ngủ nghê, ngủ đông, ngủ say, ngủ trưa
não nề, não nùng, não bộ
răng miệng, răng sữa, răng khôn, răng cửa, răng cưa, răng nanh
phạt góc, phạt đền, phạt tiền, phạt vạ
tộc trưởng, tộc người, tộc phả
tốc độ, tốc hành, tốc ký, tốc chiến
nghị lực, nghị quyết, nghị sĩ, nghị viện, nghị định, nghị luận, nghị trường, nghị án
ngũ cốc, ngũ quan, ngũ hành, ngũ tạng, ngũ sắc, ngũ vị
mình mẩy
ái mộ, ái ngại, ái quốc, ái tình, ái nữ, ái nam
niên khóa, niên đại, niên học, niên kỷ, niên lịch, niên giám, niên thiếu
nguồn gốc, nguồn cội, nguồn lực, nguồn vốn, nguồn sống, nguồn tin, nguồn điện, nguồn nước, nguồn cơn
cả nhà, cả thảy, cả nể, cả tin, cả quyết, cả gan, cả đời, cả ngày
vực thẳm, vực sâu, vực dậy
họp mặt, họp chợ, họp báo, họp hành
xạ thủ, xạ trị, xạ kích, xạ hương
vẻ vang, vẻ đẹp, vẻ ngoài, vẻ mặt
cầm quyền, cầm cự, cầm lái, cầm đầu, cầm cố, cầm thú, cầm chừng, cầm ca, cầm tù
tá điền, tá túc, tá hỏa, tá tràng
phái đoàn, phái viên, phái mạnh, phái đẹp, phái yếu, phái sinh
du lịch, du khách, du học, du kích, du ngoạn, du hành, du xuân, du thuyền, du canh, du mục, du dương, du côn, du nhập
nghiệm thu, nghiệm số
tế bào, tế nhị, tế lễ, tế độ
muội than
đỡ đầu, đỡ đẻ, đỡ đần
mã số, mã hóa, mã lực, mã nguồn, mã vạch, mã não
trừ khử, trừ tà, trừ phi, trừ bị, trừ hao
nhau thai
tàu hỏa, tàu thủy, tàu điện, tàu ngầm, tàu bay, tàu lượn, tàu chiến, tàu thuyền
cháy nổ, cháy rừng, cháy nhà, cháy túi, cháy bỏng
tín dụng, tín hiệu, tín đồ, tín ngưỡng, tín nhiệm, tín chỉ, tín phiếu, tín nghĩa
nối dõi, nối gót, nối khố, nối tiếp
chắn bùn
dâu tây, dâu tằm, dâu rể
ngược đãi, ngược dòng, ngược lại, ngược xuôi, ngược chiều
tải trọng, tải xuống, tải lên
thuốc men, thuốc lá, thuốc bổ, thuốc tây, thuốc nam, thuốc độc, thuốc nổ, thuốc lào
mạc phủ
điệp viên, điệp khúc, điệp vụ, điệp ngữ
khích lệ, khích tướng, khích bác
xá lợi, xá tội
điển hình, điển cố, điển tích, điển trai
áp lực, áp dụng, áp đặt, áp đảo, áp chế, áp giải, áp sát, áp suất, áp tải, áp thấp
ức chế, ức hiếp
cỏ cây, cỏ dại, cỏ may, cỏ lau, cỏ non
xếp hàng, xếp hạng, xếp đặt, xếp loại
mì chính, mì tôm, mì ống, mì xào
buộc tội, buộc lòng
chấp nhận, chấp hành, chấp thuận, chấp nê, chấp chới, chấp bút
xứ sở, xứ đạo
băng giá, băng bó, băng hà, băng nhóm, băng rôn, băng đảng, băng ghế, băng tuyết, băng keo, băng qua
lộc vừng, lộc non
ngôn ngữ, ngôn từ, ngôn luận, ngôn tình, ngôn hành
cứ điểm
trúc mã
tả thực, tả cảnh, tả tơi, tả hữu, tả ngạn
trương mục
đô thị, đô đốc, đô vật, đô hộ, đô la, đô thành
sở thích, sở trường, sở hữu, sở dĩ, sở đoản, sở nguyện
đoạt giải, đoạt mạng
ép buộc, ép uổng
hỏa hoạn, hỏa táng, hỏa lực, hỏa tiễn, hỏa tốc, hỏa xa, hỏa ngục, hỏa mai
gọi điện, gọi món, gọi tên, gọi hồn
đạt được
vong ân, vong mạng, vong linh, vong hồn, vong quốc, vong niên
tệ nạn, tệ hại, tệ bạc
trữ lượng, trữ tình
chừng mực
ngân hàng, ngân sách, ngân hà, ngân quỹ, ngân khố, ngân nga, ngân phiếu
sau này, sau cùng, sau đó, sau khi
nào ngờ
địch thủ, địch quân, địch họa
oán hận, oán thán, oán trách, oán ghét
ở rể, ở lại, ở trọ, ở nhà
trộm cắp, trộm cướp
trưa hè
cần cù, cần mẫn, cần thiết, cần kiệm, cần câu
vơ vét, vơ vẩn
vở kịch, vở diễn
quát tháo, quát mắng
ngờ vực, ngờ nghệch
ngoài trời, ngoài ra, ngoài đường, ngoài lề
này nọ
tật nguyền, tật xấu, tật bệnh
cương quyết, cương trực, cương vị, cương lĩnh, cương thổ, cương nghị
soạn thảo, soạn giả, soạn nhạc, soạn bài
sữa chua, sữa tươi, sữa mẹ, sữa đậu
phiếu bầu, phiếu thu, phiếu chi
ngựa ô, ngựa vằn, ngựa chiến, ngựa gỗ, ngựa non
mát mẻ, mát lạnh, mát rượi, mát tay
ốc vít, ốc sên, ốc đảo, ốc bươu
tha thứ, tha hồ, tha thiết, tha hương, tha bổng, tha mạng, tha hóa, tha phương
bi kịch, bi quan, bi thảm, bi tráng, bi ai, bi thương, bi hài, bi ca
kho báu, kho tàng, kho bạc, kho hàng
ngục tù, ngục tối
đêm ngày, đêm hôm, đêm tối
điều tốt, điều hay
lý trưởng
ơn trời
lòng người
người đẹp, người già, người con, người đi
quê hương
nhà nông, nhà quan, nhà giàu, nhà sàn, nhà trọ
sĩ số
nhân tâm, nhân thọ, nhân viên
viên chức
chức trách
trách nhiệm
nhiệm vụ
vụ lợi
lợi lộc
lộc trời
trời phú
học trò
trò vui
vui lây
lây lan
lan man
y tá, y tế, y học, y khoa, y sĩ, y phục, y thuật, y bạ, y đức, y nguyên, y hệt
`;

/** Từ ghép không dấu cách lạ, không trùng; chuẩn hóa NFC. */
export const WORDS: string[] = [...new Set(RAW.split(/[,\n]/).map((w) => w.trim().normalize('NFC')).filter(Boolean))];
