# Thiết kế bộ chấm tiếng Nhật

Bộ chấm (`packages/grader`, phần `src/lang/ja`) chấm câu trả lời tự luận **bằng luật, không dùng AI**: cùng một câu trả lời luôn được cùng một điểm, trên mọi máy. Nguyên tắc: **chính xác trước, đầy đủ sau** — một luật chỉ báo lỗi khi chắc chắn; khi không chắc, bộ chấm im lặng hoặc đánh dấu "cần giáo viên xem lại" (`needsReview`).

Tài liệu này mô tả cách chấm và từng luật. Kế hoạch tổng thể: [plan.md](plan.md); cách viết bài tập tự luận: [content-guide.md](content-guide.md).

## 1. Các bước

1. **Chuẩn hóa** (`normalize.ts`): NFKC (chữ, số toàn độ rộng → thường; katakana nửa độ rộng → đủ độ rộng), bỏ ký tự vô hình và khoảng trắng, dấu câu ASCII → 。、！？, gạch ngang sau kana → ー. Câu trả lời **chỉ có chữ Latin** không được chấm: app nhắc bật bộ gõ tiếng Nhật.
2. **Tách từ** (`tokenize.ts`): quy hoạch động trên từ vựng của khóa học (mọi dạng chia, cả cách viết kana), hư từ (`data/function-words.json`), tên riêng, số và số + trợ số từ (kể cả 30,000円, 3万円, さんぼん). Chi phí: từ đã biết 10, ký tự lạ 25, dấu câu 1; khi hai cách tách bằng điểm, ưu tiên từ trọn vẹn hơn gốc động/tính từ và hơn từ kanji viết bằng kana (近くに = 近く + に, không phải 近 + くに). Mỗi đoạn giữ **mọi** cách phân tích (は: trợ từ, 歯, 葉).
3. **Luật** (`rules.ts`): chạy trên câu trả lời, mỗi lỗi kèm nhận xét tiếng Việt và cách sửa (`fix`).
4. **Chấm nội dung** theo loại câu hỏi (mục 2).
5. **Điểm** = điểm nội dung − tổng điểm trừ của các lỗi (mặc định ở `issues.ts`, mỗi câu hỏi có thể đổi).

## 2. Ba loại câu hỏi

### `model`: so với đáp án mẫu (`model.ts`)

- Câu trả lời và mỗi đáp án (sau khi mở rộng cú pháp `[a|b](x)`) được cắt thành **đơn vị** (token). Hai đơn vị bằng nhau khi có chung một cách phân tích: 私 = わたし, 食べます = たべます, ではありません = じゃありません.
- **Gộp vị ngữ** (`joinPredicates` trong `units.ts`) để các cách nói tương đương so được với nhau: 高くないです = 高くありません, 行かないです = 行きません, じゃないです = ではありません, 食べている = 食べてる (thể nói nhanh). Thể thông thường thay thể lịch sự (高い cho 高いです, じゃない cho ではありません, 何？ cho 何ですか) chỉ được **nhắc** (−0).
- に và へ trước 行く/来る/帰る được coi là như nhau khi đứng sau nơi chốn (không sau gốc động từ: 買いに行きます chỉ dùng に); から và ので chỉ lý do được coi là như nhau.
- Dấu ？ cuối câu tính như か (行く？ = 行きますか; câu khẳng định 行く。 không phải câu hỏi). ね/よ cuối câu được bỏ qua, trừ khi đáp án cũng kết thúc bằng ね/よ.
- Căn chỉnh có trọng số (`core/align.ts`). **Được chấp nhận, có trừ điểm:** thiếu/thừa trợ từ hoặc です (−15), đổi trợ từ (−20, kèm "cần giáo viên xem lại" vì có thể cả hai đều đúng), kanji đồng âm (雨/飴, −5), trượt kana (がこう/がっこう, −10; im lặng nếu kết quả là một từ có thật; おいしいそう không phải trượt của おいしそう), hiragana thay katakana (こーひー, −5). **Không bao giờ chấp nhận:** từ khác, thì khác, phủ định, con số, câu hỏi thay câu khẳng định (いけませんか ≠ いけません); thiếu hoặc đổi か, も, だけ, しか, の cuối câu (この傘はナムさんのです); đổi chỗ から, まで, より với trợ từ khác (英語は日本語より ≠ 英語より日本語が; thiếu chúng thì vẫn là lỗi nhẹ).
- **So theo cách viết** (`render.ts`): nếu căn chỉnh không khớp trọn vẹn, câu trả lời được so với từng từ của đáp án, mỗi từ có thể viết như đáp án, bằng kana, hoặc chỉ một phần kanji bằng kana (昼ごはん cho 昼ご飯), hoặc một cách viết khác của cùng từ trong danh sách. Không cần tách từ câu trả lời, nên câu đúng viết kana không bị tách sai (わたしはいしゃです không bị đọc thành 歯医者). Trợ từ viết theo cách đọc (わたしわ, 京都わ, ハノイえ, でわ) → `particle_kana`; từ katakana viết hiragana (てれび) → `kana_script`.
- Không khớp cả câu thì thử từng câu (tách ở 。！？): một câu khớp → đúng nhưng "cần xem lại" (phần còn lại chưa kiểm tra). Không khớp: 0 điểm; nếu chỉ khác đúng một chỗ làm đổi nghĩa → "cần xem lại".

