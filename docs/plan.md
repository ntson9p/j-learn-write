# Kế hoạch: web app dạy tiếng Nhật sơ cấp (kana, N5, N4) cho người Việt

> **Trạng thái: chờ chủ dự án duyệt** (viết ngày 2026-11-15, giai đoạn 1). Chưa có dòng code nào trước khi kế hoạch được duyệt. Tiến độ từng giai đoạn sẽ ghi trong [handoff.md](handoff.md).
>
> Kế hoạch theo khuôn `docs/plan.md` của c-learn-write (commit `e51323e`). Tài liệu liên quan: [handoff.md](handoff.md).

## 1. Mục tiêu

Xây một **web app hoàn chỉnh dạy tiếng Nhật cho người Việt**, từ con số 0 tới trình độ **JLPT N4** (≈ CEFR A2), gồm:

- chặng **kana** (hiragana, katakana, âm đục, âm ghép, âm ngắt っ, trường âm) có luyện viết;
- **kanji** kèm **âm Hán Việt**, cách đọc on/kun, thứ tự nét, luyện viết;
- **từ vựng và ngữ pháp** của N5 và N4, giải thích bằng tiếng Việt, nhấn vào lỗi hay gặp của người Việt;
- **bài tập chấm tự động** (cả câu tự luận ngắn, chấm bằng luật), **ôn tập ngắt quãng FSRS**, **kiểm tra** cuối bài và theo cấp, **theo dõi tiến độ**.

Các nguyên tắc giữ nguyên từ c-learn-write:

1. **Không dùng LLM/AI khi app chạy.** Chấm bằng luật và tất định: cùng câu trả lời luôn cùng kết quả trên mọi máy, mọi trình duyệt.
2. **Chính xác trước, đầy đủ sau.** Luật chỉ báo lỗi khi chắc chắn, không bao giờ báo lỗi một câu đúng. Không chắc thì gắn cờ `needsReview`.
3. **Nội dung là JSON**, giáo viên duyệt qua bảng tính; app hiện nhãn "Chưa duyệt" cho tới khi duyệt xong.
4. **Tiếng Việt** cho giao diện, giải thích, nhận xét. Mọi đoạn tiếng Nhật trong HTML có `lang="ja"`.
5. **PWA chạy hoàn toàn trên máy:** không server, không thu thập dữ liệu; tiến độ trong IndexedDB, sao lưu/khôi phục bằng file; dùng được khi mất mạng; ưu tiên điện thoại.

**Ngoài phạm vi:** server, tài khoản, đồng bộ; nhận dạng giọng nói; N3 trở lên; trọng âm cao độ (để sau, mục 3.6); đề thi thử sao chép đề thật; bộ chuyển romaji → kana trong ô nhập (quyết định 5).

## 2. Các quyết định đã chốt (2026-11-15)

Chủ dự án trả lời 8 câu hỏi trắc nghiệm (hai đợt): chọn phương án khuyên dùng ở 6 câu; câu 5 và câu 8 chọn phương án khác.

| # | Vấn đề | Quyết định | Hệ quả chính |
|---|---|---|---|
| 1 | Phạm vi, chuẩn | **Kana + N5 + N4** theo danh sách cộng đồng của Jonathan Waller, qua bản máy đọc được **OpenJLPT** (CC BY-SA 4.0) | 1304 từ, 245 kanji cần học (đề xuất thêm 分, mục 3.2), 179 điểm ngữ pháp (rà lại). Ghi rõ trong app: JLPT không có danh sách chính thức |
| 2 | Kiến trúc, dùng lại mã | **Giữ kiến trúc c-learn-write, sao chép mã** | PWA, Preact 10.29.8 + Vite 8, monorepo `packages/grader`, `packages/course`, `apps/web`, FSRS (ts-fsrs), giọng đọc thiết bị. Ghi nguồn gốc từng file (đường dẫn + commit `e51323e`) trong handoff |
| 3 | Soạn và duyệt | **Claude soạn nháp, giáo viên duyệt bảng tính** | Nhãn "Chưa duyệt"; xuất/nhập CSV; âm Hán Việt còn nhiều khả năng có dấu * cho giáo viên chọn |
| 4 | Giấy phép | **Code MIT, nội dung CC BY-SA 4.0**; dùng dữ liệu EDRDG và OpenJLPT trong app | Ghi công trên trang "Giới thiệu"; **tải lại dữ liệu EDRDG và báo khác biệt trước mỗi lần phát hành** (giấy phép EDRDG bắt buộc, mục 3.8) |
| 5 | Nhập câu trả lời | **Chỉ bộ gõ tiếng Nhật của máy** + thẻ chữ cho bài sắp xếp câu | Có trang hướng dẫn cài bộ gõ (Android, iPhone, Windows, macOS). Bộ chấm chấp nhận câu viết toàn kana (người dùng bộ gõ có thể không đổi sang kanji). Câu trả lời bằng chữ Latin được nhắc "hãy bật bộ gõ tiếng Nhật", không chấm |
| 6 | Hiển thị | **Kanji + furigana tự động** | Từ viết dạng thường gặp (có kanji). Furigana hiện trên kanji chưa học, ẩn trên kanji đã học (cài đặt: tự động / luôn hiện / ẩn). Romaji chỉ ở chặng kana hoặc khi bấm nút. Hán Việt hiện trên thẻ từ và thẻ kanji; trong câu thì bật/tắt |
| 7 | Luyện viết | **animCJK + hanzi-writer** cho **177 kana + 245 kanji** | Dùng lại `writer.tsx`; build ghép các đoạn nét kana bị tách và kiểm tra số nét với KanjiVG (mục 3.5) |
| 8 | Phát hành | **Chỉ phát hành khi xong cả N5 và N4** | Một lần triển khai GitHub Pages ở cuối, hỏi chủ dự án trước. Trước đó chủ dự án thử bằng bản build chạy trên máy (mục 11) |

**Quyết định kỹ thuật tôi đề xuất (duyệt cùng kế hoạch):**

- **Phiên bản thư viện:** khóa đúng bộ phiên bản c-learn-write đang chạy xanh (mục 3.7); giữ Preact 10.29.8, chưa lên Preact 11.
- **Cách đọc lấy từ dữ liệu, không lấy từ bộ phân tích hình thái** (kuromoji đọc sai nhiều, mục 3.4). kuromoji chỉ dùng lúc soạn/test, để đối chiếu.
- **Bộ chấm khi chạy tự mang từ vựng của khóa học và bảng chia động từ/tính từ** (sinh lúc build), không đóng gói bộ phân tích hình thái (từ điển 18 MB nén).
- **WanaKana** (MIT, ~16 KB gzip) chỉ để hiện romaji và tra từ điển bằng romaji; không gắn vào ô nhập.
- **Từ có kanji ngoài bảng Jōyō, hoặc JMdict đánh dấu "thường viết bằng kana"** (ví dụ 飴, 噛む, 有る) thì viết bằng kana.

## 3. Kết quả khảo sát

Cột "Kiểm chứng": **Claude** = tôi tự mở nguồn gốc và đọc/đếm trong phiên 2026-11-15; **Agent** = chỉ agent tìm hiểu đọc nguồn gốc (ghi chú của agent có trích dẫn nguyên văn, tôi chưa tự mở lại); **Thứ cấp** = chỉ có nguồn thứ cấp. File tải về nằm trong scratchpad của phiên, không lưu vào repo.

### 3.1 Chuẩn trình độ

