# Nguồn: KanjiVG (số nét)

- <https://github.com/KanjiVG/kanjivg> tại commit `610091ce618cf757ed1357a8954cd65283e015d6`, giấy phép CC BY-SA 3.0, tác giả Ulrich Apel (file `COPYING`).
- `stroke-counts.json`: **số nét** (số thẻ `<path>` trong file SVG) của 177 kana và các kanji cần học, để kiểm tra dữ liệu nét của AnimCJK.
- `kana-paths.json`: **đường trục từng nét** (thuộc tính `d` của các `<path>`) của 177 kana. App dùng chúng (đổi sang hệ tọa độ của hanzi-writer) làm đường trục để chấm nét khi luyện viết kana, vì đường trục của các đoạn tách trong AnimCJK chỉ dành cho hoạt hình. Đây là dữ liệu phái sinh của KanjiVG: ghi công và theo giấy phép CC BY-SA 3.0.