### `count`: 何本/何人/いくつ… (`count.ts`)

Tìm các cụm số + trợ số từ (bỏ qua 円, 時, 歳… vì chúng đo thứ khác). Số đọc được cả khi viết kana (さんぼん, じゅういちじ, はっせんろっぴゃくえん, はつか) và chữ số + kana (35さい, 10ぷん). Đúng số → đúng nội dung; số trống không (3です) → `missing_counter`; trợ số từ khác loại → `wrong_counter`; đọc thiếu biến âm (さんほん) → `counter_reading`. Sai số, phủ định (ありません, じゃありません, ない), nhiều con số khác nhau, nói về danh từ khác → sai nội dung (tối đa 20 điểm).

### `location`: どこにありますか/いますか (`location.ts`)

Tìm "N の P" (机の下) hoặc N trước に/です. Đúng nơi và đúng vị trí → đúng nội dung; thiếu vị trí (机にいます khi hỏi "dưới bàn") → `missing_position`; vị trí đặt trước như tiếng Việt (下の机) → `position_order`; で khi hỏi chỗ ở của người/vật (机の上であります) → `ni_de`. Nơi khác, vị trí khác, phủ định (kể cả động từ hành động: レストランで食べませんでした) → sai nội dung.

## 3. Các luật

Mỗi luật có test "phải bắt" và "không được bắt" (`packages/grader/tests/ja/rules.test.ts`), và **không được báo lỗi bất kỳ câu đúng nào của khóa học** (test `raises no grader issue on any correct sentence of the course` trong `packages/course/tests/content.test.ts` chạy mọi luật trên mọi câu ví dụ, câu sửa đúng, đáp án). Danh sách từ dùng cho luật nằm trong `src/lang/ja/data/rules.json` (giáo viên duyệt); từ không có trong danh sách → luật im lặng.