| Thông tin | Giá trị | Nguồn | Kiểm chứng |
|---|---|---|---|
| JLPT không công bố danh sách | FAQ: công bố "Test Content Specifications" gồm danh sách từ, kanji, ngữ pháp "was not necessarily appropriate" (từ khi đổi đề 2010) | [jlpt.jp FAQ][jlpt-faq] | Claude |
| JLPT ↔ CEFR | N5 đậu với tổng điểm ≥ 80 ghi A1; N4 ≥ 90 ghi A2 (từ kỳ 12/2025) | [jlpt.jp CEFR][jlpt-cefr] | Claude |
| JFT-Basic | Kiểm tra tiếng Nhật đời sống; ~50 câu/60 phút trên máy; 4 phần: 文字と語彙, 会話と表現, 聴解, 読解. Từ 8/2026 xếp A1, A2.1, A2.2; A2.2 dùng cho 特定技能1号. Thi ở Việt Nam từ năm tài chính 2025 | [jpf.go.jp/jft-basic][jft] | Agent |
| Bộ GD&ĐT, Thông tư 19/2021 | Tiếng Nhật Ngoại ngữ 1, lớp 3–12. Hết tiểu học Bậc 1: 50 hiragana, 50 katakana, ~900 từ (~600 chủ động), 55 chữ Hán, 42 cấu trúc. Hết THCS Bậc 2: thêm ~1200 từ, 240 chữ Hán, 100 cấu trúc. Hết THPT Bậc 3: thêm ~1200 từ, 240 chữ Hán, 90 cấu trúc | [Công báo số 691+692][tt19] (bản PDF có lớp chữ) | Claude (đọc số liệu); bảng nội dung chi tiết từng lớp là ảnh quét, chưa đọc |
| 日本語教育の参照枠 (2021) | Khung A1–C2 theo CEFR; **không có** danh sách từ/ngữ pháp; có 122 "基礎漢字" tới A2. Trang bunka.go.jp theo quy tắc của MEXT (公共データ利用規約 1.0, tương thích CC BY 4.0, trừ nội dung của bên thứ ba) | [bunka.go.jp][sansyo] | Agent |
| JF Standard, Marugoto | Can-do được dùng miễn phí nhưng không phải giấy phép mở rõ ràng; danh sách từ Marugoto cấm công bố bản đã sửa | [jfstandard][jfs], [marugoto][marugoto] | Agent |
| Irodori (JF) | 4 tập (入門 A1, 初級1 A2, 初級2 A2, 初中級 A2/B1); có danh sách từ, kanji (644), mẫu câu. Điều khoản: **không được dùng để soạn tài liệu khác** ("本サイトと全く関係のない別の教材…を新たに作成するために…用いることはできません") | [irodori privacy][irodori] | Claude (điều khoản); Agent (số liệu) |

**Kết luận.** N5 + N4 ≈ A1 + A2, trùng mức JFT-Basic A2 (visa kỹ năng đặc định) và gần Bậc 2 của chương trình phổ thông. Không có danh sách chính thức nào dùng được với giấy phép mở; danh sách Waller là chuẩn cộng đồng (jisho.org cũng dùng). Irodori, Marugoto, đề mẫu JFT-Basic chỉ dùng để tham khảo phạm vi, không chép.

### 3.2 Danh sách từ, kanji, ngữ pháp N5–N4

| Thông tin | Giá trị | Kiểm chứng |
|---|---|---|
| OpenJLPT | <https://github.com/evanclan/OpenJLPT>, commit `0d1d341` (2026-10-02), bản dữ liệu 0.3.0, CC BY-SA 4.0. Từ và kanji: cấp theo danh sách Waller, nối với JMdict (id, từ loại); ngữ pháp: "đồng thuận của sách luyện thi", do OpenJLPT tự viết | Claude (đọc repo, NOTICE, đếm) |
| Số lượng | N5: 674 từ, 84 kanji (79 Waller + 5 "bổ sung": 分 無 丈 誰 貼), 81 điểm ngữ pháp. N4: 630 từ, 169 kanji (166 + 3 bổ sung: 坊 凄 痩; 凄, 痩 không thuộc Jōyō), 98 điểm ngữ pháp | Claude |
| Kanji trong từ vựng | 674 từ N5 dùng 417 kanji khác nhau; 1304 từ N5+N4 dùng 723 kanji. Chỉ 245 chữ thuộc danh sách kanji của Waller | Claude |
| So với JLPT cũ | Trường `jlpt` của KANJIDIC2 là JLPT cũ 4 cấp (cấp 4: 103, cấp 3: thêm 181 = 284). 39 chữ có trong JLPT cũ cấp 4+3 nhưng không có trong Waller N5+N4, trong đó có 分 | Claude |
| Giấy phép danh sách Waller | Ba README thứ cấp ghi "Creative Commons BY" (không ghi phiên bản). tanos.co.uk chỉ chạy `http://`, không vào được từ môi trường này | Thứ cấp |

**Đề xuất:**

- Kanji cần học (thẻ kanji, Hán Việt, luyện viết, furigana ẩn khi đã học) = **245 chữ của Waller + 分** (rất cơ bản, có trong JLPT cũ cấp 4). Các chữ "bổ sung" khác của OpenJLPT không học riêng, chỉ hiện kèm furigana.
- Ngữ pháp: lấy 179 điểm của OpenJLPT làm **danh sách kiểm tra phủ đủ** (giữ id của OpenJLPT); giải thích tiếng Việt do dự án tự viết, không dịch phần giải thích tiếng Anh của OpenJLPT. Được phép gộp hai điểm gần nhau vào một bài, hoặc thêm điểm cần cho người Việt (ví dụ nhóm động từ, cách đếm), nhưng mỗi điểm của danh sách phải được dạy ở đúng một bài.

### 3.3 Âm Hán Việt

| Thông tin | Giá trị | Kiểm chứng |
|---|---|---|
| KANJIDIC2 | <https://www.edrdg.org/kanjidic/kanjidic2.xml.gz>, database_version 2026-319 (tạo 2026-11-15), SHA-256 file gz `61f8bcbf3a1f41d3ec9e438e106659281aa32003430f2cc6fed5148b91d2e226`. 13 108 chữ; 2136 chữ Jōyō, **2134 có âm Việt** (thiếu 𠮟, 剝); 513 chữ Jōyō có nhiều âm. Thứ tự âm trong file theo chữ cái, không cho biết âm chính (生: Sanh, Sinh) | Claude |
| Lỗi trong KANJIDIC2 | Một số âm **nghi sai** ở chữ dạng Nhật: 着 "Khán" (đúng ra trước/trứ), 桜 "Tí/Tý" (anh, từ 櫻), 晩 "Hào/Mạn/Man" (vãn), 仮 "Phản" (giả), 択 "Mân/Thước/Xách" (trạch), 県 "Huyền" (huyện) | Claude (cần giáo viên xác nhận) |
| ph0ngp/hanviet-pinyin-wordlist | Commit `b9923df` (cùng commit c-learn-write dùng), MIT, xếp theo chữ phồn thể + pinyin | Claude |
| Quy đổi chữ Nhật → phồn thể | `JPShinjitaiCharacters.txt` của OpenCC (Apache-2.0, 403 cặp: 図→圖, 駅→驛, 売→賣…). Unihan 18.0 không có 図→圖. Bảng 常用漢字表 (2010, 告示, không được bảo hộ theo Điều 13 Luật Bản quyền Nhật) có 360 chữ kèm dạng cũ trong ngoặc; 62 dạng cũ là "CJK Compatibility Ideograph", **bị chuẩn hóa NFC đổi về dạng mới** | Claude (OpenCC, Unihan); Agent (常用漢字表, Điều 13) |
| Đối chiếu hai nguồn | Chuẩn hóa vị trí dấu thanh (hỏa/hoả) và i/y. Với 245 kanji: **217 chữ ra đúng một âm chung**, 27 chữ còn nhiều âm (中, 長, 行, 見, 上, 子, 女, 語, 食, 万, 読, 会, 場, 度, 強, 思, 正, 重, 使, 朝, 少, 空, 楽, 親, 悪, 飲, 弟), 1 chữ không khớp (着) | Claude |

**Cách làm:**

- Âm Hán Việt của **kanji**: một âm chính + các âm khác. Tự động khi hai nguồn chỉ chung một âm; còn lại Claude đề xuất, đánh dấu `hanVietAmbiguous` (app hiện dấu *), giáo viên chọn.
- Âm Hán Việt của **từ**: theo từng chữ, chọn theo nghĩa trong từ (音楽 âm nhạc, 楽しい lạc). Test kiểm tra mỗi âm nằm trong tập âm của chữ (KANJIDIC2 ∪ ph0ngp) và báo các chữ chưa chọn.
- App cảnh báo từ có nghĩa khác từ Hán Việt quen thuộc (ví dụ 勉強 "miễn cưỡng" nhưng nghĩa là học, 大丈夫 "đại trượng phu" nhưng nghĩa là "không sao"), như c-learn-write làm với tiếng Trung.

