# Bàn giao dự án j-learn-write

> **Đọc file này trước tiên.** Phiên Claude mới không có bộ nhớ của các phiên trước: mọi điều cần biết để làm tiếp nằm trong file này và [plan.md](plan.md) (khi đã có).

## 1. Tóm tắt

- **Mục tiêu:** web app (PWA, chạy hoàn toàn trên máy) dạy tiếng Nhật cho người Việt từ con số 0 tới trình độ sơ cấp (dự kiến tương đương JLPT N5–N4), dựa trên dự án tiếng Trung **c-learn-write** của cùng chủ dự án.
- **Ràng buộc gốc:** không dùng LLM/AI khi app chạy; chấm điểm bằng luật, tất định; chính xác trước, đầy đủ sau (`needsReview` khi không chắc); giao diện và nhận xét tiếng Việt, mọi đoạn tiếng Nhật trong HTML có `lang="ja"`; nội dung là JSON do Claude soạn nháp, giáo viên duyệt qua bảng tính, app hiện nhãn "Chưa duyệt".
- **Trạng thái:** giai đoạn 0 (tiếp nhận) xong; giai đoạn 1 (khảo sát, hỏi quyết định, viết `docs/plan.md`) đang làm. **Chưa viết code**: chờ chủ dự án duyệt `docs/plan.md`.

## 1b. Tiến độ

| Giai đoạn | Trạng thái |
|---|---|
| 0. Tiếp nhận | Xong (2026-11-15), xem mục 3 |
| 1. Khảo sát và quyết định | Đang làm: khảo sát nguồn xong (mục 4); đợt hỏi 1 xong (mục 1c); còn đợt hỏi 2 và viết `docs/plan.md` |

## 1c. Quyết định đã chốt

Đợt 1 (2026-11-15), chủ dự án chọn phương án khuyên dùng ở cả 4 câu:

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | Phạm vi | Chặng kana + **N5 + N4** theo danh sách cộng đồng của J. Waller qua OpenJLPT (CC BY-SA 4.0): ~1304 từ, 245 kanji cần học, ~179 điểm ngữ pháp (rà lại) |
| 2 | Kiến trúc | **Giữ kiến trúc c-learn-write** (PWA offline, Preact 10.29.8 + Vite 8, monorepo grader/course/web, FSRS, giọng đọc thiết bị); **sao chép mã** rồi sửa, ghi nguồn gốc + commit |
| 3 | Soạn và duyệt | Claude soạn nháp; giáo viên duyệt qua bảng tính CSV; nhãn "Chưa duyệt"; âm Hán Việt nhiều âm có dấu * |
| 4 | Giấy phép | Code **MIT**, nội dung **CC BY-SA 4.0**; dùng dữ liệu EDRDG/OpenJLPT trong app, ghi công ở trang Giới thiệu, tải lại dữ liệu EDRDG và báo khác biệt trước mỗi lần phát hành |

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
- **Phiên bản thư viện** (npm, 2026-11-15): c-learn-write chạy xanh với TypeScript 7.0.2, Vite 8.3.8, Vitest 5.1.0, Preact 10.29.8, @preact/signals 2.11.4, idb 8.0.4, ts-fsrs 6.0.0, vite-plugin-pwa 2.0.0, Playwright 1.63.0, axe-core 4.14.0, happy-dom 21.0.4, hanzi-writer 3.7.3. Bản mới hơn: Preact 11.2.0 (bản lớn), Playwright 1.65.1 (2026-11-13), fake-indexeddb 6.2.8.

## 5. Nguồn gốc mã chép từ c-learn-write

Chưa chép file nào (chờ duyệt plan).

## 6. Lưu ý kỹ thuật (bẫy đã biết)

- Ký tự vô hình (BOM, U+2028…): trong mã dùng `String.fromCharCode(0x…)`; trước mỗi commit có chữ Nhật chạy
  `LC_ALL=C grep -rlP '\xe2\x80[\x8b-\x8f\xa8-\xae]|\xe2\x81[\xa0-\xaf]|\xef\xbb\xbf|\xe3\x80\x80' <thư mục>` (mong đợi rỗng; U+200D bên trong emoji ghép là hợp lệ).
- Đừng gõ tay bảng chuẩn dài (bảng kana, danh sách Jōyō): sinh từ dữ liệu hoặc dải mã Unicode.
- Không đưa câu ví dụ chính thức của đề thi/giáo trình có bản quyền vào repo.
