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

Văn bản đầy đủ của các giấy phép trên được build plugin `apps/web/build/licenses.ts` gom vào `licenses.txt`.

## Dữ liệu

Các nguồn dữ liệu (OpenJLPT, JMdict, KANJIDIC2, JmdictFurigana, âm Hán Việt, AnimCJK…) sẽ được ghi ở đây khi được đưa vào repo (giai đoạn 3 của [docs/plan.md](docs/plan.md)).