### 3.4 Cách đọc, furigana, bộ phân tích hình thái

| Thông tin | Giá trị | Kiểm chứng |
|---|---|---|
| kuromoji 0.1.2 | Apache-2.0; từ điển mecab-ipadic-2.7.0 (NAIST, cho phép dùng lại kèm thông báo); 18 MB nén, 41 MB giải nén; bản phát hành cuối năm 2018 | Claude |
| Thử kuromoji | Đọc sai: 家 → カ, 日本 → ニッポン, 一人 → イチ・ニン, 二十日 → ニ・ジュウ・ニチ, 三本 → サン・ホン (thiếu biến âm ぼん). Đúng: 今日, 明日, 大人, 何人, 来ます, 上手. Có loại chia và dạng chia (五段・カ行促音便, 連用タ接続…) | Claude |
| JMdict | <https://www.edrdg.org/pub/Nihongo/JMdict.gz> (tạo 2026-11-15, SHA-256 `e7e2e1722ebefb52da5b13c242e0d77662b8605cd35ac9aa39fcd6effe5a73d4`), CC BY-SA 4.0. **Không có nghĩa tiếng Việt** (13 chỗ `vie` chỉ là nguồn từ mượn: bánh mì, Sài Gòn…). Có loại từ (v1, v5k, vs, adj-i, adj-na…) và nhãn "thường viết bằng kana" | Claude |
| JmdictFurigana | <https://github.com/Doublevil/JmdictFurigana>, commit `8ab9472`: furigana theo từng chữ cho mục từ JMdict; giấy phép như JMdict; phát hành hàng tháng | Claude (đọc README) |
| Lựa chọn khác | lindera-wasm 6.2.0 (MIT, 2026-09), Sudachi (Apache-2.0, bản wasm 125 MB) | Claude (npm) |

**Cách làm (tránh lặp lại lỗi pinyin-pro của c-learn-write):**

1. Mỗi từ của khóa học có cách đọc (JMdict) và **furigana theo từng chữ** (JmdictFurigana, rà tay).
2. Câu ví dụ được điền furigana bằng `content:fill`: tách câu bằng chính bộ tách từ của bộ chấm (mục 4.2, dựa trên từ vựng khóa học), lấy cách đọc từ dữ liệu từ. Chữ có nhiều cách đọc theo ngữ cảnh (何 なに/なん, 人 ひと/にん/じん, 一日 いちにち/ついたち, 今日 きょう/こんにち, 上手 じょうず/うわて…) được **đánh dấu để người soạn chọn**, không đoán.
3. Script `content:readings` so cách đọc của khóa học với kuromoji, liệt kê mọi chỗ khác nhau để rà (giống việc rà 得, 地, 过 ở c-learn-write).
4. Test: với mỗi đoạn furigana của **một** kanji, cách đọc phải là âm on (đổi sang hiragana) hoặc gốc âm kun của chữ đó trong KANJIDIC2, cho phép biến âm (k→g, s→z, t→d, h→b/p) và âm ngắt (つ/ち/く/き → っ). Đoạn furigana phủ **nhiều** kanji (熟字訓 như 今日, 明日, 大人, 一人, 二十日, 時計, 部屋) phải có trong danh sách khai báo riêng `data/jukujikun.json`.

### 3.5 Thứ tự nét và luyện viết

| Thông tin | Giá trị | Kiểm chứng |
|---|---|---|
| hanzi-writer-data (c-learn-write) | Không dùng: thiếu 図, 駅, 売, 読, 帰, 気, 楽, 歩, 黒; tự hình và thứ tự nét theo tiếng Trung | Chủ dự án (2026-11-15) |
| animCJK | <https://github.com/parsimonhi/animCJK>, commit `c63765b` (2026-11-08). `graphicsJa.txt` (7343 chữ, phủ 2136/2136 Jōyō), `graphicsJaKana.txt` (177 kana), **đúng định dạng Make Me a Hanzi** (strokes + medians). Giấy phép file `graphics*`: Arphic Public License (sửa file thì phải ghi chú thay đổi và ngày) | Claude |
| Làm thử | hanzi-writer 3.7.3 + animCJK trong Chromium với 今, 図, 日, 直, 駅, あ, お, な, ぬ: vẽ đúng chiều, tự hình Nhật (今 nét 3 nằm ngang, 直 8 nét). Số nét khớp KANJIDIC2 cho 284 chữ JLPT cũ cấp 4+3 | Claude |
| Bẫy kana | Nét tự cắt bị tách thành đoạn phụ (あ 4 đoạn/3 nét, お 4/3, な 5/4, ぬ 4/2). Quy tắc "đoạn có đường trục ra ngoài khung là phần nối của nét trước" đúng cho **173/177 kana**; 4 chữ す, ず, ね, の cần khai báo tay | Claude |
| KanjiVG | <https://github.com/KanjiVG/kanjivg>, commit `610091c` (2026-11-05), CC BY-SA 3.0 (Ulrich Apel); chỉ có đường trục; số nét kana đúng → dùng làm chuẩn đối chiếu khi build, không đóng gói | Claude |
| Kích thước | Dữ liệu nét 245 kanji + 177 kana ≈ 735 KB (≈ 300 KB gzip), mỗi chữ một file, tải khi cần, service worker lưu sẵn | Claude |

### 3.6 Nghĩa tiếng Việt, câu ví dụ, âm thanh, trọng âm

| Thông tin | Giá trị | Kiểm chứng |
|---|---|---|
| Từ điển Nhật–Việt mở | Không tìm thấy từ điển nào có giấy phép mở rõ ràng (JaViCorpus chỉ cho nghiên cứu, cấm thương mại) | Claude (tìm kiếm web) |
| Tatoeba | Câu: CC BY 2.0 FR (một số CC0); âm thanh phần lớn không có giấy phép dùng lại. Bản xuất 2026-11-14: 6123 câu tiếng Nhật có bản dịch tiếng Việt trực tiếp | Agent |
| Trọng âm | Kanjium: CC BY-SA 4.0, bắt buộc ghi công "Uros O.", phần lấy từ EDICT theo giấy phép EDRDG; UniDic 3.1.0 có dữ liệu trọng âm (GPL/LGPL/BSD). Chương trình Bộ GD&ĐT có nội dung trọng âm | Agent |
| Giọng đọc | Web Speech API, giọng `ja-JP` của thiết bị (sửa `speech.ts` của c-learn-write). Chưa kiểm chứng trên điện thoại thật | — |

**Cách làm:** nghĩa tiếng Việt, câu ví dụ, giải thích ngữ pháp do Claude tự soạn; JMdict (nghĩa tiếng Anh) chỉ để tham khảo khi soạn (hiện trong `content:brief`), không đưa vào app. Không dùng câu Tatoeba hay câu ví dụ của OpenJLPT (lấy từ Tatoeba). Trọng âm để sau N4 (nguồn Kanjium dùng được, cần quyết định riêng).

### 3.7 Thư viện và phiên bản

Khóa đúng phiên bản; các phiên bản dưới đây là bộ c-learn-write đang chạy xanh (`npm run check` 405 test trong môi trường này, 2026-11-15). Kiểm tra lại ở giai đoạn 2.

