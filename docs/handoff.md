# Bàn giao dự án j-learn-write

> **Đọc file này trước tiên.** Phiên Claude mới không có bộ nhớ của các phiên trước: mọi điều cần biết để làm tiếp nằm trong file này và [plan.md](plan.md) (khi đã có).

## 1. Tóm tắt

- **Mục tiêu:** web app (PWA, chạy hoàn toàn trên máy) dạy tiếng Nhật cho người Việt từ con số 0 tới trình độ sơ cấp (dự kiến tương đương JLPT N5–N4), dựa trên dự án tiếng Trung **c-learn-write** của cùng chủ dự án.
- **Ràng buộc gốc:** không dùng LLM/AI khi app chạy; chấm điểm bằng luật, tất định; chính xác trước, đầy đủ sau (`needsReview` khi không chắc); giao diện và nhận xét tiếng Việt, mọi đoạn tiếng Nhật trong HTML có `lang="ja"`; nội dung là JSON do Claude soạn nháp, giáo viên duyệt qua bảng tính, app hiện nhãn "Chưa duyệt".
- **Trạng thái (2026-11-16):** chặng kana, N5 và N4 có đủ nội dung (nháp, chờ giáo viên duyệt: [review-notes.md](review-notes.md)); bộ chấm và app chạy đủ tính năng, `npm run check` và e2e xanh, CI xanh. **Chưa triển khai** (phải hỏi chủ dự án trước). Chi tiết: mục 1b.

## 1b. Tiến độ

| Giai đoạn | Trạng thái |
|---|---|
| 0. Tiếp nhận | Xong (2026-11-15), xem mục 3 |
| 1. Khảo sát và quyết định | Xong. 8 quyết định (mục 1c); **[plan.md](plan.md) được duyệt 2026-11-15** (kể cả các đề xuất kỹ thuật và thêm 分). Chủ dự án yêu cầu triển khai liên tục toàn bộ kế hoạch, chỉ hỏi khi cần thiết |
| 2. Nền tảng | **Xong** (2026-11-15). `npm run check` 23 file/91 test; `npm run e2e` 6 test (Pixel 7, iPhone 13, offline, giấy phép, axe sáng/tối); **CI GitHub Actions xanh** ở commit `281bee7` (lần chạy đầu). Bundle ban đầu (gzip): index 8,2 KB + jsxRuntime 9,2 KB + trang chủ 9,6 KB (trang chủ gồm ts-fsrs); precache 16 file, 118 KB. Nguồn gốc file chép: mục 5 |
| 3. Dữ liệu | **Xong** (2026-11-15). Nguồn (`sources:fetch`, chạy lại y hệt, có báo thay đổi); danh sách (`data:build`: 1311 từ gồm 7 từ bổ sung `vocabulary-extra.json`, 246 kanji, 189 điểm ngữ pháp gồm 10 điểm `x-…` của `grammar-extra.json`, 241 kana); sửa lỗi nguồn trong `vocabulary-fixes.json` (しかる: OpenJLPT nối nhầm sang 然る, đúng là 叱る); âm Hán Việt; bảng chia; số/trợ số từ; từ vựng nội bộ + bộ tách từ của `lang/ja`; furigana (`src/furigana.ts`, `content:fill`); bộ kiểm tra nội dung (`src/validate.ts`, `tests/content.test.ts`, `CONTENT_FILTER`); `content:brief`; `review:export/import`; `docs/content-guide.md`. **`curriculum.json` đủ 64 bài**: 10 kana, 28 N5, 26 N4; mỗi từ/kanji/điểm ngữ pháp N5, N4 nằm đúng một bài (test kiểm tra cả khi cấp chưa xong). Hai agent xếp từ/kanji vào bài theo trình tự ngữ pháp ở mục 5c; tôi kiểm lại bằng script và `validateCourse` |
| 4. Kana | **Xong** (2026-11-15). 10 bài kana (`data/lessons/kana/01…10.json`, `levels.kana = complete`): mỗi bài có mục tiêu, 11–17 từ luyện đọc chỉ dùng kana đã học, 15–18 bài tập. Trang bài học/luyện tập/kiểm tra (`/lesson/:id`, `/practice/:id`, `/quiz/:id`) và bộ máy bài tập chép từ c-learn-write (mục 5); câu hỏi nhanh tự sinh (đọc kana, chọn kana theo cách đọc, nghe; nghĩa/romaji/nghe của từ luyện đọc); dữ liệu nét; bảng kana; luyện viết. Từ luyện đọc có dòng trong bảng duyệt; trang bài hiện "Chưa duyệt" tới khi mọi mục được duyệt. Kiểm tra: `npm run check` 38 file/187 test; `npm run e2e` 9 test (làm trọn bài kana-01: luyện tập → kiểm tra 100/100 → trang chủ "Đã xong"; axe trên trang bài học); CI xanh |
| 5. N5: từ, kanji | **Xong** (2026-11-16, `levels.n5 = complete`). 28 bài N5 (`data/lessons/n5/01…28.json`): 688 từ (nghĩa, ghi chú, ví dụ), 80 kanji, 90 điểm ngữ pháp (giải thích, mẫu câu, ví dụ, lỗi hay gặp), 595 bài tập đóng và 155 bài tự luận (dịch, câu hỏi `model`/`count`/`location`, mỗi bài 3–5 câu trả lời mẫu có điểm, là test hồi quy của bộ chấm); bài mẫu n5-01 tôi viết, phần còn lại do agent soạn song song, tôi kiểm lại bằng bộ kiểm tra và đọc mẫu. Trang từ (`/word/:no`), kanji (`/kanji/:char`), ngữ pháp (`/grammar/:id`), ôn tập FSRS (thẻ từ và kanji), từ điển (`/dict`), furigana "tự động", Hán Việt dưới câu ví dụ (cài đặt), kiểm tra cấp độ (`/test/:level`), trang tiến độ, trang thử bộ chấm (`/grader`). Điểm cần giáo viên xem: [review-notes.md](review-notes.md) |
| 6. Ngữ pháp, bài tập, bộ chấm | **Xong** (2026-11-16). Bộ chấm `lang/ja` mô tả đầy đủ trong [design.md](design.md): so với đáp án theo từng từ và theo cách viết (kana, nửa kana), gộp vị ngữ tương đương (くないです = くありません, てる = ている), câu hỏi `count`/`location`, 14 luật có test "phải bắt/không được bắt", và không báo nhầm câu đúng nào của khóa học (test chạy trên mọi câu). Sửa theo ~60 trường hợp các agent soạn bài tự luận báo (2026-11-16): câu sai từng được chấp nhận (đổi から/まで/より, thêm か, に→へ chỉ mục đích, ます trong mệnh đề…) và câu đúng từng bị 0 (kana, số kana, tên viết kana, 8,600…). Đo: 0,71 ms/câu; lần chấm đầu ~550 ms (app dựng sẵn khi rảnh) |
| 7. Kiểm tra, tiến độ | **Xong** (2026-11-16). Kiểm tra cấp độ, trang tiến độ, câu hỏi nhanh về từ vựng, kết quả từng bài; test e2e cho luồng bài kana, ôn tập/từ điển, các màn hình (axe) |
| 8. Hoàn thiện | **Phần lớn xong** (2026-11-16). e2e 12 test (thêm: chấm bài tự luận trên bản build, dòng Hán Việt); bộ chấm chạy trong Web Worker; gói khởi động ~20 KB gzip (bộ chấm chỉ nạp khi cần, `sideEffects: false`); robots.txt. Lighthouse cục bộ (giả lập điện thoại chậm, hiệu năng/khả năng tiếp cận/thực hành tốt/SEO): trang chủ 99/100/100/100; trang bài n5-01 83–84/100/100/100; luyện tập n4-01 83–89/100/100/100 (dao động giữa các lần chạy; thời gian bị chặn 50–90 ms). **Còn:** LCP trang bài ~4–5 s trên mạng chậm giả lập (tải danh sách từ 64 KB gzip trước khi vẽ), Lighthouse trên URL thật khi triển khai |
| 9. N4 | **Xong** (2026-11-16, `levels.n4 = complete`). 26 bài (`data/lessons/n4/01…26.json`): 632 từ (629 của danh sách + 3 từ bổ sung: 時 とき, しまう, おる), 166 kanji, 99 điểm ngữ pháp (98 + `x-counters-n4`), 492 bài tập đóng, 117 bài tự luận có câu trả lời mẫu chấm điểm. Bộ tách từ đọc các dạng N4 (khả năng, bị động, sai khiến, sai khiến-bị động, ちゃう, てる, たがる, やすい/にくい, がる, ば, たら, mệnh lệnh, なさい, kính ngữ…). Bài n4-01 tôi viết, n4-02…26 do agent soạn song song, tôi kiểm lại và sửa bộ chấm theo các báo cáo |
| 10. Phát hành | **Chưa làm.** Tải lại nguồn EDRDG trước khi phát hành, đủ tài liệu, **hỏi chủ dự án trước khi triển khai**, Lighthouse trên URL thật, báo cáo cuối |

