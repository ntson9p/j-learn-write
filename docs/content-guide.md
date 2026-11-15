# Hướng dẫn soạn và duyệt nội dung khóa học

Nội dung khóa học nằm trong `packages/course/data/` và theo giấy phép CC BY-SA 4.0. Mọi nội dung hiện là **bản nháp do Claude soạn**; giáo viên duyệt qua bảng tính (mục 6).

## 1. Các file

| File | Nội dung | Ai sửa |
|---|---|---|
| `data/jlpt/vocabulary.json`, `kanji.json`, `grammar.json`, `ids.lock.json`, `data/kana.json` | Danh sách từ (1311), kanji cần học (246), điểm ngữ pháp (189), kana (241) | Sinh tự động: `npm run data:build -w @j-learn-write/course`, không sửa tay |
| `data/vocabulary-extra.json` | Từ khóa học thêm vào danh sách (私 わたし, 何 なに, 父, 母, 日本…) | Người soạn, giáo viên duyệt |
| `data/vocabulary-fixes.json` | Sửa lỗi của danh sách nguồn: từ OpenJLPT bị nối nhầm mục JMdict (しかる → 叱る), có ghi lý do | Người soạn, giáo viên duyệt |
| `data/grammar-extra.json` | Điểm ngữ pháp khóa học thêm (`x-…`: số đếm, trợ số từ, giờ, ngày, vị trí, tính từ đuôi い, thể て, thể từ điển) | Người soạn |
| `data/hanviet-overrides.json` | Âm Hán Việt chính do người soạn chọn cho kanji còn nhiều âm; âm theo nghĩa trong từ (勉強 miễn cưỡng) | Người soạn, giáo viên duyệt |
| `data/form-grammar.json` | Dạng chia nào cần điểm ngữ pháp nào đã học | Người soạn |
| `data/curriculum.json` | Bài nào dạy kana, từ (số thứ tự), kanji, điểm ngữ pháp nào | Người soạn, giáo viên duyệt |
| `data/lessons/<cấp>/<NN>.json` | Nội dung một bài: nghĩa, ví dụ, kanji, giải thích ngữ pháp, bài tập, furigana | Người soạn, giáo viên duyệt |
| `data/names.json` | Tên riêng dùng trong câu mà không cần dạy (ベトナム, 田中…), kèm cách đọc | Người soạn |
| `data/levels.json` | Cấp nào đã soạn xong (`complete`): khi đó test bắt buộc phủ đủ | Người soạn |
| `packages/grader/src/lang/ja/data/*.json` | Dữ liệu của bộ chấm: hư từ, trợ số từ, bản sao danh sách từ (`words.json`, sinh tự động) | Người soạn, giáo viên duyệt |

## 2. Quy trình soạn một bài

1. Xem bài cần dạy gì và được dùng gì: `npm run content:brief -w @j-learn-write/course -- n5-05`.
2. Viết `data/lessons/n5/05.json` theo mẫu của bài đã có (mục 4). **Không** cần viết furigana.
3. Điền furigana và chuẩn hóa định dạng: `npm run content:fill -w @j-learn-write/course -- n5-05`. Nếu lệnh báo "ambiguous reading" (降ります: ふります hay おります), viết tay cách đọc đúng vào mục tương ứng của bảng `ruby` trong file bài (ví dụ `"雨が降ります。": "{雨|あめ}が{降|ふ}ります。"`), rồi chạy lại.
4. Kiểm tra riêng bài đó: `CONTENT_FILTER=n5-05 npx vitest run --project course` (ở thư mục gốc). Sửa đến khi không còn lỗi, rồi chạy `npm run check`.

## 3. Quy ước nội dung

**Kiểm soát từ vựng và dạng chia (bắt buộc, test tự kiểm tra).** Mọi câu tiếng Nhật của một bài chỉ được dùng:
- từ của bài đó và các bài trước (cả cấp trước), viết theo một dạng được chấp nhận của từ (`forms` trong `vocabulary.json`);
- hư từ (trợ từ, です, …), tên riêng trong `names.json`;
- **dạng chia đã học**: ví dụ chưa học điểm `masu` thì không dùng 食べます; chưa học `x-te-form` thì không dùng 食べて; chưa học `x-dictionary-form` thì không dùng 食べる trong câu (bảng đầy đủ: `data/form-grammar.json`);
- số + trợ số từ sau khi đã học điểm ngữ pháp của trợ số từ đó (`x-counters-basic`: つ, 人, 歳, 円; `x-counters`: 本, 枚, 冊…; `x-time`: 時, 分; `x-dates`: 月, 日, 年).

Gặp từ không có trong khóa học, test báo "not a course word": đổi câu, hoặc (nếu là tên riêng hợp lý) thêm vào `names.json`.