| Thư viện | Phiên bản | Giấy phép | Ghi chú |
|---|---|---|---|
| typescript | 7.0.2 | Apache-2.0 | |
| vite | 8.3.8 | MIT | ra 2026-11-11, chưa đủ 2 tuần nhưng đã chạy xanh ở c-learn-write; nếu có lỗi lùi về 8.3.5 |
| vitest | 5.1.0 | MIT | ra 2026-11-02 |
| preact | 10.29.8 | MIT | Preact 11.2.0 là bản lớn mới (2026-11-06), chưa dùng |
| @preact/signals, @preact/preset-vite | 2.11.4, 2.10.6 | MIT | |
| idb, ts-fsrs | 8.0.4, 6.0.0 | ISC, MIT | ts-fsrs dùng srs-kit 1.0.0 (BSD-3-Clause) |
| vite-plugin-pwa (workbox 7.4) | 2.0.0 | MIT | `clientsClaim`, `skipWaiting` bật |
| hanzi-writer | 3.7.3 | MIT | |
| wanakana | 5.3.1 | MIT | chỉ hiện romaji, tra từ điển |
| happy-dom, @testing-library/preact, fake-indexeddb | 21.0.4, 3.2.6, 6.2.7 | MIT, MIT, Apache-2.0 | chỉ khi test |
| playwright, axe-core | 1.63.0, 4.14.0 | Apache-2.0, MPL-2.0 | chỉ khi test |
| kuromoji | 0.1.2 | Apache-2.0 (+ mecab-ipadic, NAIST) | chỉ lúc soạn/test, không vào app |

### 3.8 Nguồn dữ liệu sẽ dùng và nghĩa vụ

| Nguồn | Dùng để | Giấy phép | Nghĩa vụ | Kiểm chứng |
|---|---|---|---|---|
| OpenJLPT (Waller, JMdict, KANJIDIC2, Tatoeba) | Danh sách từ, kanji, ngữ pháp N5–N4; id JMdict | CC BY-SA 4.0 | Ghi công OpenJLPT **và** các nguồn của nó (Waller, EDRDG); chia sẻ tương tự | Claude |
| KANJIDIC2 (EDRDG) | Âm on/kun, số nét, âm Việt (đối chiếu), cấp Jōyō | CC BY-SA 4.0 + điều kiện EDRDG | Ghi công trên một màn hình riêng (trang Giới thiệu), liên kết tài liệu và giấy phép; **có quy trình cập nhật định kỳ** (mục 4 của giấy phép: không cập nhật là vi phạm); không nhận bản quyền phần dữ liệu đó | Claude |
| JMdict (EDRDG) | Cách đọc, loại từ, nhãn "thường viết kana"; nghĩa tiếng Anh để tham khảo khi soạn | CC BY-SA 4.0 + điều kiện EDRDG | Như trên | Claude |
| JmdictFurigana | Furigana theo từng chữ của từ | CC BY-SA (như JMdict) | Ghi công | Claude |
| ph0ngp/hanviet-pinyin-wordlist | Âm Hán Việt (đối chiếu, chọn âm chính) | MIT | Giữ thông báo MIT | Claude |
| OpenCC `JPShinjitaiCharacters.txt` | Quy đổi chữ Nhật → phồn thể để tra Hán Việt (chỉ lúc soạn) | Apache-2.0 | Giữ thông báo | Claude |
| animCJK (`graphicsJa*.txt`) | Dữ liệu nét kana và kanji | Arphic Public License | Kèm `ARPHICPL.TXT`; file đã sửa (ghép nét kana) phải ghi chú thay đổi và ngày | Claude |
| KanjiVG | Số nét chuẩn để kiểm tra (chỉ lúc build) | CC BY-SA 3.0 | Ghi công nếu đóng gói; hiện chỉ dùng kiểm tra | Claude |

Thư viện chạy trong app (preact, idb, ts-fsrs, workbox, hanzi-writer, wanakana) giữ thông báo giấy phép trong `licenses.txt` (plugin `build/licenses.ts` của c-learn-write).

**Quy trình cập nhật dữ liệu EDRDG:** `npm run sources:fetch` tải bản mới nhất, ghi ngày và SHA-256, sinh lại các phần cắt và **in danh sách mục thay đổi** ảnh hưởng tới khóa học; chạy trước mỗi lần phát hành (và ít nhất mỗi tháng khi app đã phát hành). Trang Giới thiệu ghi ngày dữ liệu.

### 3.9 Phông chữ

- Android: `fonts.xml` của AOSP gán `lang="ja"` cho mặt chữ Nhật của Noto Sans CJK; Chrome Android chuyển ngôn ngữ của phần tử vào việc chọn phông cho chữ CJK. Thiếu `lang="ja"`, máy cài tiếng Việt có thể hiện 直, 骨, 今 theo tự hình Trung. (Agent, đọc mã nguồn AOSP và Chromium)
- iOS: Hiragino Sans là phông hệ thống; WebKit chuyển ngôn ngữ cho CoreText. (Agent; chưa thử trên máy)
- `system-ui` có thể bỏ qua `lang` (MDN, CSS Fonts 4). (Agent)

**Cách làm:** không nhúng phông; mọi đoạn tiếng Nhật có `lang="ja"`; CSS cho `:lang(ja)` dùng danh sách phông sans-serif (Hiragino Sans, Noto Sans CJK JP, Noto Sans JP, Yu Gothic, Meiryo, sans-serif), không dùng `system-ui`. Test quét mọi trang: chữ kana/kanji nào nằm ngoài phần tử `lang="ja"` thì báo lỗi.

### 3.10 Lưu ý bản quyền (không phải ý kiến pháp lý)

- Không chép bài khóa, hội thoại, câu ví dụ của Minna no Nihongo, Genki, Marugoto, Irodori…, của đề thi hay đề mẫu (JLPT, JFT-Basic). Câu của app do Claude tự viết.
- Điều khoản Irodori cấm dùng nội dung của họ để soạn tài liệu khác; danh sách từ Marugoto cấm công bố bản đã sửa. Hai nguồn này chỉ dùng để tham khảo phạm vi chủ đề.
- Văn bản quy phạm pháp luật Việt Nam (Thông tư 19/2021) và 告示 của Nhật (常用漢字表) không được bảo hộ quyền tác giả (Luật SHTT Điều 15; 著作権法 第13条). (Agent đọc nguyên văn)
- Nội dung CC BY-SA 4.0: app ghi giấy phép và nguồn, không khóa nội dung bằng biện pháp kỹ thuật.

## 4. Kiến trúc

### 4.1 Cấu trúc repo

```
package.json                 workspaces + scripts chung: typecheck, test, check, dev, build, preview, e2e
tsconfig.base.json, tsconfig.json, vitest.config.ts, .editorconfig, .gitattributes, .gitignore
LICENSE                      MIT (code)
THIRD_PARTY_NOTICES.md       giấy phép của dữ liệu và thư viện bên thứ ba
.github/workflows/ci.yml     check + build trên Node 22/24, e2e trên Chromium
.github/workflows/deploy.yml GitHub Pages, chỉ chạy tay

packages/grader/             @j-learn-write/grader
  src/core/                  chép gần nguyên vẹn: types (LangCode = 'ja'), patterns, align, fixes, scoring, validate
  src/lang/ja/               gói tiếng Nhật, viết mới theo khuôn lang/zh (mục 4.2)
  src/grade.ts, highlight.ts, index.ts
  questions/ja/              câu hỏi mẫu (mỗi ví dụ là một test)
packages/course/             @j-learn-write/course (nội dung CC BY-SA 4.0)
  sources/                   phần cắt của nguồn, khóa theo commit/ngày, SHA-256, LICENSE, SOURCE.md
  data/                      JSON: jlpt/ (sinh tự động), kana.json, curriculum.json, lessons/, names.json, levels.json…
  src/                       kiểu dữ liệu, đọc dữ liệu, kiểm tra nội dung, furigana, Hán Việt, CSV duyệt
  scripts/                   sources:fetch, data:build, content:fill, content:brief, content:readings,
                             review:export, review:import
  tests/                     kiểm tra toàn bộ nội dung (CONTENT_FILTER)
apps/web/                    @j-learn-write/web: Preact + Vite + PWA
docs/                        plan.md, handoff.md, design.md, content-guide.md, review-notes.md
```

