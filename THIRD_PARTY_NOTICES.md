# Thông báo giấy phép của bên thứ ba

Mã nguồn của dự án theo giấy phép MIT ([LICENSE](LICENSE)); một phần mã được sao chép từ dự án c-learn-write của cùng tác giả (MIT, ghi trong [docs/handoff.md](docs/handoff.md)). Nội dung khóa học do dự án tự soạn (thư mục `packages/course/data`) theo giấy phép CC BY-SA 4.0 ([packages/course/LICENSE](packages/course/LICENSE)).

Dự án dùng các thành phần sau của bên thứ ba. Văn bản giấy phép đầy đủ của các thư viện được đóng gói vào app nằm trong file `licenses.txt` của bản build (trang "Giới thiệu và giấy phép" của app).

## Thư viện chạy trong app

| Thành phần | Phiên bản | Giấy phép | Bản quyền / nguồn |
|---|---|---|---|
| preact | 10.29.8 | MIT | Copyright (c) 2015-present Jason Miller, <https://github.com/preactjs/preact> |
| @preact/signals, @preact/signals-core | 2.11.4, 1.14.x | MIT | Copyright (c) 2022-present Preact Team |
| ts-fsrs | 6.0.0 | MIT | Copyright (c) 2026 Open Spaced Repetition, <https://github.com/open-spaced-repetition/ts-fsrs> |
| @open-spaced-repetition/srs-kit | 1.0.0 | BSD-3-Clause | Copyright (c) 2026, Open Spaced Repetition contributors |
| idb | 8.0.4 | ISC | Copyright (c) 2016, Jake Archibald |
| workbox (window, core, precaching, routing, strategies) | 7.4.x | MIT | Copyright 2018 Google LLC |
| hanzi-writer | 3.7.3 | MIT | Copyright (c) 2014 David Chanin, <https://github.com/chanind/hanzi-writer> |
| wanakana | 5.3.1 | MIT | Copyright (c) 2013 WaniKani Community Github, <https://github.com/WaniKani/WanaKana> |

Văn bản đầy đủ của các giấy phép trên được build plugin `apps/web/build/licenses.ts` gom vào `licenses.txt`.

## Dữ liệu

Mỗi nguồn có bản cắt trong `packages/course/sources/<nguồn>/` kèm `SOURCE.md` (phiên bản, ngày tải, SHA-256) và văn bản giấy phép.

| Dữ liệu | Dùng để | Giấy phép | Nguồn |
|---|---|---|---|
| OpenJLPT (commit `0d1d341`) | Danh sách từ, kanji, điểm ngữ pháp N5–N4 | CC BY-SA 4.0; ghi công OpenJLPT, danh sách JLPT của Jonathan Waller (tanos.co.uk, "Creative Commons BY"), JMdict và KANJIDIC2 (EDRDG) | <https://github.com/evanclan/OpenJLPT> (`sources/openjlpt/`) |
| JMdict (EDRDG) | Cách đọc, từ loại, dạng viết của từ | CC BY-SA 4.0 + điều kiện của EDRDG (ghi công trên trang Giới thiệu, có quy trình cập nhật định kỳ) | <https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project>, giấy phép <https://www.edrdg.org/edrdg/licence.html> (`sources/jmdict/`) |
| KANJIDIC2 (EDRDG) | Âm on/kun, số nét, âm Hán Việt (đối chiếu) | Như JMdict | <https://www.edrdg.org/wiki/index.php/KANJIDIC_Project> (`sources/kanjidic2/`) |
| JmdictFurigana (bản 2.3.1+2026-10-25) | Furigana theo từng chữ của từ | CC BY-SA (như JMdict) | <https://github.com/Doublevil/JmdictFurigana> (`sources/jmdict-furigana/`) |
| hanviet-pinyin-wordlist (commit `b9923df`) | Âm Hán Việt (đối chiếu, chọn âm chính) | MIT, "Copyright (c) 2024 Phong Phan" | <https://github.com/ph0ngp/hanviet-pinyin-wordlist> (`sources/hanviet/`) |
| OpenCC `JPShinjitaiCharacters.txt` (commit `fae2a0a`) | Quy đổi kanji dạng Nhật sang phồn thể để tra Hán Việt (chỉ lúc soạn) | Apache-2.0 | <https://github.com/BYVoid/OpenCC> (`sources/opencc-jp/`) |
| AnimCJK (commit `c63765b`) | Đường viền và đường trục nét chữ để luyện viết (kana, kanji) | Arphic Public License (file `graphics*`); app kèm `ARPHICPL.TXT`, file kana đã sửa có ghi chú | <https://github.com/parsimonhi/animCJK> (`sources/animcjk/`) |
| KanjiVG (commit `610091c`) | Số nét (kiểm tra); đường trục của các nét kana được ghép | CC BY-SA 3.0, Ulrich Apel; app kèm `KANJIVG-COPYING.txt` | <https://github.com/KanjiVG/kanjivg> (`sources/kanjivg/`) |