**Chữ viết.** Viết từ theo dạng trong danh sách (trường `word`): có kanji thì viết kanji, kể cả kanji chưa học (app tự hiện furigana); từ trong danh sách viết kana thì viết kana. Số: dùng chữ số Ả Rập cho giờ, ngày, giá tiền, số lượng (3時, 100円, 3本); chữ số kanji dạy ở bài số đếm. Dấu câu Nhật: 。、？！「」.

**Văn phong.** Các bài N5 trước bài dạy thể từ điển (`x-dictionary-form`, bài n5-22) dùng thể lịch sự です/ます. Thể thông thường chỉ dùng sau khi đã dạy.

**Từ (`words`).** Mỗi từ của bài có:
- `meaningsVi`: nghĩa ngắn gọn, nghĩa thông dụng nhất đứng trước; nhiều nghĩa khác nhau thì tách thành nhiều mục;
- `noteVi` (khi có ích): cách dùng, chỗ khác tiếng Việt, **âm Hán Việt dễ gây hiểu nhầm** (勉強 "miễn cưỡng" nhưng nghĩa là học; 大丈夫 "đại trượng phu" nhưng nghĩa là "không sao"), lịch sự hay thân mật;
- `examples`: ít nhất một câu **có dùng từ đó** (ở bất kỳ dạng chia nào), tự nhiên, ngắn, có ích; kết thúc bằng 。！？; `vi` là bản dịch tự nhiên.

**Kanji (`kanji`).** `meaningVi`: nghĩa ngắn của chữ (ví dụ 学: "học"); `noteVi` (tùy chọn): mẹo nhớ hình chữ, phân biệt chữ dễ nhầm. Âm on/kun, số nét, âm Hán Việt lấy tự động từ danh sách.

**Ngữ pháp (`grammar`).** `titleVi`, `summaryVi` (một câu), `explanationVi` (2–4 đoạn ngắn, viết cho người mới học, so sánh với tiếng Việt khi có ích), `patterns` (ví dụ "N1 は N2 です"), `examples` (2–4 câu), `mistakes` (lỗi hay gặp, **ưu tiên lỗi do thói quen tiếng Việt**: trật tự S-V-O, định ngữ đặt sau danh từ, あります/います, に/で…). Trong giải thích, chữ Nhật đặt trong 「」, chỗ nhấn mạnh viết `**…**`. Câu `mistakes.right` phải đúng và qua kiểm soát từ vựng; `wrong` phải thật sự sai (nếu chỉ sai ý định hoặc kém tự nhiên, ghi rõ trong `noteVi`). `issue` ghi mã lỗi của bộ chấm nếu bộ chấm bắt được lỗi đó.

**Bài tập (`exercises`).** Mã `n5-05-e01`, `e02`… Mỗi điểm ngữ pháp của bài cần **ít nhất 3 bài tập** ghi `grammar: ["id"]`. Nên có 15–25 bài tập mỗi bài, đủ các dạng:

| Dạng | Trường | Chấm |
|---|---|---|
| `choice` | `promptVi`, `ja` (tùy chọn, dùng ＿ cho chỗ trống), `options`, `answer` (chỉ số), `explainVi` | So đáp án |
| `fill` | `before`, `after` (kết thúc bằng 。！？), `answers`, `options` (tùy chọn), `vi` | So đáp án sau khi chuẩn hóa |
| `order` | `vi`, `tiles`, `answers` (các thứ tự được chấp nhận, không có dấu câu) | So thứ tự; sai thì bộ chấm giải thích nếu có luật |
| `translate` | `vi`, `answers` (cú pháp `[a\|b](x)` của bộ chấm), `examples` | Bộ chấm loại `model` |
| `question` | `question`: câu hỏi của bộ chấm (`count`, `location`, `model`) không có `id`, `lang` | Bộ chấm |
| `match` | `promptVi`, `pairs` (tiếng Nhật ↔ nghĩa) | So cặp |

Với `translate` và `question`: liệt kê đủ các cách nói đúng phổ biến trong `answers` (viết cả dạng kanji; bộ chấm tự chấp nhận câu viết toàn kana), và thêm `examples` gồm vài câu đúng, vài câu sai kèm điểm mong đợi: mỗi ví dụ là một test.

**Bài kana (`kana-NN`).** Không có từ, kanji, ngữ pháp. Có `practice` (từ hoặc cụm viết **chỉ bằng kana đã học tới bài đó**, kèm nghĩa tiếng Việt) và bài tập `choice`/`match`/`order` để nhận mặt chữ, ghép kana với romaji, ghép thẻ kana thành từ. Không dùng kanji.