| Mã | Bắt lỗi | Ví dụ sai → đúng | Không bắt (ví dụ) | Biện pháp giữ độ chính xác | Trừ |
|---|---|---|---|---|---|
| `te_form` | Gốc ます + て/た của động từ nhóm 1; thể て/た chia sai | 書きて → 書いて; 行きた → 行った; 寝った → 寝た; 行て → 行って; 読んて → 読んで; 読みたり → 読んだり | 食べて, して, 来て, 書き手, 休みです, 行きたい, 待て (mệnh lệnh), とても | Bảng dạng sai sinh từ bảng chia, bỏ dạng nào là từ/dạng có thật; dạng sai phải bắt đầu ở ranh giới token và không nằm trong một từ dài hơn (とても); viết kana phải có đuôi/trợ từ/dấu câu theo sau | 20 |
| `verb_form` | Động từ chia sai | 起きるます → 起きます; 聞くながら → 聞きながら; 話しないで → 話さないで; 置くないで → 置かないで; 話しれます → 話せます | 起きます, 話さないで, 書き方 | Như trên (bảng sinh tự động); chạy sau các luật tính từ, không chồng lên lỗi đã báo (きれいくない) | 20 |
| `adjective_form` | Chia tính từ sai loại | 高いじゃありません → 高くありません; 寒いでした → 寒かったです; いいじゃない → よくない; 高いな本 → 高い本; 有名の人 → 有名な人; きれいくない → きれいじゃない; 高いだ → 高い; 安いくて → 安くて; 寒いになりました → 寒くなりました; 元気くなりました → 元気になりました; 静かくて → 静かで | 静かな部屋, 高いな。, 病気の人, 元気じゃありません, 高いだろう, 高いだけ | Theo loại từ JMdict; な-adj + の chỉ khi từ không phải danh từ (病気の人 đúng); dạng sai của tính từ đuôi な tìm trực tiếp trên văn bản; 高いだ chỉ khi sau だ là hết câu, よ, ね, から, けど, し, が, と, ので | 20 |
| `polite_in_clause` | Thể ます/です trong mệnh đề | 出ます前に → 出る前に; 行きましたことがある → 行ったことがある; 晴れますでしょう → 晴れるでしょう; 来ますそうです → 来るそうです; 着きます予定 → 着く予定 | 行きますから, 寒いですが, ありますでしょうか (rất lịch sự), 合格しますように。 (lời chúc) | Chỉ trước danh từ mệnh đề trong danh sách (前, 後, こと, 時, つもり, 予定, ため, はず, ところ, 人), でしょう/だろう (không có か), そう, らしい, みたい, かもしれない, までに, ように (không ở cuối câu) | 15 |
| `wh_wa` | Từ để hỏi làm chủ ngữ + は | 誰は来ましたか → 誰が | 先生は誰ですか, これは何ですか | Chỉ trong câu hỏi (か/？ cuối câu); chỉ 誰, どなた, 何, どれ | 20 |
| `particle_kana` | Trợ từ viết theo cách đọc | 私わ → 私は; 本お読みます → 本を; 学校え行きます → 学校へ | お茶をください, お名前 | わ không phải từ; お trước động từ thể ます sau danh từ; え giữa nơi chốn và 行く/来る/帰る (ngoài ra bắt qua so theo cách viết) | 10 |
| `aru_iru` | あります/います theo người/vật | 猫があります → います; 本がいます → あります; 猫は机の下にあります → います; 子供が3人あります → います; 3人あります → います; 誰かありますか → いますか | 時間があります, パーティーがあります, お金がいります, 塩がいります, ハノイは北にあります | Chỉ với từ trong danh sách người/vật (誰, どなた là người); tên riêng không tự coi là người; người khi có さん/くん/さま/たち; trợ số từ 人/匹 không có chủ ngữ; いります (要る) không bị bắt | 20 |
| `ni_de` | に/で với nơi chốn | 図書館に勉強します → で; 部屋でいます → に; ハノイで住んでいます → に | 公園に遊びに行きます, 学校に行きます, 先生に聞きます, パーティーが学校であります, 寝る前に本を読みます, 一人で住んでいます | Chỉ với nơi chốn và động từ hành động trong danh sách; bỏ qua mục đích (遊びに行く); 前/後 có thể là thời gian nên bỏ qua; で + ある (sự kiện) không bắt (trừ câu hỏi `location` hỏi chỗ ở của vật) | 20 |
| `wrong_counter` | Trợ số từ khác loại | 鉛筆が3枚 → 3本; 学生が三つ → 三人 | この傘は500円です, りんごを三つ, 鉛筆を三つ | Chỉ danh từ có trong bảng danh từ ↔ trợ số từ; chỉ so các trợ số từ đếm vật (本 枚 冊 台 匹 人 杯 つ 個); つ chỉ sai với người, con vật | 20 |
| `missing_counter` | Số đứng ngay trước danh từ | 3鉛筆 → 鉛筆を3本 | 三りんご (りんご chưa có trong bảng: im lặng) | Chỉ danh từ có trong bảng | 20 |
| `counter_reading` | Đọc thiếu biến âm | さんほん → さんぼん; いちほん → いっぽん; きゅうがつ → くがつ; よんじ → よじ | にほん (2本), 日本, 田中さんはくにへ (さん là hậu tố), えきについたら | Bảng sinh từ quy tắc biến âm (1–100); phải trùng ranh giới token; さん sau tên/danh từ là hậu tố; không dùng cho つ | 10 |
| `missing_position` (location) | Thiếu từ chỉ vị trí | 机にいます (hỏi "dưới bàn") → 机の下に | | Chỉ trong câu hỏi `location` có vị trí | 20 |
| `position_order` (location) | Vị trí đặt trước danh từ | 下の机 → 机の下 | | Chỉ trong câu hỏi `location` (上の階, 前の日 là đúng ở chỗ khác) | 20 |