## 1c. Quyết định đã chốt

Đợt 1 (2026-11-15), chủ dự án chọn phương án khuyên dùng ở cả 4 câu:

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | Phạm vi | Chặng kana + **N5 + N4** theo danh sách cộng đồng của J. Waller qua OpenJLPT (CC BY-SA 4.0): ~1304 từ, 245 kanji cần học, ~179 điểm ngữ pháp (rà lại) |
| 2 | Kiến trúc | **Giữ kiến trúc c-learn-write** (PWA offline, Preact 10.29.8 + Vite 8, monorepo grader/course/web, FSRS, giọng đọc thiết bị); **sao chép mã** rồi sửa, ghi nguồn gốc + commit |
| 3 | Soạn và duyệt | Claude soạn nháp; giáo viên duyệt qua bảng tính CSV; nhãn "Chưa duyệt"; âm Hán Việt nhiều âm có dấu * |
| 4 | Giấy phép | Code **MIT**, nội dung **CC BY-SA 4.0**; dùng dữ liệu EDRDG/OpenJLPT trong app, ghi công ở trang Giới thiệu, tải lại dữ liệu EDRDG và báo khác biệt trước mỗi lần phát hành |

Đợt 2 (2026-11-15):

| # | Vấn đề | Quyết định |
|---|---|---|
| 5 | Nhập câu trả lời | **Chỉ bộ gõ của máy** (có trang hướng dẫn cài) + thẻ chữ cho bài sắp xếp. Không chọn bộ chuyển romaji → kana trong ô nhập. Bộ chấm vẫn phải chấp nhận câu viết toàn kana |
| 6 | Hiển thị | **Kanji + furigana tự động**: từ viết dạng thường gặp; furigana trên kanji chưa học (nút "luôn hiện"); romaji chỉ ở chặng kana hoặc khi bấm; Hán Việt trên thẻ từ/kanji, trong câu bật/tắt |
| 7 | Luyện viết | **animCJK + hanzi-writer** cho 177 kana + 245 kanji; ghép đoạn nét kana khi build, test đối chiếu số nét với KanjiVG |
| 8 | Phát hành | **Chỉ phát hành khi xong N5 + N4** (vẫn hỏi trước khi triển khai) |