- **Chiều phụ thuộc** như c-learn-write: `apps/web` → `course`, `grader`; `course` → `grader` (để tự kiểm tra bài tự luận). App chỉ dùng API công khai của bộ chấm (có test ranh giới).
- **Chép từ c-learn-write** (theo bảng ở đề bài): khung monorepo, CI, lõi bộ chấm, duyệt bảng tính (`csv.ts`, `hash.ts`, `review*.ts`, scripts), cấu hình web app, khung app, thư viện chung của app (`db`, `backup`, `settings`, `sw`, `srs`, `cards`, `progress`, `results`, `stats`, `content`, `writing`), thành phần giao diện, các trang, test. Mỗi file chép ghi vào handoff: đường dẫn gốc, commit `e51323e`, đã sửa gì.
- **Không chép:** dữ liệu và nội dung tiếng Trung, `lang/zh`, pinyin-pro, opencc-js, hanzi-writer-data, phần cắt âm Hán Việt.
- **Viết mới:** `lang/ja`; dữ liệu và kiểm tra riêng của tiếng Nhật (furigana, Hán Việt, chia động từ, kiểm soát từ vựng); `Furigana` thay cho `Pinyin` trong `text.tsx`; trang kana, trang kanji; `speech.ts` (ja-JP), `search.ts` (kana, romaji, kanji, nghĩa, Hán Việt); `build/strokes.ts` cho animCJK (kèm ghép nét kana).

### 4.2 Bộ chấm tiếng Nhật (`packages/grader/src/lang/ja`)

Cùng luồng với `lang/zh`:

```
Câu trả lời
  1. Chuẩn hóa      NFKC (chữ toàn/nửa độ rộng, katakana nửa độ rộng), dấu câu 。、！？, bỏ khoảng trắng,
                    trường âm (ー, ｰ, −, ～ sau katakana → ー); chữ Latin → nhắc bật bộ gõ, không chấm
  2. Tách từ        khớp dài nhất trên từ vựng của khóa học + mọi dạng chia (sinh lúc build) + trợ từ,
                    số, trợ số từ (kèm biến âm); chấp nhận cả kanji lẫn kana (私 / わたし, 食べる / たべる);
                    đoạn không nhận ra = "lạ" → các luật xung quanh im lặng
  3. Phân tích      cụm số lượng (số + trợ số từ [+ の] + danh từ, hoặc danh từ + を/が + số + trợ số từ),
                    cụm nơi chốn (N の 上/中/下/前/後ろ/となり… に/で), vị ngữ tồn tại (あります/います)
  4. Chấm nội dung  theo loại câu hỏi; sai nội dung → tối đa 20 điểm
  5. Bắt lỗi        mỗi lỗi trừ điểm, nhận xét tiếng Việt, cách sửa, câu đã sửa
```

- **Từ vựng của bộ chấm** sinh từ dữ liệu khóa học (`npm run data:build`), có test giữ đồng bộ (như `words.json` của c-learn-write): mỗi từ có dạng viết (kanji, kana, okurigana), cách đọc, loại từ (JMdict), nhóm động từ, các thuộc tính cho luật (người/vật sống hay đồ vật, trợ số từ hợp lệ, loại nơi chốn). Dữ liệu cho luật (trợ số từ, danh từ ↔ trợ số từ, động từ hành động/tồn tại/di chuyển…) là JSON trong `lang/ja/data/` để giáo viên duyệt.
- **Bảng chia:** sinh mọi dạng (ます/ません/ました/ませんでした, て, た, ない, なかった, từ điển, ましょう, たい, khả năng, bị động, sai khiến, ば, たら, ý chí…) cho v1, v5*, する, 来る và các ngoại lệ (行く → 行って, ある → ない, いい → よかった). Mỗi dạng có nhãn, để kiểm soát "dạng chia đã học". Kiểm tra độc lập: kuromoji phải phân tích mọi dạng sinh ra về đúng từ gốc và đúng loại chia.
- **So khớp đáp án (`model`):** đưa cả câu trả lời và đáp án về **chuỗi cách đọc** (kana) để chấp nhận câu viết toàn kana, rồi căn chỉnh có trọng số (`core/align.ts`). Mỗi từ được coi là một đơn vị. Không bao giờ bỏ qua khác biệt ở phủ định (ない, ません), con số, こ/そ/あ/ど, trợ từ đổi nghĩa.
- **Câu hỏi:** giữ ba loại, đổi nghĩa cho tiếng Nhật: `count` (いくつ/何本/何人…: số + trợ số từ đúng), `location` (どこにありますか/いますか: nơi + vị trí + に, あります/います), `model` (đáp án mẫu, cú pháp `[a|b](x)`). `checkJaSentence(text)` chạy luật trên một câu, dùng cho bài sắp xếp câu và bộ câu đúng.
- **Hiệu năng:** đo ở giai đoạn 6; mục tiêu < 1 ms mỗi câu sau lần đầu, bộ chấm < 100 KB gzip.

### 4.3 App

| Mục | Nội dung |
|---|---|
| Học | Lộ trình **Kana → N5 → N4**; mỗi bài: từ mới, kanji, ngữ pháp, bài tập, kiểm tra cuối bài; bài sau mở khi bài trước đạt 80% (có "học vượt") |
| Kana | Bảng kana (hiragana, katakana, âm đục, âm ghép), nghe, romaji Hepburn (khi bấm), luyện viết từng chữ |
| Ôn tập | Thẻ đến hạn (FSRS); giới hạn từ mới mỗi ngày |
| Từ điển | Tra 1304 từ và 246 kanji theo kana, romaji, kanji, nghĩa, âm Hán Việt; thẻ từ, thẻ kanji (on/kun, Hán Việt, số nét, từ ví dụ, luyện viết) |
| Tiến độ | Chuỗi ngày học, số từ đã học/đã nhớ, kanji đã học, bài đã xong, điểm kiểm tra, điểm ngữ pháp nên ôn |
| Cài đặt | Furigana (tự động / luôn hiện / ẩn), Hán Việt trong câu, giọng đọc, số từ mới mỗi ngày, sao lưu/khôi phục, hướng dẫn cài **bộ gõ tiếng Nhật** và **giọng đọc**, chấm thử, giới thiệu và giấy phép |

- **Furigana:** thành phần `Furigana` dựng `<ruby>` theo từng đoạn (`{今日|きょう}は…`), luôn trong phần tử `lang="ja"`; quyết định hiện/ẩn theo kanji đã học (kanji được tính là "đã học" khi bài dạy nó đã xong).
- **Giọng đọc:** chọn giọng `ja-JP`, đọc theo cách đọc (kana) khi có, để tránh máy đọc sai kanji nhiều âm; ẩn nút nghe khi máy không có giọng.
- **Lưu trữ, offline, sao lưu, không thu thập dữ liệu:** như c-learn-write.

## 5. Mô hình dữ liệu (JSON)

Mỗi mục nội dung có `id` cố định và `review` (`draft` / `approved` / `changes_requested`, kèm `by`, `date`, `note`, `hash`) như c-learn-write.

| Loại | File | Trường chính |
|---|---|---|
| Từ (danh sách) | `data/jlpt/vocabulary.json` (sinh tự động) | no (1–1304, khóa trong `data/jlpt/ids.lock.json`), openjlptId, jmdictId, level, word (dạng hiển thị), reading, furigana theo chữ, pos, nhóm động từ, hanViet theo chữ (+ ambiguous) |
| Kanji (danh sách) | `data/jlpt/kanji.json` (sinh tự động) | char, level, on, kun, strokes, hanViet (chính + khác + ambiguous), jlptOld |
| Ngữ pháp (danh sách) | `data/jlpt/grammar.json` (sinh tự động) | id (OpenJLPT), level, pattern |
| Kana | `data/kana.json` (sinh từ dải mã Unicode trừ danh sách loại trừ, romaji bằng WanaKana, số nét từ KanjiVG) | char, script, row, romaji, strokes, kind (cơ bản, đục, bán đục, nhỏ); các âm ghép (きゃ…) và kana mở rộng cho từ mượn (ファ, ティ…) khai báo theo tổ hợp |
| Bài học | `data/curriculum.json` | id (`kana-01`, `n5-01`, `n4-01`), level, order, titleVi, topicVi, words (no), kanji, grammar (id), kana |
| Nội dung bài | `data/lessons/<cấp>/<NN>.json` | goalsVi, words (meaningsVi, noteVi, examples), kanji (meaningVi, noteVi), grammar (titleVi, summaryVi, explanationVi, patterns, examples, mistakes, forms), exercises |
| Câu | trong bài | `ja`, `ruby` (do `content:fill` điền, ví dụ `{学生|がくせい}です。`), `vi` |
| Tên riêng | `data/names.json` | ja, reading, vi (田中, ベトナム, ハノイ…) |
| Đọc đặc biệt | `data/jukujikun.json` | từ, cách đọc, ghi chú |
| Cấp | `data/levels.json` | `complete` thì test bắt phủ đủ |