**Câu đúng không bị bắt lỗi.** Test chạy các luật của bộ chấm trên mọi câu đúng của khóa học. Nếu một câu đúng bị báo lỗi, đó là lỗi của luật: báo lại và sửa luật (chính xác trước, đầy đủ sau).

**Bản quyền.** Không chép câu ví dụ, bài khóa, hội thoại của giáo trình có bản quyền (Minna no Nihongo, Genki, Marugoto, Irodori…) hay của đề thi, đề mẫu (JLPT, JFT-Basic), không chép câu Tatoeba. Tự viết câu mới.

## 4. Mẫu một bài (rút gọn)

```json
{
  "id": "n5-01",
  "goalsVi": ["Giới thiệu tên và quốc tịch"],
  "words": [
    {
      "no": 151,
      "word": "学生",
      "meaningsVi": ["học sinh", "sinh viên"],
      "examples": [{ "ja": "私は学生です。", "vi": "Tôi là học sinh." }],
      "review": { "status": "draft" }
    }
  ],
  "kanji": [{ "char": "学", "meaningVi": "học", "review": { "status": "draft" } }],
  "grammar": [
    {
      "id": "wa",
      "titleVi": "Trợ từ は: chủ đề của câu",
      "summaryVi": "「は」 nêu điều mà câu nói tới; đọc là wa.",
      "explanationVi": ["…"],
      "patterns": ["N1 は N2 です"],
      "examples": [{ "ja": "私はベトナム人です。", "vi": "Tôi là người Việt Nam." }],
      "mistakes": [{ "wrong": "私わ学生です。", "right": "私は学生です。", "noteVi": "Trợ từ đọc là wa nhưng viết là は." }],
      "review": { "status": "draft" }
    }
  ],
  "exercises": [
    { "id": "n5-01-e01", "type": "choice", "grammar": ["wa"], "promptVi": "Chọn trợ từ đúng", "ja": "私＿学生です。", "options": ["は", "を", "に"], "answer": 0 }
  ],
  "ruby": { "私は学生です。": "{私|わたし}は{学|がく}{生|せい}です。" }
}
```

## 5. Trạng thái duyệt

Mỗi từ, kanji, điểm ngữ pháp (và tùy chọn mỗi bài tập, mỗi từ luyện đọc của bài kana) có `review`; thiếu `review` nghĩa là chưa duyệt:

```json
{ "status": "draft" }
{ "status": "approved", "by": "GV Hương", "date": "2026-12-01", "hash": "1a2b3c4d" }
```

- `draft`: chưa duyệt, app hiện nhãn "Chưa duyệt" (trên mục đó, và ở đầu trang bài học khi còn mục nào của bài chưa duyệt).
- `approved`: giáo viên đã duyệt. `hash` là mã của nội dung lúc duyệt; nếu nội dung bị sửa sau đó thì app coi như chưa duyệt.
- `changes_requested`: giáo viên yêu cầu sửa; `note` ghi góp ý.

## 6. Giáo viên duyệt bằng bảng tính

Giáo viên không cần biết JSON hay GitHub.

1. Người phụ trách xuất các bài cần duyệt ra bảng tính: `npm run review:export -w @j-learn-write/course -- duyet-n5.csv n5` (cả N5), hoặc `… -- duyet-bai3.csv n5-03` (một bài).
2. Giáo viên mở file bằng Excel hoặc Google Sheets. Mỗi dòng là một từ luyện đọc (bài kana), một từ, một kanji, một điểm ngữ pháp hoặc một bài tập, gồm chữ Nhật, cách đọc, âm Hán Việt (dấu `(*)`: chữ có nhiều âm, cần chọn), nghĩa, ghi chú, ví dụ (tiếng Nhật — cách đọc — bản dịch), lỗi hay gặp.
3. Với mỗi dòng đã xem, giáo viên điền:
   - **Kết quả duyệt**: `đạt` hoặc `cần sửa`;
   - **Người duyệt**: tên hoặc chữ viết tắt;
   - **Góp ý**: bắt buộc khi `cần sửa` (sửa thế nào, vì sao).
   Không sửa các cột khác, nhất là cột **Mã** và **Mã nội dung**. Lưu lại dưới dạng CSV (UTF-8).
4. Người phụ trách nhập kết quả: `npm run review:import -w @j-learn-write/course -- duyet-n5.csv`. Nếu có dòng sai (giá trị lạ, thiếu góp ý, hoặc nội dung đã bị sửa sau khi xuất), lệnh báo lỗi và **không ghi gì**.
5. Các mục `cần sửa` được sửa theo góp ý, rồi xuất lại để giáo viên duyệt lần nữa. Khi một mục đã `đạt` bị sửa nội dung, app tự coi nó là "Chưa duyệt" cho tới khi được duyệt lại.