## 2. Làm việc với chủ dự án

- Trả lời bằng **tiếng Việt**. Code, tên biến, commit message bằng **tiếng Anh**. Tài liệu dự án (README, `docs/`) bằng **tiếng Việt**.
- Quyết định: hỏi bằng câu hỏi trắc nghiệm (AskUserQuestion), phương án tốt nhất đứng đầu ghi "(Khuyên dùng)", mỗi phương án ghi **ĐƯỢC / MẤT**, tối đa 4 câu mỗi lần.
- Báo cáo trung thực: đã làm gì, đã kiểm chứng gì (kèm lệnh/test), chưa kiểm chứng gì. Chủ dự án hay theo dõi trên điện thoại: báo ngắn gọn.
- Git: làm trên nhánh `claude/happy-planck-bv1nhy` (nhánh mặc định của repo là `main`, công khai). Chạy `npm run check` trước mỗi commit (khi đã có code), commit nhỏ kiểu conventional commits, push sau mỗi bước. **Hỏi trước** khi mở pull request, merge hoặc triển khai.
- **c-learn-write chỉ để đọc:** không sửa, không commit, không push, không mở PR, không bình luận trên repo đó. Repo này phải tự build và qua CI mà không cần c-learn-write.

## 3. Giai đoạn 0: tiếp nhận (2026-11-15)

