# Ghi chú cho giáo viên duyệt

Toàn bộ nội dung bài học do Claude soạn và đang ở trạng thái **"Chưa duyệt"**. Giáo viên duyệt bằng bảng tính (`npm run review:export -w @j-learn-write/course`, sửa, rồi `review:import`; xem [content-guide.md](content-guide.md)). File này gom những điểm người soạn **không chắc** hoặc đã **tự quyết**, để giáo viên xem trước. Mỗi mục ghi bài liên quan.

## 1. Âm Hán Việt

- Âm Hán Việt lấy từ hai nguồn (KANJIDIC2 và danh sách Hán Việt ph0ngp, xem [handoff.md](handoff.md) mục 4). Khi hai nguồn không thống nhất, Claude chọn một âm chính (`packages/course/data/hanviet-overrides.json`) và app hiện dấu * cạnh âm đó.
- **38 kanji cần học có nhiều âm** (bảng dưới, sinh từ `data/jlpt/kanji.json` ngày 2026-11-16; danh sách mới nhất: các mục có `hanVietOthers`). 202 từ vựng mang dấu * (`hanVietAmbiguous` trong `data/jlpt/vocabulary.json`).

| Kanji | Cấp | Âm chính (nháp) | Âm khác |
|---|---|---|---|
| 中 | N5 | trung | trúng |
| 長 | N5 | trường | trưởng |
| 行 | N5 | hành | hàng, hạng, hạnh |
| 見 | N5 | kiến | hiện |
| 間 | N5 | gian | gián |
| 上 | N5 | thượng | thướng |
| 子 | N5 | tử | tý |
| 女 | N5 | nữ | nhữ |
| 語 | N5 | ngữ | ngứ |
| 食 | N5 | thực | tự |
| 万 | N5 | vạn | mặc |
| 読 | N5 | độc | đậu, đọc |
| 分 | N5 | phân | phận, phần |
| 会 | N4 | hội | cối |
| 場 | N4 | trường | tràng |
| 主 | N4 | chủ | chúa |
| 度 | N4 | độ | đạc |
| 強 | N4 | cường | cưỡng |
| 思 | N4 | tư | tứ |
| 正 | N4 | chính | chinh, chánh |
| 教 | N4 | giáo | giao |
| 重 | N4 | trọng | trùng |
| 画 | N4 | họa | hoạch |
| 使 | N4 | sử | sứ |
| 朝 | N4 | triều | triêu |
| 住 | N4 | trụ | trú |
| 少 | N4 | thiểu | thiếu |
| 空 | N4 | không | khống |
| 切 | N4 | thiết | tiếp |
| 転 | N4 | chuyển | chuyến |
| 足 | N4 | túc | tú |
| 楽 | N4 | lạc | nhạc |
| 親 | N4 | thân | thấn |
| 去 | N4 | khứ | khử |
| 悪 | N4 | ác | ố |
| 飲 | N4 | ẩm | ấm |
| 勉 | N4 | miễn | mẫn |
| 弟 | N4 | đệ | đễ |

- **Âm theo nghĩa của cả từ** (mục `words` trong `hanviet-overrides.json`): 勉強 miễn cưỡng, 音楽 âm nhạc, 弾く đàn, 冷蔵庫 lãnh tàng khố.
- **Đã sửa theo báo cáo khi soạn:** 冷 dữ liệu gốc ghi "lạnh" (là nghĩa tiếng Việt), đã đổi thành **lãnh** (冷たい, 冷える, 冷房, 冷蔵庫); 狭 hiệp (dữ liệu gốc "hẹp"); 画 họa (映画: ánh họa).
- **Ghi chú Hán Việt dễ gây hiểu lầm đã viết trong bài** (kiểm tra cách diễn đạt): 意味 ý vị, 文章 văn chương, 質問 chất vấn, 丈夫 trượng phu (khác 大丈夫), 背広 bối quảng, 靴下 ngoa hạ, 階段 giai đoạn, 入口/出口 nhập/xuất khẩu, 首 thủ (nghĩa là "cổ", không phải "đầu"), 無理 vô lý, 用意 dụng ý, 大事 đại sự, 人口 nhân khẩu, 運転手 vận chuyển thủ, 食事 thực sự.

## 2. Cách đọc (furigana) chọn tay

Bộ điền furigana tự động (`content:fill`) chọn cách đọc theo từ điển; những chỗ dưới đây người soạn chọn tay theo ngữ cảnh:

- 明日 đọc **あした** ở mọi bài (dự báo thời tiết thật thường nói あす; từ あす là từ N4 riêng, có trong n4-05).
- 何で: **なにで** (bằng gì) ở n5-08, n5-28; tránh なんで (vì sao). Các bài khác dùng なん trước で/です.
- Số đếm: 四 し/よん, 七 しち/なな (đếm xuôi/đếm ngược ở n5-04), 7時 しちじ, 10分 じゅっぷん, 一日 いちにち (không phải ついたち, ngày 1 dạy qua trợ số từ), 毎年 まいねん (ghi chú có nói まいとし).
- 人 ひと khi đứng một mình hoặc sau từ bổ nghĩa; 中 なか trong 〜の中; 行って いって; 開け/開い/開き あ; 降り ふ/お theo nghĩa; 入れ い; 熱 ねつ; 方 ほう trong so sánh.

## 3. Đáp án và bài tập có thể gây tranh cãi

