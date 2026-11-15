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
| 1. Khảo sát và quyết định | Xong. 8 quyết định (mục 1c); **[plan.md](plan.md) được duyệt 2026-11-15** (kể cả các đề xuất kỹ thuật và thêm 分). Chủ dự án yêu cầu triển khai liên tục toàn bộ kế hoạch, chỉ hỏi khi cần thiết |
| 2. Nền tảng | Đang làm (mục 5): monorepo, lõi bộ chấm, khung `course`, khung app, e2e đã chạy được |

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

Chưa chép (sẽ chép khi tới giai đoạn tương ứng): `lang/zh` (chỉ tham khảo), `packages/course/src/{validate,review-sheet,segment,generate,readings}.ts`, `scripts/*`, `apps/web/src/lib/{content,exercises,search}.ts`, `components/{exercise,grade-result,run,writer}.tsx`, các trang học, `build/strokes.ts`.

## 6. Lưu ý kỹ thuật (bẫy đã biết)

- **Playwright trong môi trường cloud:** dự án khóa `playwright` 1.63.0, khớp Chromium cài sẵn (`/opt/pw-browsers/chromium-1243`): `npm run e2e` chạy được không cần `playwright install`. Trên CI vẫn chạy `npx playwright install --with-deps chromium`.
- **Test `lang="ja"`** (`apps/web/tests/lang.test.tsx`): mọi trang không có tham số phải không có chữ kana/kanji nằm ngoài phần tử `lang="ja"`. Chữ Nhật trong câu tiếng Việt (ví dụ trong `strings.ts`) phải hiện qua `MixedText`.
- **TypeScript "weak type"**: truyền object literal có thêm trường vào hàm nhận kiểu chỉ có trường tùy chọn sẽ lỗi; gán vào biến trước.

- Ký tự vô hình (BOM, U+2028…): trong mã dùng `String.fromCharCode(0x…)`; trước mỗi commit có chữ Nhật chạy
  `LC_ALL=C grep -rlP '\xe2\x80[\x8b-\x8f\xa8-\xae]|\xe2\x81[\xa0-\xaf]|\xef\xbb\xbf|\xe3\x80\x80' <thư mục>` (mong đợi rỗng; U+200D bên trong emoji ghép là hợp lệ).
- Đừng gõ tay bảng chuẩn dài (bảng kana, danh sách Jōyō): sinh từ dữ liệu hoặc dải mã Unicode.
- Không đưa câu ví dụ chính thức của đề thi/giáo trình có bản quyền vào repo.
