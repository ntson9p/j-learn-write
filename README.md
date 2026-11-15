# Học tiếng Nhật (j-learn-write)

Web app giúp **người Việt** học tiếng Nhật từ con số 0: bảng chữ **kana**, rồi **từ vựng, kanji (kèm âm Hán Việt) và ngữ pháp** sơ cấp, tương đương **JLPT N5 và N4**. Bài tự luận được chấm bằng **luật ngôn ngữ, không dùng AI**: cùng một câu trả lời luôn cho cùng một kết quả, kèm nhận xét tiếng Việt.

> **Trạng thái:** đang xây dựng theo [docs/plan.md](docs/plan.md) (đã được chủ dự án duyệt). Tiến độ chi tiết ở [docs/handoff.md](docs/handoff.md).

Dự án dựa trên app tiếng Trung [c-learn-write](https://github.com/ntson9p/c-learn-write) của cùng tác giả: dùng lại kiến trúc, bộ máy chấm bài, công cụ duyệt nội dung và khung app.

## Chạy thử

Yêu cầu: Node.js 22.12 trở lên.

```sh
npm ci
npm run dev       # web app: mở địa chỉ Vite in ra (thêm -- --host để mở từ điện thoại cùng mạng Wi-Fi)
npm run check     # kiểm tra kiểu TypeScript + toàn bộ test
npm run build     # build web app (PWA) vào apps/web/dist
npm run e2e       # build rồi chạy test đầu-cuối bằng Playwright (Chromium)
```

## Cấu trúc

```
packages/grader/   bộ chấm câu trả lời tự luận (TypeScript thuần, không AI)
packages/course/   nội dung khóa học (JSON, CC BY-SA 4.0), bộ kiểm tra nội dung, công cụ soạn và duyệt
apps/web/          web app PWA (Preact + Vite)
docs/              plan.md (kế hoạch), handoff.md (bàn giao, tiến độ)
```

## Giấy phép

- Mã nguồn: [MIT](LICENSE).
- Nội dung khóa học do dự án soạn: [CC BY-SA 4.0](packages/course/LICENSE).
- Thư viện và dữ liệu bên thứ ba: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
