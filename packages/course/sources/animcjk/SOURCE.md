# Nguồn: AnimCJK (dữ liệu nét chữ)

- <https://github.com/parsimonhi/animCJK> tại commit `c63765b150cbd567c71d05cf4a4f8d00b57045c9`. Các file `graphics*` theo **Arphic Public License** (`ARPHICPL.TXT`), xem `COPYING.txt`.
- `graphicsJaKana.txt`: nguyên vẹn (177 kana; SHA-256 `3f61aee523e2cf95e76240b760234a1c6c437d4e9308dca88723178dd8bdb61c`).
- `graphicsJa.txt`: chỉ giữ 246 dòng của các kanji cần học, dòng giữ nguyên (SHA-256 file gốc `3b2d95465152fb2a7e108774219e969c43af14f1e51e66498bc96522a674cfeb`).
- Định dạng giống `graphics.txt` của Make Me a Hanzi (strokes + medians), dùng được với hanzi-writer.
- Khi build app, các đoạn nét kana bị tách (nét tự cắt) được ghép lại; file trong app ghi rõ đã sửa (yêu cầu của Arphic Public License).