Lỗi so khớp với đáp án (`model`): `missing_word`, `extra_word` (15), `wrong_particle` (20, cần xem lại), `homophone_kanji` (5), `kana_spelling` (10), `kana_script` (5), `politeness_mix` (0, nhắc).

Chưa hỗ trợ (bộ chấm cho 0 điểm, không báo lỗi riêng): ておく nói nhanh (とく), thể khả năng bỏ ら (食べれる), thể ý chí từ gốc ます (書きよう: 書きようがない là cách nói có thật nên không thể coi là lỗi chắc chắn).

## 4. Điểm ngữ pháp N5 có luật riêng

Điểm nào không có luật đủ chính xác thì chỉ được luyện bằng bài tập đóng (chọn, điền, sắp xếp, ghép) và bài dịch so với đáp án mẫu (bộ chấm vẫn bắt thiếu/thừa/đổi trợ từ, sai dạng, sai thì so với đáp án).

| Điểm ngữ pháp (bài) | Luật riêng |
|---|---|
| wa (1), o (9), e (8) | `particle_kana` (わ/お/え) |
| ga-subject (14), wa | `wh_wa` |
| ga-aru-ga-iru (14) | `aru_iru` |
| ni-destination (8), ni-location (14), de-place (9) | `ni_de`; に = へ khi so đáp án |
| x-numbers, x-counters-basic (4), x-counters (15) | `wrong_counter`, `missing_counter`, `counter_reading`; câu hỏi `count` |
| x-position (14) | `position_order`, `missing_position`; câu hỏi `location` |
| x-i-adjective (11), ku-nai-katta-ku-nakatta, na-na-adjective (12) | `adjective_form` |
| x-te-form, te, te-kudasai, te-kara (18), te-iru (19), te-mo-ii, te-wa-ikenai (20), ta, ta-koto-ga-aru, tari-tari-suru (23) | `te_form` (て/た) |
| desu, masu… (1, 7), da, x-dictionary-form (22) | `politeness_mix` (nhắc khi trộn thể) |
| Các điểm còn lại (no, mo, ka-question, kara/made, yori, tai, mae-ni, nagara, deshou…) | Không có luật riêng: bài tập đóng + so đáp án |

## 5. Hiệu năng (đo 2026-11-16, Node 22)

- 0,71 ms mỗi câu trả lời (câu hỏi `model`, trung bình trên ~50 câu thử).
- Lần chấm đầu tiên ~550 ms: dựng từ vựng với mọi dạng chia (kể cả dạng N4: khả năng, bị động, sai khiến, ちゃう, てる…) ~390 ms, bảng số đếm kana và bảng dạng sai của luật. Trên điện thoại có thể lâu gấp vài lần, nên app dựng sẵn bộ chấm khi rảnh (xem `apps/web`).