**Kiểm tra tự động** (trong `npm run check`, thất bại khi có bất kỳ lỗi nào; `CONTENT_FILTER=<bài>` để chạy riêng):

- `id` không trùng; mọi tham chiếu tồn tại; file đúng định dạng chuẩn do `content:fill` sinh ra.
- **Phủ đủ:** với cấp `complete`, mỗi từ, kanji cần học và điểm ngữ pháp nằm ở đúng một bài; chặng kana phủ đủ bộ kana dạy trong `kana.json`. Bộ này loại các chữ cổ hoặc hiếm có trong 177 kana của animCJK (ゐ ゑ ヰ ヱ ヷ ヸ ヹ ヺ ゕ ゖ ヵ ヶ ゎ ヮ); danh sách loại trừ để giáo viên duyệt. Luyện viết vẫn có đủ 177 chữ.
- **Kiểm soát từ vựng:** mỗi câu chỉ dùng từ đã học (tới bài đó), tên riêng đã khai báo, và **dạng chia đã học** (ví dụ chưa học て形 thì không dùng 食べて). Kanji chưa học vẫn được viết (có furigana) nếu từ đó đã học.
- **Furigana và cách đọc:** mọi kanji trong câu có furigana; furigana của từng chữ hợp lệ theo KANJIDIC2 (cho phép biến âm, âm ngắt) hoặc nằm trong `jukujikun.json`; cách đọc của từ khớp JMdict; romaji (chặng kana) khớp kana.
- **Âm Hán Việt:** mỗi âm nằm trong tập âm của chữ; chữ nhiều âm chưa chọn thì có cờ `hanVietAmbiguous`.
- **Đáp án bài tập nhất quán:** đáp án nằm trong lựa chọn; thẻ ghép được thành đáp án; câu mẫu của bài dịch được 100 điểm; mỗi ví dụ của bài dịch và bài trả lời câu hỏi cho đúng điểm mong đợi.
- **Bộ câu đúng:** chạy mọi luật của bộ chấm trên mọi câu đúng của khóa học (ví dụ, `mistakes.right`, đáp án). Không câu nào bị báo lỗi.
- **`lang="ja"`:** test giao diện quét mọi trang.

## 6. Bài tập và cách chấm

| Dạng | Ví dụ | Cách chấm (tất định) |
|---|---|---|
| Trắc nghiệm | 「学生」 nghĩa là gì? Chọn は hay が? Chọn kana đúng cho "ka" | So đáp án |
| Ghép cặp | kana ↔ romaji, từ ↔ nghĩa, kanji ↔ Hán Việt | So cặp |
| Nghe và chọn | Nghe một từ (giọng thiết bị), chọn kana/từ | So đáp án; ẩn khi máy không có giọng |
| Sắp xếp câu | Thẻ 私 / は / りんご / を / 食べます; thẻ kana ghép thành từ | So các thứ tự được chấp nhận; sai thì chạy luật để giải thích (động từ không đứng cuối, 本の私…) |
| Điền chỗ trống | 学校＿行きます。(へ / に) | Danh sách đáp án (kanji hoặc kana), so sau chuẩn hóa |
| Dịch Việt → Nhật | "Tôi là sinh viên." | Bộ chấm loại `model` |
| Trả lời câu hỏi | 鉛筆は何本ありますか。 / 猫はどこにいますか。 | Bộ chấm `count`, `location`, `model` |
| Luyện viết | Viết あ, 学 theo thứ tự nét | hanzi-writer (so nét với đường trục) |

**Luật dự kiến của bộ chấm** (mỗi luật chỉ được thêm khi đạt đủ ba điều kiện của c-learn-write: có danh sách câu phải bắt và câu không được bắt; không báo lỗi câu nào trong bộ câu đúng; có nhận xét tiếng Việt và cách sửa, ghi vào `docs/design.md`):

| Mã (dự kiến) | Lỗi | Ví dụ sai → đúng | Ghi chú độ chính xác |
|---|---|---|---|
| `wrong_counter` | Sai trợ số từ | 鉛筆を三枚 → 三本 | Chỉ với danh từ có trong bảng danh từ ↔ trợ số từ |
| `missing_counter` | Thiếu trợ số từ | 三りんご → りんごを三つ | |
| `counter_reading` | Sai biến âm (khi viết kana) | さんほん → さんぼん, いちほん → いっぽん, よんつ → よっつ | Bảng biến âm của các trợ số từ N5–N4 |
| `aru_iru` | あります / います | 猫があります → います | Im lặng với danh từ chưa rõ, xe cộ |
| `ni_de` | に / で | 図書館に勉強します → で; 部屋でいます → に | Chỉ với động từ trong danh sách hành động/tồn tại; ある của sự kiện (パーティーが学校であります) đúng |
| `position_order` | Vị trí đặt trước danh từ (kiểu "trên bàn") | 上の机に → 机の上に | |
| `verb_not_final` | Động từ trước tân ngữ (kiểu S-V-O) | 私は食べますりんご → 私はりんごを食べます | Chỉ khi so với đáp án |
| `no_order` | Định ngữ sau danh từ | 本の私 → 私の本 | Chỉ khi so với đáp án (câu trông đúng ngữ pháp) |
| `adjective_form` | Chia tính từ sai | きれいくない → きれいじゃない; 高いでした → 高かったです; 有名の人 → 有名な人 | Theo loại tính từ của JMdict |
| `te_form` | Thể て sai | 行きて → 行って, 書きて → 書いて | Chỉ với động từ của khóa học |
| `particle_kana` | Trợ từ viết theo cách đọc | わたしわ → わたしは; みずお → みずを; がっこうえ → がっこうへ | Chỉ ở vị trí trợ từ khi so với đáp án |
| `long_vowel`, `sokuon` | Thiếu trường âm, âm ngắt | おかさん → おかあさん; せんせ → せんせい; きて → きって | **Im lặng nếu kết quả là một từ có thật** (ビル/ビール, おばさん/おばあさん): danh sách cặp sinh từ JMdict lúc build |
| `homophone_kanji` | Chọn nhầm chữ đồng âm khi gõ | 箸 → 橋, 合う → 会う, 熱い → 暑い | Trừ nhẹ; nhận xét nêu rõ nghĩa của cả hai chữ |
| `wh_wa` | Từ để hỏi làm chủ ngữ đi với は | 誰は来ましたか → 誰が | |
| `missing_word` / `extra_word` | Thiếu/thừa từ (loại `model`) | | Như c-learn-write |
| `politeness_mix` | Trộn です/ます và thể thường trong một câu | | Chỉ nhắc nhẹ (trừ 0) |

Mức trừ cụ thể chốt khi viết luật (mặc định như c-learn-write: lỗi ngữ pháp 20, lỗi nhỏ 5–10). Điểm ngữ pháp nào không có luật đủ chính xác thì chỉ dạy bằng bài tập đóng; cuối giai đoạn 6 và 9 có bảng báo cáo điểm ngữ pháp nào có luật riêng.

## 7. Lộ trình học

| Chặng | Nội dung | Số bài dự kiến |
|---|---|---|
| Kana | Hiragana (5 bài: hàng あ–そ, た–ほ, ま–ん, âm đục/bán đục, âm ghép + っ + trường âm), katakana (4 bài, kể cả kana mở rộng cho từ mượn: ファ, ティ, ウィ…), bài kiểm tra kana | khoảng 10 |
| N5 | 674 từ, 80 kanji cần học (79 + 分), 81 điểm ngữ pháp | khoảng 28 (~24 từ, ~3 kanji, ~3 điểm ngữ pháp mỗi bài) |
| N4 | 630 từ, 166 kanji, 98 điểm ngữ pháp | khoảng 26 |