- **Coi là sai nhưng có người vẫn nói:** 先生の質問**を**答えてください (n5-26-e21, chuẩn là に); 紅茶を好きです (n5-16-e05); 「電車は速いです」 trả lời câu hỏi どちら (n5-16-e07); スポーツの中でどちら (n5-16, chuẩn là 何/どれ); 兄は車を運転ができます (n4-04, −15); 帰るつもりではありません (n4-05).
- **Chấm 80 (cần xem lại) vì có thể đúng:** 金曜日の午後3時をお願いします; お父さんは元気になりました (nói về bố mình nên dùng 父, n5-27-e25); 日本語が英語より… (n5-16-e23); 今、母が料理を… (n5-19-e21); 冬は山へ登りたくない (n5-17-e23); ここで座ってはいけません (n5-20-e24); くれる/もらう thay くださる/いただく với cấp trên (n4-03, 70 điểm).
- **Chấm 0 dù gần đúng (bộ chấm không cho điểm một phần khi khác từ):** マイさんは赤いスカートを着ています (n5-19-e26, phải là はいています); 宿題しませんでした (85, thiếu を); グエンさんです (dùng さん cho chính mình); いいえ、どこかへ行きませんでした (n5-25-e26); thể khả năng bỏ ら (食べれません) ở n4-04.
- **Đáp án ngắn được chấp nhận 100:** 魚(の方)です, (私の)弟です, いいえ、まだです, はい、いいです / どうぞ / 使ってください, 6時(です), 自転車で。, 来週です。, コーヒー(を)ください / お願いします.
- **Bài chọn có đúng một đáp án?** 治りました/直りました với 風邪 (n4-10); 止みました/止まりました với 雨 (n4-13); 〜てきました/〜ていきました "(cho tới bây giờ)" (n4-12-e06); 間/間に và まで/までに (n4-07).
- **Câu "sai" chỉ sai theo ngữ cảnh** (ghi chú trong bài đã nói rõ): これ→それ (n5-02), ね→よ khi chỉ đường (n5-03), 2時→2時間 (n5-05), 来年、日本へ来ます khi người nói ở Việt Nam (n5-08), 見ますか dùng để mời (n5-10), 先生、コーヒーを飲みたいですか (bất lịch sự, n5-17), 先生、ここに座りなさい (thô, n4-10), 〜てあげます với cấp trên (n4-02), 行くと思います cho ý định của mình (n4-05), もし駅に着いたら… (n4-08).

## 4. Nội dung giải thích cần kiểm

- **Mẹo nhớ chữ:** 毎 giống 母; 行 là ngã tư; 車 là xe nhìn từ trên; 食 là nắp trên bát; 午/牛; 入/人; 出 là hai chữ 山; thứ tự nét 右/左; 口/工; 親 = 立 + 木 + 見; 集 = chim trên cây.
- **Thông tin thực tế:** bay Hà Nội → Đà Nẵng "khoảng 1 tiếng" (n5-15-e28); tuổi được uống rượu ở Nhật là 20 (n5-20); phòng khám nhỏ cũng gọi là 病院; 夕方 "khoảng 4–5 giờ chiều đến lúc trời tối"; いただきます dịch "Tôi xin phép ăn ạ"; 看護婦 là từ cũ, nay dùng 看護師 (n4); ガソリンスタンド là từ ghép kiểu Nhật.
- **Nghĩa:** 背 thêm nghĩa "lưng"; 零 ghi chú "thường nói ゼロ"; 生徒 là "học sinh cấp 2–3"; 地図を書いて (thay vì 描いて); 橋/箸 khác ở trọng âm; ストーブ là lò sưởi.
- **Biểu tượng hình** trong câu hỏi `count`/`location` (🧂 🌷 👛 📻 🚗…) và lời nhắc tiếng Việt của bài tự luận.

## 5. Quyết định giáo trình người soạn đã tự đưa ra

- n5-11 dạy phủ định 〜くありません (vì 〜くない dạy ở n5-12); n5-12 thêm 〜くないです.
- あげる và にぎやか hiển thị bằng kana (cách viết thông dụng); 上げる, 賑やか vẫn được chấp nhận khi chấm.
- Thể て dạy từ thể ます (thể từ điển ở n5-22); もう〜た dạy là もう〜ました; まだ〜ていない dạy là まだ〜ていません.
- Một số dạng trong bài đọc được nhờ từ thêm vào danh sách (`vocabulary-extra.json`): 私 わたし, 何 なに, 父, 母, 日本, そして, そう, ありがとうございます, おはようございます, 何曜日, 方 ほう, 時 とき, しまう.
- Từ vựng xếp vào bài khác với gợi ý của người soạn: いくつ (n5-15, có thể đưa về n5-04), 昼休み (n4-07, có thể đưa về n5-05).
- Các bài N4 tránh dùng ngữ pháp dạy sau (と思う, ので, だろう… trước bài của chúng); 一度 chỉ dùng từ n4-20.

## 6. Giới hạn của bộ chấm

Xem [design.md](design.md) mục 3 (mỗi luật: bắt gì, bỏ qua gì) và cuối mục 3 (những gì chưa hỗ trợ). Bộ chấm cho 0 điểm khi câu trả lời dùng từ khác đáp án, kể cả từ đồng nghĩa không có trong danh sách đáp án: giáo viên nên bổ sung đáp án khi gặp.