- **Repo mới:** lúc bắt đầu chỉ có `.git`, chưa có commit nào.
- **Môi trường:** Node.js 22.23.4, npm 10.9.9 (Linux, cloud session). Chromium cho Playwright có sẵn. Mạng: lúc đầu bị giới hạn (jlpt.jp, edrdg.org… bị chặn); chủ dự án đã chuyển sang "Full". Các trang chỉ có `http://` (ví dụ tanos.co.uk) vẫn không vào được.
- **Mã tham chiếu c-learn-write:**
  - repo `ntson9p/c-learn-write` (công khai), pull request #1 đã merge lúc 2026-11-15 09:44 UTC, nên dùng nhánh `master`;
  - bản clone chỉ đọc ở `/home/user/ntson9p/c-learn-write` (ngoài repo này), **commit `e51323e25905859d37c95093c0c042e73f28abb6`** (merge PR #1, 2026-11-15 18:44 +0900);
  - đã đọc: README, docs/handoff.md (mục 1b, 2, 7), docs/plan.md, docs/design.md, docs/content-guide.md, docs/review-notes.md, packages/grader/README.md (cách viết câu hỏi), THIRD_PARTY_NOTICES.md;
  - `npm ci && npm run check` trong bản clone: **45 file test, 405 test qua** (thoát mã 0); `git status` của bản clone sạch sau khi chạy.
- **Nguồn gốc mã sẽ sao chép** (MIT, chủ dự án là tác giả): mọi file chép từ c-learn-write ghi đường dẫn gốc và commit `e51323e` ở mục 5 (sẽ điền khi chép ở giai đoạn nền tảng).

## 4. Khảo sát đã tự kiểm chứng (giai đoạn 1, đang làm)

"Claude" = tự mở và đọc nguồn trong phiên 2026-11-15. File tải về nằm trong scratchpad của phiên (không lưu vào repo).

- **JLPT không có danh sách chính thức** — FAQ <https://www.jlpt.jp/e/faq/>: "publishing 'Test Content Specifications' containing a list of vocabulary, kanji and grammar items was not necessarily appropriate". (Claude)
- **JLPT ↔ CEFR** — <https://www.jlpt.jp/e/about/cefr_reference.html>: N5 đậu với tổng điểm ≥ 80 ghi A1; N4 ≥ 90 ghi A2 (áp dụng từ kỳ 12/2025). (Claude)
- **Giấy phép EDRDG** — <https://www.edrdg.org/edrdg/licence.html>: JMdict, KANJIDIC2 theo CC BY-SA 4.0; app phải ghi công trên một màn hình riêng (ví dụ "Giới thiệu"), kèm liên kết tới tài liệu và giấy phép; **mục 4: phải có quy trình cập nhật dữ liệu định kỳ từ bản mới nhất** (không cập nhật là vi phạm giấy phép); người dùng dữ liệu không được nhận bản quyền phần dữ liệu đó. (Claude)
- **KANJIDIC2** — tải <https://www.edrdg.org/kanjidic/kanjidic2.xml.gz> ngày 2026-11-15 (database_version 2026-319, SHA-256 gz `61f8bcbf…d2e226`): 13 108 chữ; 2136 chữ Jōyō (grade 1–8); 2134/2136 có âm tiếng Việt (thiếu 𠮟, 剝); 513 chữ Jōyō có nhiều âm; thứ tự âm trong file **không** cho biết âm chính (生: Sanh, Sinh). Trường `jlpt` là JLPT **cũ** 4 cấp (cấp 4: 103 chữ, cấp 3: thêm 181). Một số âm Việt **nghi sai** ở chữ dạng Nhật: 着 "Khán", 桜 "Tí/Tý", 晩 "Hào/Mạn/Man", 仮 "Phản", 択 "Mân/Thước/Xách", 県 "Huyền". (Claude)
- **Âm Hán Việt ph0ngp/hanviet-pinyin-wordlist** — commit `b9923df…` (cùng commit c-learn-write dùng), MIT, xếp theo chữ phồn thể + pinyin. Quy đổi chữ Nhật → phồn thể bằng `JPShinjitaiCharacters.txt` của OpenCC (Apache-2.0, 403 cặp, ví dụ 図→圖, 駅→驛, 売→賣). Unihan 18.0 không có quan hệ 図→圖. Đối chiếu KANJIDIC2 ∩ ph0ngp (chuẩn hóa vị trí dấu thanh): với 245 kanji N5+N4 (Waller), 217 chữ ra đúng một âm, 27 chữ còn nhiều âm (中, 長, 行, 見, 上, 楽, 読, 会…), 1 chữ không khớp (着). (Claude)
- **JMdict** — tải <https://www.edrdg.org/pub/Nihongo/JMdict.gz> (2026-11-15, SHA-256 `e7e2e172…5a73d4`): **không có nghĩa tiếng Việt** (13 chỗ `xml:lang="vie"` chỉ là nguồn gốc từ mượn). Có loại động từ/tính từ (v1, v5k, adj-i, adj-na…) dùng được cho bảng chia. (Claude)
- **Danh sách N5–N4 không chính thức** — OpenJLPT <https://github.com/evanclan/OpenJLPT> commit `0d1d341` (2026-10-02), CC BY-SA 4.0: N5 674 từ, 84 kanji (79 của Waller + 5 "bổ sung"), 81 điểm ngữ pháp; N4 630 từ, 169 kanji (166 + 3 bổ sung, trong đó 凄, 痩 không thuộc Jōyō), 98 điểm ngữ pháp. Cấp từ/kanji lấy từ danh sách của Jonathan Waller (tanos.co.uk, OpenJLPT ghi "CC BY" — **Claude chưa tự kiểm chứng** vì trang chỉ có `http://`); ngữ pháp theo "đồng thuận của sách luyện thi". 674 từ N5 dùng 417 kanji khác nhau; N5+N4 (1304 từ) dùng 723 kanji. (Claude đọc repo và đếm)
- **Dữ liệu nét chữ:**
  - animCJK <https://github.com/parsimonhi/animCJK> commit `c63765b` (2026-11-08): `graphicsJa.txt` (7343 chữ, phủ 2136/2136 Jōyō) và `graphicsJaKana.txt` (177 kana) **đúng định dạng Make Me a Hanzi** (strokes + medians) mà hanzi-writer dùng; giấy phép Arphic Public License cho các file `graphics*` (như hanzi-writer-data). Số nét khớp KANJIDIC2 cho cả 284 chữ JLPT cũ cấp 4+3. **Bẫy:** kana có nét tự cắt bị tách thành đoạn phụ có đường trục chạy ra ngoài khung (あ 4 đoạn/3 nét, お 4/3, な 5/4, ぬ 4/2) → phải ghép lại khi build. (Claude)
  - Làm thử hanzi-writer 3.7.3 + animCJK trong Chromium với 今, 図, 日, 直, 駅, あ, お, な, ぬ: vẽ đúng chiều, tự hình dạng Nhật (今 nét 3 nằm ngang, 直 8 nét). (Claude, ảnh chụp trong scratchpad)
  - KanjiVG <https://github.com/KanjiVG/kanjivg> commit `610091c` (2026-11-05): CC BY-SA 3.0 (Ulrich Apel), chỉ có đường trục; số nét kana đúng (あ 3, ぬ 2) → dùng để đối chiếu. (Claude)
  - Ước lượng: dữ liệu nét của 245 kanji + 177 kana ≈ 735 KB (≈ 300 KB gzip). (Claude)
- **Bộ phân tích hình thái** — kuromoji 0.1.2 (Apache-2.0, từ điển mecab-ipadic-2.7.0 của NAIST, giấy phép cho phép dùng lại kèm thông báo): từ điển 18 MB nén, 41 MB giải nén → chỉ dùng lúc soạn/test. Thử: đọc sai 家 (カ), 日本 (ニッポン), 一人 (イチ・ニン), 二十日 (ニ・ジュウ・ニチ), 三本 (サン・ホン, thiếu biến âm) → cách đọc tự sinh **không đáng tin**, phải lấy từ dữ liệu khóa học và rà tay. (Claude)
- **JmdictFurigana** <https://github.com/Doublevil/JmdictFurigana> commit `8ab9472`: furigana theo từng chữ cho mục từ JMdict, giấy phép như JMdict (CC BY-SA), phát hành hàng tháng. (Claude đọc README)
- **WanaKana** 5.3.1 (MIT): chuyển romaji → kana (thử: watashiha → わたしは, kitte → きって; "konnnichiha" → こんんにちは, cần xử lý "nn"). (Claude)
- **Từ điển Nhật–Việt có giấy phép mở:** chưa tìm thấy (tìm kiếm web 2026-11-15). (Claude)
- **Ghép nét kana của animCJK:** quy tắc "đoạn có đường trục ra ngoài khung (x ∉ [0, 1024] hoặc y ∉ [−124, 900]) là phần nối của nét trước" cho số nét khớp KanjiVG ở 173/177 kana; す, ず, ね, の phải khai báo tay. 177 kana gồm cả chữ cổ/hiếm (ゐ ゑ ヰ ヱ ヷ ヸ ヹ ヺ ゕ ゖ ヵ ヶ ゎ ヮ). (Claude)
- **Irodori (JF):** điều khoản <https://www.irodori.jpf.go.jp/privacy.html> cấm dùng nội dung để soạn tài liệu khác ("本サイトと全く関係のない別の教材…を新たに作成するために…用いることはできません"). (Claude)
- **Thông tư 19/2021/TT-BGDĐT** (Công báo 691+692, <https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2021/7/34061/36370-1-2021691-69219-2021-tt-bgddt.pdf>, SHA-256 `0ff60008…270538c`): hết tiểu học Bậc 1 (50 hiragana, 50 katakana, ~900 từ, 55 chữ Hán, 42 cấu trúc); hết THCS Bậc 2 (thêm ~1200 từ, 240 chữ Hán, 100 cấu trúc); hết THPT Bậc 3 (thêm ~1200 từ, 240 chữ Hán, 90 cấu trúc). (Claude, đọc lớp chữ của PDF)
- **Agent tìm hiểu (Claude chưa tự mở lại)**, ghi chú đầy đủ có trích dẫn từng ở scratchpad của phiên (`agent-survey.md`, sẽ mất khi container bị thu hồi; tóm tắt nằm trong plan mục 3):
  - JFT-Basic: ~50 câu/60 phút, 4 phần; từ 8/2026 xếp A1, A2.1, A2.2 (A2.2 cho 特定技能1号); thi ở Việt Nam từ năm tài chính 2025; đề mẫu theo chính sách trang JF, không được sao chép.
  - 日本語教育の参照枠: không có danh sách từ/ngữ pháp; 122 基礎漢字 tới A2; trang bunka.go.jp theo quy tắc MEXT (公共データ利用規約 1.0, tương thích CC BY 4.0).
  - 常用漢字表 (2010): 360 chữ kèm dạng cũ trong ngoặc; 62 dạng cũ là CJK Compatibility Ideograph, bị NFC đổi về dạng mới; 著作権法 第13条 loại 告示 khỏi bảo hộ.
  - JF Can-do, Marugoto: không phải giấy phép mở; Marugoto cấm công bố danh sách từ đã sửa.
  - Tatoeba: câu CC BY 2.0 FR; 6123 câu tiếng Nhật có bản dịch tiếng Việt trực tiếp (bản xuất 2026-11-14); âm thanh phần lớn không có giấy phép dùng lại.
  - Trọng âm: Kanjium CC BY-SA 4.0 (ghi công "Uros O."); UniDic 3.1.0 GPL/LGPL/BSD.
  - Phông: AOSP `fonts.xml` gán `lang="ja"` cho mặt chữ Nhật của Noto Sans CJK; Chrome Android dùng ngôn ngữ của phần tử khi chọn phông CJK; iOS dùng Hiragino Sans; `system-ui` có thể bỏ qua `lang`.
  - Luật SHTT Việt Nam Điều 15: văn bản quy phạm pháp luật không được bảo hộ quyền tác giả.
  - Danh sách Waller: ba README thứ cấp ghi "Creative Commons BY"; tanos.co.uk không vào được.
- **Phiên bản thư viện** (npm, 2026-11-15): c-learn-write chạy xanh với TypeScript 7.0.2, Vite 8.3.8, Vitest 5.1.0, Preact 10.29.8, @preact/signals 2.11.4, idb 8.0.4, ts-fsrs 6.0.0, vite-plugin-pwa 2.0.0, Playwright 1.63.0, axe-core 4.14.0, happy-dom 21.0.4, hanzi-writer 3.7.3. Bản mới hơn: Preact 11.2.0 (bản lớn), Playwright 1.65.1 (2026-11-13), fake-indexeddb 6.2.8.

## 5. Nguồn gốc mã chép từ c-learn-write

Mọi file dưới đây chép từ c-learn-write **commit `e51323e25905859d37c95093c0c042e73f28abb6`** (MIT, cùng tác giả), đường dẫn giống nhau trừ khi ghi khác. Cột "Sửa" tóm tắt thay đổi.

| File (repo này) | Sửa |
|---|---|
| `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `.editorconfig`, `.gitattributes`, `.gitignore` | Giữ nguyên |
| `package.json` | Đổi tên `j-learn-write`, workspace `@j-learn-write/*`; khóa đúng phiên bản (không `^`); bỏ script `demo` |
| `LICENSE` | Thêm dòng bản quyền j-learn-write, giữ dòng c-learn-write |
| `.github/workflows/ci.yml`, `deploy.yml` | Giữ nguyên |
| `packages/grader/src/core/{types,patterns,align,fixes,scoring,validate}.ts` | `LangCode = 'ja'`; câu hỏi `count`: `counter`, `modifiers` thay `colors`; `location`: `position` thay `localizer`; ví dụ trong chú thích bằng tiếng Nhật |
| `packages/grader/src/highlight.ts` | Giữ nguyên |
| `packages/grader/tests/core/*.test.ts` | Dữ liệu thử đổi sang câu tiếng Nhật cùng cấu trúc (cùng vị trí, độ dài) |
| `packages/grader/tests/highlight.test.ts` | Từ `tests/demo/highlight.test.ts`, bỏ phần dùng câu hỏi mẫu, dữ liệu tiếng Nhật |
| `packages/grader/{tsconfig,vitest.config}.ts(on)` | Bỏ `demo`, `vite.config.ts` |
| `packages/course/LICENSE` | Giữ nguyên (CC BY-SA 4.0) |
| `packages/course/src/{csv,hash,review}.ts`, `tests/csv.test.ts` | Giữ nguyên (dữ liệu thử CSV đổi sang tiếng Việt/Nhật) |
| `packages/course/src/course.ts` | Viết lại theo cấp `kana`/`n5`/`n4` |
| `packages/course/src/types.ts` | Viết lại cho tiếng Nhật (theo khuôn cũ) |
| `apps/web/{index.html,vite.config.ts,vitest.config.ts,vitest.e2e.config.ts,tsconfig.json}` | Tên, mô tả; bỏ plugin nét chữ (thêm lại ở giai đoạn 4) |
| `apps/web/build/licenses.ts`, `scripts/make-icons.mjs` | Giữ nguyên |
| `apps/web/public/icon.svg` (+ PNG sinh lại bằng `npm run icons -w @j-learn-write/web`) | Chữ あ thay 汉 |
| `apps/web/src/{main.tsx,app.tsx,router.ts,routes.ts}` | Logo あ (`lang="ja"`); bớt route chưa có (trang `soon.tsx` tạm thời) |
| `apps/web/src/strings.ts` | Viết lại nội dung cho tiếng Nhật |
| `apps/web/src/styles/app.css` | Phông `--font-ja` cho `:lang(ja)` (không dùng `system-ui`) |
| `apps/web/src/lib/{db,backup,settings,sw,speech,srs,cards,progress,results,stats,writing}.ts` | `DB_NAME`/`BACKUP_APP` = `j-learn-write`; cấp là `LevelId`, mã ngữ pháp là chuỗi; cài đặt `furigana` thay `showPinyin`; giọng `ja-JP` (`japaneseVoices`) |
| `apps/web/src/components/{nav,lazy,icons,hooks,speak}.tsx/ts` | Giữ nguyên |
| `apps/web/src/components/text.tsx` | Viết mới: `MixedText` bọc chữ Nhật trong câu tiếng Việt bằng `lang="ja"` |
| `apps/web/src/pages/{home,settings,about,guide}.tsx` | Cấp Kana/N5/N4; furigana; nguồn dữ liệu tiếng Nhật; hướng dẫn bộ gõ/giọng tiếng Nhật |
| `apps/web/tests/{setup,router,backup,settings,speech,srs,cards,progress,stats,licenses,boundaries,app}.test.ts(x)` | Đổi id bài, cấp, giọng đọc; `licenses.test` dùng thư mục tạm thay cho opencc-js |
| `apps/web/e2e/{app,a11y}.e2e.ts` | Danh sách màn hình theo các trang đang có |

| `apps/web/src/components/run.tsx` | Chốt chặn bằng `useRef`: bấm đúp "Tiếp tục" ở câu cuối không gọi `onFinish` hai lần |
| `apps/web/src/components/exercise.tsx` | Chữ Nhật qua `JaText`/`MixedText`; `TextAnswer` không chấm câu gõ romaji (nhắc bật bộ gõ); chốt chặn bấm đúp; bỏ phần dịch/câu hỏi tự do tới giai đoạn 6 |
| `apps/web/src/lib/{content,exercises}.ts` | Cấp/mã bài `kana-NN`, `n5-NN`; `normalizeJa`; đáp án điền từ chấp nhận cách đọc kana (theo `ruby` của bài); câu hỏi nhanh kana thay cho pinyin |
| `apps/web/src/pages/{lesson,practice,quiz}.tsx` | Phần kana (lưới chữ, từ luyện đọc + romaji); `RubyContext` cho furigana |

Viết mới (không có trong c-learn-write): `apps/web/src/lib/romaji.ts` (romaji theo bảng kana của khóa học; WanaKana sai với ティ → "tei", ヴァ → "vua"), `JaText`/`RubyContext` trong `components/text.tsx`.

Chưa chép (sẽ chép khi tới giai đoạn tương ứng): `lang/zh` (chỉ tham khảo), `apps/web/src/lib/search.ts`, `components/grade-result.tsx`, các trang từ/ngữ pháp/ôn tập/từ điển/tiến độ/kiểm tra cấp.

## 5b. Thiết kế dữ liệu và bộ tách từ (tóm tắt, chi tiết trong mã)

- **Dạng hiển thị của từ:** dạng của OpenJLPT, trừ khi JMdict đánh dấu nghĩa đầu là `uk` (thường viết kana) hoặc từ có kanji ngoài Jōyō → viết kana (わかる, めがね). `forms` = các dạng được chấp nhận khi trả lời: dạng hiển thị, dạng OpenJLPT, kana; dạng kanji khác của JMdict chỉ thêm cho từ hiển thị bằng kana (vì một mục JMdict có thể gộp hai từ: 開く/空く).
- **Furigana của từ** (`ruby`): theo JmdictFurigana, dạng `{学|がく}{生|せい}`, `{大人|おとな}` (熟字訓 phủ cả cụm).
- **Âm Hán Việt:** `chooseHanViet` đối chiếu KANJIDIC2 với ph0ngp (qua bảng OpenCC chữ Nhật → phồn thể); chỉ tin khi hai nguồn chung đúng một âm. `data/hanviet-overrides.json`: `kanji` = âm chính Claude chọn cho chữ còn mơ hồ (vẫn gắn cờ), chuỗi rỗng = kokuji (込); `words` = âm theo nghĩa trong từ (勉強 miễn cưỡng), mỗi âm phải là âm đã biết của chữ đó.
- **Kanji cần học:** 79 N5 + 分 (quyết định 2026-11-15) + 166 N4 = 246.
- **Bảng chia** (`conjugate.ts`): nhãn dạng (`masu`, `neg`, `past`, `te`, `ta`, `nai`, `ba`, `vol`, `tai`, `potential`, `passive`, `causative`…) dùng cho kiểm soát "dạng chia đã học".
- **Bộ tách từ** (`tokenize.ts`): quy hoạch động, token biết = 10, ký tự lạ = 25, dấu câu = 1. Một mặt chữ giữ **mọi** cách phân tích (降ります: 降る/降りる; は: trợ từ/歯/葉). Số + trợ số từ nhận theo quy tắc (`numbers.ts`), cả dạng kana (さんぼん). Tên riêng truyền vào `courseLexicon(names)`.
- **Điểm ngữ pháp thêm của khóa học** (dự kiến, chưa làm): OpenJLPT không có số đếm/trợ số từ/giờ/ngày tháng; sẽ thêm các điểm `x-…` (cho phép theo plan mục 3.2).

## 5c. Trình tự ngữ pháp N5/N4 (đã chốt, dùng khi dựng lại curriculum)

N5 (28 bài): 1 wa desu ka-question de-wa-arimasen-ja-nai mo · 2 kore-sore-are-dore no kono-sono-ano-dono · 3 koko-soko-asoko-doko ne yo · 4 x-numbers x-counters-basic o-kudasai · 5 x-time kara-from made goro · 6 x-dates ni-time deshita · 7 masu masen mashita masen-deshita · 8 e ni-destination de-means to-with · 9 o de-place to-and ya ka-or · 10 masen-ka mashou mashou-ka ni-indirect-object · 11 x-i-adjective amari-nai · 12 na-na-adjective ku-nai-katta-ku-nakatta · 13 ga-suki-ga-kirai ga-jouzu-ga-heta ga-but kara-reason · 14 ga-aru-ga-iru ga-subject ni-location x-position · 15 x-counters ni-frequency dake kurai-gurai · 16 yori no-hou-ga-yori to-to-dochira-ga no-naka-de-ga-ichiban · 17 tai ga-hoshii ni-iku · 18 x-te-form te-kudasai te te-kara · 19 te-iru mou-ta mada-te-inai · 20 te-mo-ii te-wa-ikenai · 21 nai naide-kudasai nakereba-naranai-nakute-wa-ikenai nakute-mo-ii · 22 x-dictionary-form da mae-ni · 23 ta ta-koto-ga-aru ato-de tari-tari-suru · 24 ku-naru-ni-naru ni-suru kute-de · 25 zenzen-nai nani-mo-nai-dare-mo-nai nani-ka-dare-ka-doko-ka · 26 nagara to-iu-named deshou · 27 (ôn: sức khỏe, thời tiết) · 28 (ôn tập N5).

N4 (26 bài): 1 n-desu-no-desu kedo-keredomo shi kana-kashira · 2 ageru-kureru-morau te-ageru te-kureru te-morau · 3 te-kudasaru-te-itadaku te-kuremasen-ka-te-itadakemasen-ka · 4 eru-rareru-potential koto-ga-dekiru you-ni-naru · 5 ou-you you-to-omou tsumori yotei · 6 koto-ni-suru koto-ni-naru you-ni-suru ku-suru-ni-suru · 7 toki aida-aida-ni made-ni · 8 ba ba-yokatta tara tara-dou · 9 nara to te-mo-de-mo te-mo-kamawanai · 10 hou-ga-ii nai-to-ikenai-nakucha naide nasai · 11 te-shimau-chau te-oku te-miru te-aru · 12 te-iku te-kuru hajimeru-owaru-tsuzukeru dasu · 13 sou-da-appearance sou-da-hearsay rashii · 14 you-da mitai kamo-shirenai darou · 15 hazu-da hazu-ga-nai to-omou to-iu-say · 16 node noni-although noni-purpose te-reason tame-ni you-ni · 17 te-hoshii tagaru garu yasui-nikui · 18 sugiru hodo-nai nakanaka-nai shika-nai bakari ta-bakari · 19 tokoro-da zutsu oki-ni me x-counters-n4 · 20 ka-dou-ka ka-embedded-question no-koto-nominalizer koto-ga-aru · 21 reru-rareru-passive mo-emphasis · 22 seru-saseru sasete-kudasai serareru-saserareru · 23 e-ro na-prohibition · 24 sonkeigo o-ni-naru · 25 kenjougo o-suru de-gozaimasu · 26 kata chuu-juu toka-toka nado de-mo-suggestion sa ga-suru.

## 5d. Dữ liệu nét chữ

- Kanji: AnimCJK nguyên vẹn. Kana: AnimCJK tách nét tự cắt thành nhiều đoạn có đường trục "ra ngoài khung" (chỉ để hoạt hình). `src/strokes.ts` ghép các đoạn (theo quy tắc ra ngoài khung; す ず ね の khai báo tay trong `MANUAL_GROUPS`), nét đã ghép lấy **đường trục KanjiVG** (đổi tọa độ: x·1024/109, 900 − y·1024/109); nét không ghép giữ đường trục AnimCJK (KanjiVG đặt dấu ゛゜ lệch so với tự hình AnimCJK). Test: đủ số nét theo KanjiVG cho 177 kana/246 kanji, đường trục nằm trong đường viền của đúng nét; e2e mô phỏng viết bằng chuột theo đường trục → hanzi-writer nhận đúng (あ ぬ の す 学).
- File kana đã ghép có trường `notice` (Arphic Public License yêu cầu ghi chú file đã sửa); app kèm `ARPHICPL.TXT`, `ANIMCJK-COPYING.txt`, `KANJIVG-COPYING.txt`.

## 6. Lưu ý kỹ thuật (bẫy đã biết)

- **Script Node import gói grader:** mã của grader phải dùng import có đuôi `.ts`, JSON `with { type: 'json' }`, và **không** dùng thuộc tính khai báo trong constructor (`constructor(readonly x)`) vì Node chỉ bỏ được kiểu "xóa được".
- **Kiểm soát hư từ:** trợ từ, です/でした/だ… chỉ được dùng sau khi học điểm ngữ pháp tương ứng (bảng `function` trong `data/form-grammar.json`). ではありません/じゃありません, いけません/いけない, なりません/ならない, こと (danh từ hóa) là hư từ riêng để không bị đọc thành ある/行ける/なる/こと (N4).
- **Sửa danh sách gốc** (`data/vocabulary-fixes.json`): nối nhầm JMdict (しかる, せっけん), cách viết chuẩn (終わる, 曲がる, ご飯, あげる…; cách viết gốc vẫn được chấp nhận), cách đọc (毎月 まいつき), cấp (ぜんぜん dạy ở N5 cho 全然〜ない), dạng thêm (ゆっくり). Từ thêm (`vocabulary-extra.json`): 私 わたし, 何 なに, 父, 母, 日本, 日本語, 日本人, そして, そう, ありがとうございます, おはようございます, 何曜日, 方 ほう.
- **Kanji "thường dụng"** = KANJIDIC2 grade 1–8 (9–10 là chữ dùng cho tên: 賑, 噌 → từ hiển thị bằng kana).
- **Furigana:** `content:fill` giữ markup viết tay nếu nó đủ cách đọc cho mọi kanji (十 とお, 何で なにで); khi dữ liệu đổi cách đọc (毎月), xóa mục cũ trong `ruby` rồi chạy lại. Mọi đoạn furigana của từ trong danh sách (kể cả các dạng viết khác, `formsRuby`) được coi là cách đọc đã biết (お父さん, 切手, 美味しい).
- **Bộ tách từ** ưu tiên từ trọn vẹn hơn gốc động/tính từ và từ kanji viết bằng kana khi hai cách tách bằng điểm (近くに, くらいいます); số có dấu phẩy và số + 万/千 (30,000円, 3万円).
- **Luật của bộ chấm phải im lặng khi không chắc:** danh sách từ trong `lang/ja/data/rules.json` (người/vật, nơi chốn, động từ hành động, danh từ ↔ trợ số từ) quyết định khi nào luật được nói; tên riêng không tự coi là người (大阪); 円/時/歳 không bị coi là trợ số từ đếm vật. Mọi câu đúng của khóa học chạy qua các luật trong test `content.test.ts`.
- **Làm song song nhiều agent:** dùng git worktree riêng cho phần mã (`npm run check` của nhánh chính bị ảnh hưởng bởi file bài đang soạn dở), rồi `cherry-pick` sang nhánh chính. Agent chỉ được sửa file bài của mình và báo lại lỗi công cụ, không tự sửa công cụ.
- **Đáp án không được chấm sai câu đúng:** ở bài kana, を đọc là "o" nên không dùng "o" làm phương án nhiễu cho を (đáp án theo bảng là "wo").
- **Kiểm soát kana ở bài kana:** phương án nhiễu của câu trắc nghiệm được dùng kana chưa học (め nhiễu cho あ); phần luyện đọc và đáp án đúng thì không.

- **Playwright trong môi trường cloud:** dự án khóa `playwright` 1.63.0, khớp Chromium cài sẵn (`/opt/pw-browsers/chromium-1243`): `npm run e2e` chạy được không cần `playwright install`. Trên CI vẫn chạy `npx playwright install --with-deps chromium`.
- **Test `lang="ja"`** (`apps/web/tests/lang.test.tsx`): mọi trang không có tham số phải không có chữ kana/kanji nằm ngoài phần tử `lang="ja"`. Chữ Nhật trong câu tiếng Việt (ví dụ trong `strings.ts`) phải hiện qua `MixedText`.
- **`fetch` của Node không tự dùng proxy:** chạy script tải nguồn với `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21), ví dụ `NODE_USE_ENV_PROXY=1 npm run sources:fetch -w @j-learn-write/course`. File lớn được lưu đệm ở `node_modules/.cache/j-learn-write-sources` (thêm `-- --refresh` để tải lại).
- **Công cụ ghi file của Claude giải mã `\uXXXX`** thành ký tự thật (đã xảy ra với BOM và dải `\u3400-\u9fff` trong `fetch-sources.ts`). Trong mã: dùng `String.fromCharCode(0x…)` hoặc `\p{Script=Han}`, rồi chạy lệnh kiểm tra ký tự vô hình.
- **TypeScript "weak type"**: truyền object literal có thêm trường vào hàm nhận kiểu chỉ có trường tùy chọn sẽ lỗi; gán vào biến trước.

- Ký tự vô hình (BOM, U+2028…): trong mã dùng `String.fromCharCode(0x…)`; trước mỗi commit có chữ Nhật chạy
  `LC_ALL=C grep -rlP '\xe2\x80[\x8b-\x8f\xa8-\xae]|\xe2\x81[\xa0-\xaf]|\xef\xbb\xbf|\xe3\x80\x80' <thư mục>` (mong đợi rỗng; U+200D bên trong emoji ghép là hợp lệ).
- Đừng gõ tay bảng chuẩn dài (bảng kana, danh sách Jōyō): sinh từ dữ liệu hoặc dải mã Unicode.
- Không đưa câu ví dụ chính thức của đề thi/giáo trình có bản quyền vào repo.