- Bài theo chủ đề đời sống (chào hỏi, giới thiệu, gia đình, số đếm và giờ, mua sắm, ăn uống, đi lại, nơi chốn, thời tiết, sức khỏe, công việc…), sắp xếp sao cho ngữ pháp đi từ dễ tới khó: です → ます形 → て形 → ない形 / た形 → thể thường → các mẫu N4.
- Mỗi bài: 15–25 bài tập, mỗi điểm ngữ pháp ít nhất 3 bài tập; một bài kiểm tra cuối bài.
- Mỗi cấp có bài kiểm tra tổng hợp (nghe, đọc, sắp xếp câu, viết ngắn), câu hỏi tự soạn, không sao chép đề thật.
- Từ của bài đã học tự vào hàng ôn FSRS; kanji đã học có thẻ riêng.

## 8. Các giai đoạn

Mỗi giai đoạn kết thúc bằng: `npm run check` qua; commit theo từng bước, push; cập nhật `docs/handoff.md`; báo cáo đã làm gì, đã kiểm chứng gì (lệnh/test), chưa kiểm chứng gì.

### Giai đoạn 0: Tiếp nhận (xong 2026-11-15)

Đọc tài liệu c-learn-write (commit `e51323e`); Node 22.23.4, npm 10.9.9; repo mới trống; `npm run check` của c-learn-write: 45 file test, 405 test qua.

### Giai đoạn 1: Khảo sát và quyết định (xong khi kế hoạch được duyệt)

- [x] Khảo sát nguồn và giấy phép (mục 3).
- [x] Chốt 8 quyết định (mục 2).
- [ ] Chủ dự án duyệt `docs/plan.md`.

### Giai đoạn 2: Nền tảng

**Phạm vi:** chép khung monorepo, CI, giấy phép; lõi bộ chấm (`LangCode = 'ja'`, test lõi chép theo); khung `lang/ja` tối thiểu (chuẩn hóa, kana); khung `packages/course` (kiểu dữ liệu, CSV duyệt); khung app (điều hướng, chuỗi tiếng Việt, PWA, IndexedDB, sao lưu, trang Giới thiệu, trang Chấm thử); test happy-dom, fake-indexeddb, Playwright.

**Tiêu chí hoàn thành**

- [ ] `npm ci && npm run check` qua ở thư mục gốc; test lõi bộ chấm chép từ c-learn-write vẫn qua.
- [ ] CI xanh trên GitHub (Node 22, 24; e2e Chromium). Nếu không push được file workflow thì báo chủ dự án.
- [ ] `npm run dev` chạy; ảnh chụp khung 375×812 đã xem; e2e xác nhận app mở được khi mất mạng sau lần tải đầu.
- [ ] Repo build và test được mà không cần thư mục c-learn-write.
- [ ] Handoff ghi nguồn gốc mọi file chép (đường dẫn, commit `e51323e`).
- [ ] Đo kích thước bundle ban đầu.

### Giai đoạn 3: Dữ liệu

**Phạm vi:** `sources:fetch` (OpenJLPT N5–N4, phần cắt KANJIDIC2 và JMdict cho các từ/kanji cần dùng, JmdictFurigana, ph0ngp, OpenCC JP, animCJK, số nét KanjiVG; mỗi nguồn khóa commit/ngày, SHA-256, LICENSE, SOURCE.md); `data:build` (vocabulary, kanji, grammar, kana; khóa số thứ tự); chọn âm Hán Việt; `content:fill` (furigana, định dạng chuẩn), `content:brief`, `content:readings`; `review:export/import` với cột tiếng Nhật; `curriculum.json` cho cả N5, N4 và kana; các kiểm tra ở mục 5.

**Tiêu chí hoàn thành**

- [ ] 1304/1304 từ, 246/246 kanji, 179/179 điểm ngữ pháp và toàn bộ bộ kana dạy có mặt và được xếp vào bài trong `curriculum.json`.
- [ ] Chạy lại `sources:fetch` và `data:build` cho ra file y hệt; khi nguồn đổi, script báo khác biệt.
- [ ] 246 kanji có âm Hán Việt chính hoặc cờ `hanVietAmbiguous`; danh sách chữ cần giáo viên chọn nằm trong `review-notes.md`.
- [ ] Vòng xuất CSV → sửa → nhập lại có test; file CSV mở được bằng Excel/Google Sheets (chủ dự án thử).
- [ ] `THIRD_PARTY_NOTICES.md` và `SOURCE.md` ghi đủ nguồn, giấy phép, phiên bản.

### Giai đoạn 4: Kana

**Phạm vi:** các bài kana (nội dung nháp), trang bảng kana, bài tập kana (nhận mặt chữ, nghe, ghép romaji, thẻ kana ghép từ), luyện viết 177 kana (animCJK, ghép nét), romaji Hepburn khi bấm.

**Tiêu chí hoàn thành**

- [ ] Cấp `kana` là `complete`: mọi kana được dạy; bài kana làm được từ đầu đến cuối (e2e cho ít nhất một bài).
- [ ] Số nét của 177 kana sau khi ghép khớp KanjiVG (test); hoạt hình và chế độ viết chạy cho あ, ぬ, の, す (test + ảnh chụp đã xem).
- [ ] File nét đã sửa có ghi chú thay đổi theo APL; `ARPHICPL.TXT` được đóng gói.

### Giai đoạn 5: Từ vựng và kanji (N5)

**Phạm vi:** nội dung từ và kanji của các bài N5 (nghĩa, ví dụ có furigana, ghi chú); thẻ từ, thẻ kanji (on/kun, Hán Việt, số nét, luyện viết); FSRS; từ điển (tra kana, romaji, kanji, nghĩa, Hán Việt); giọng đọc `ja-JP`; furigana tự động theo kanji đã học; trang hướng dẫn cài bộ gõ và giọng đọc.

**Tiêu chí hoàn thành**

- [ ] 674 từ N5 có nghĩa, cách đọc, âm Hán Việt (nếu có kanji), ít nhất một câu ví dụ có furigana và bản dịch.
- [ ] 80 kanji N5 có thẻ và bài luyện viết.
- [ ] Học và ôn từ trên khung điện thoại, kể cả khi mất mạng (e2e); tiến độ còn sau khi tải lại; sao lưu → khôi phục ra đúng trạng thái (test).
- [ ] FSRS test với đồng hồ cố định; máy không có giọng `ja-JP` thì nút nghe tự ẩn (test giả lập).

### Giai đoạn 6: Ngữ pháp, bài tập, bộ chấm `lang/ja` (N5)

**Phạm vi:** gói `lang/ja` đầy đủ (từ vựng sinh từ khóa học, bảng chia, tách từ, phân tích, luật, ba loại câu hỏi, `checkJaSentence`); trang ngữ pháp; 6 dạng bài tập + bài tập từ vựng tự sinh; nội dung ngữ pháp và bài tập của mọi bài N5.

**Tiêu chí hoàn thành**

- [ ] Cấp `n5` là `complete`: 674 từ, 80 kanji, 81 điểm ngữ pháp được dạy; mỗi điểm có trang giải thích và ít nhất 3 bài tập.
- [ ] Mỗi luật có test "phải bắt" và "không được bắt"; bộ câu đúng không bị báo nhầm câu nào.
- [ ] Đã tự chạy bộ chấm với nhiều câu trả lời thực tế (câu đúng, câu viết toàn kana, lỗi người Việt hay mắc); mọi chỗ chấm sai tìm được thành test.
- [ ] Bảng chia được kuromoji xác nhận cho mọi động từ/tính từ N5.
- [ ] Bảng báo cáo: điểm ngữ pháp nào có luật riêng, điểm nào chỉ có bài tập đóng.
- [ ] Đo tốc độ và kích thước bộ chấm.

### Giai đoạn 7: Kiểm tra và tiến độ

**Phạm vi:** kiểm tra cuối bài (≥ 80% mở bài sau), kiểm tra cấp kana và N5, trang tiến độ.

**Tiêu chí hoàn thành**

- [ ] Làm được bài kiểm tra cấp N5 và xem báo cáo; con số trên trang tiến độ khớp dữ liệu đã lưu (test).

### Giai đoạn 8: Hoàn thiện kana + N5 (chưa phát hành)

**Phạm vi:** khả năng truy cập (axe-core sáng/tối), bố cục điện thoại (giả lập Pixel 7, iPhone 13), offline, `licenses.txt`, trang Giới thiệu (ghi công EDRDG, OpenJLPT, Waller, animCJK…), Lighthouse trên bản build ở máy.

**Tiêu chí hoàn thành**

- [ ] `npm run e2e` xanh (offline, bố cục điện thoại, axe-core sáng và tối, giấy phép).
- [ ] Có số đo Lighthouse (bản build ở máy).
- [ ] Chủ dự án thử bản build chạy trên máy (mục 11).

### Giai đoạn 9: N4

**Phạm vi:** nội dung 630 từ, 166 kanji (kèm luyện viết), 98 điểm ngữ pháp; luật bộ chấm cho N4 (thể khả năng, bị động, sai khiến, điều kiện, cho/nhận…); kiểm tra cấp N4.

**Tiêu chí hoàn thành**

- [ ] Các tiêu chí của giai đoạn 5–7 áp dụng cho N4; cấp `n4` là `complete`.

### Giai đoạn 10: Phát hành kana + N5 + N4

**Phạm vi:** chạy lại `sources:fetch` (cập nhật EDRDG, báo khác biệt); README, tài liệu đầy đủ; workflow `deploy.yml`; **hỏi chủ dự án trước khi triển khai**; đo Lighthouse trên địa chỉ thật.

**Tiêu chí hoàn thành**

- [ ] `npm run check`, `npm run e2e`, CI xanh.
- [ ] Chủ dự án bật Pages và đồng ý; app chạy trên GitHub Pages; Lighthouse trên địa chỉ thật.
- [ ] Đủ tài liệu: README, plan, handoff, design, content-guide, review-notes, THIRD_PARTY_NOTICES.
- [ ] Báo cáo cuối: cái gì đã kiểm chứng, cái gì chưa.

### Làm song song: duyệt nội dung

Từ giai đoạn 3, mỗi đợt nội dung mới được xuất ra bảng tính cho giáo viên; kết quả duyệt nhập lại JSON; nhãn "Chưa duyệt" chỉ gỡ khi giáo viên duyệt mục đó.

## 9. Cách làm việc

- **Git:** nhánh `claude/happy-planck-bv1nhy`, không commit vào `main`; push sau mỗi bước; hỏi trước khi mở pull request, merge hoặc triển khai.
- **Commit:** nhỏ, conventional commits, tiếng Anh. Chạy `npm run check` và chỉ commit khi lệnh thoát thành công (không nối qua `grep`). Trước mỗi commit có chữ Nhật, chạy lệnh kiểm tra ký tự vô hình (handoff mục 6).
- **Không gõ tay bảng chuẩn dài** (bảng kana, danh sách Jōyō): sinh từ dữ liệu hoặc dải mã Unicode.
- **Soạn song song bằng agent:** mỗi agent chỉ ghi file bài của mình và chạy `CONTENT_FILTER=<bài>`; tôi kiểm tra lại, nhất là cách đọc và Hán Việt; commit bằng `CONTENT_FILTER=<các bài sẽ commit> npm run check && git commit …`. Không tin kết quả của agent khi chưa tự mở nguồn.
- **c-learn-write chỉ đọc**; repo này tự build và qua CI mà không cần nó.
- **Báo cáo** ngắn gọn (chủ dự án theo dõi trên điện thoại); file muốn chủ dự án xem để trong repo.

## 10. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Danh sách N5–N4 không chính thức; OpenJLPT còn mới (0.3.0) | Ghi rõ trong app; khóa commit, script báo khác biệt khi cập nhật; giáo viên xem; giấy phép Waller mới chỉ kiểm chứng thứ cấp (mục 11) |
| Cách đọc, furigana sai (kanji nhiều âm) | Cách đọc lấy từ JMdict/JmdictFurigana, không từ bộ phân tích; test theo KANJIDIC2; script rà chỗ khác kuromoji; người soạn chọn ở chữ nhiều âm |
| Âm Hán Việt sai (KANJIDIC2 có lỗi) | Đối chiếu hai nguồn; dấu * cho chữ chưa chắc; giáo viên chọn |
| Bộ chấm báo nhầm (từ lạ, dạng chia, đọc nhầm từ dài thành từ ngắn) | Khớp dài nhất trên từ vựng khóa học; gặp từ lạ thì im lặng; bộ câu đúng; mỗi lỗi báo nhầm thành test |
| Người học không có bộ gõ tiếng Nhật (quyết định 5) | Trang hướng dẫn cài; bài sắp xếp và trắc nghiệm không cần gõ; câu toàn kana được chấp nhận; câu chữ Latin được nhắc bật bộ gõ |
| Vi phạm nghĩa vụ cập nhật của EDRDG | Quy trình `sources:fetch` trước mỗi lần phát hành và định kỳ khi đã phát hành; ghi ngày dữ liệu trên trang Giới thiệu |
| Ghép nét kana sai | Test số nét với KanjiVG cho cả 177 kana; xem ảnh chụp các chữ khó |
| Phông Trung thay phông Nhật | `lang="ja"` mọi nơi (test quét); không dùng `system-ui`; chủ dự án thử trên Android và iPhone |
| Chỉ phát hành ở cuối (quyết định 8): chậm có góp ý | Chủ dự án và giáo viên thử bản build chạy trên máy ở giai đoạn 8 |
| Khối lượng nội dung lớn (khoảng 64 bài) | Soạn song song bằng agent với kiểm tra lọc theo bài; công cụ `content:brief`, `content:fill` |
| Thư viện cũ (kuromoji 2018) hoặc mới (Vite 8.3.8) có lỗi | kuromoji chỉ dùng lúc soạn, có phương án thay (lindera-wasm); khóa phiên bản, có phương án lùi |
| Chỉ thử được Chromium trong môi trường này | Giả lập điện thoại bằng Chromium; chủ dự án thử Safari/iPhone thật |

## 11. Việc cần chủ dự án làm

- **Duyệt kế hoạch này** (gồm các đề xuất kỹ thuật ở cuối mục 2 và đề xuất thêm 分 vào kanji cần học, mục 3.2).
- Tìm **giáo viên tiếng Nhật** duyệt nội dung (bắt đầu với chặng kana và các bài N5 đầu), nhất là cách đọc, âm Hán Việt nhiều âm và các câu "sai" trong mục lỗi hay gặp.
- Nếu muốn chắc chắn về giấy phép danh sách Waller: tự mở <http://www.tanos.co.uk/jlpt/> trên máy (môi trường này không vào được trang chỉ có `http://`).
- Ở giai đoạn 8: thử bản build chạy trên máy (`npm ci && npm run build && npm run preview -- --host`, mở từ điện thoại cùng mạng Wi-Fi), trên Android và iPhone: furigana, phông chữ, giọng đọc, bộ gõ, offline.
- Ở giai đoạn 10: bật GitHub Pages (Settings → Pages → Source: GitHub Actions) và đồng ý triển khai.

[jlpt-faq]: https://www.jlpt.jp/e/faq/
[jlpt-cefr]: https://www.jlpt.jp/e/about/cefr_reference.html
[jft]: https://www.jpf.go.jp/jft-basic/about/index.html
[tt19]: https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2021/7/34061/36370-1-2021691-69219-2021-tt-bgddt.pdf
[sansyo]: https://www.bunka.go.jp/seisaku/bunkashingikai/kokugo/hokoku/pdf/93736901_01.pdf
[jfs]: https://www.jfstandard.jpf.go.jp/cando/copyright/ja/render.do
[marugoto]: https://www.marugoto.jpf.go.jp/copyright/
[irodori]: https://www.irodori.jpf.go.jp/privacy.html
