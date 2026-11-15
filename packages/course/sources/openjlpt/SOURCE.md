# Nguồn: OpenJLPT (danh sách N5–N4)

- <https://github.com/evanclan/OpenJLPT> tại commit `0d1d3410bec90bd4098a7c72de820543cb4f707c`, giấy phép **CC BY-SA 4.0** (file `LICENSE`), ghi công theo `NOTICE.md` (bên cạnh).
- OpenJLPT lấy cấp N5–N1 của từ và kanji từ danh sách JLPT của Jonathan Waller (tanos.co.uk, "Creative Commons BY"); cách đọc, từ loại và id được nối với JMdict (EDRDG). Danh sách ngữ pháp do OpenJLPT tự lập theo các sách luyện thi.
- JLPT **không** công bố danh sách chính thức (FAQ của jlpt.jp): các cấp này chỉ là ước lượng.
- Ở đây chỉ giữ cấp N5 và N4. Từ: id, cấp, từ, cách đọc, từ loại, id JMdict, nghĩa tiếng Anh (chỉ để tham khảo khi soạn, không hiện trong app). Kanji: chữ, cấp, cờ "bổ sung". Ngữ pháp: id, cấp, mẫu, nghĩa tiếng Anh. **Không** giữ câu ví dụ (lấy từ Tatoeba) và phần giải thích ngữ pháp.
- Tạo lại bằng `npm run sources:fetch -w @j-learn-write/course`.

SHA-256 của các file gốc:

| File | SHA-256 |
|---|---|
| `data/json/vocab/n5.json` | `cbb221c9a3a92108fcd02fb088d9afacc70bc8c96570d5730425de0a49dad5f3` |
| `data/json/kanji/n5.json` | `c81458831e5e2e807ce0bb81a5af971d493ac8a9243701005eb57fe353990fce` |
| `data/json/grammar/n5.json` | `fb8151594263f5e98372adc51d4498578bc198e22259b161fba524eea2faa0bd` |
| `data/json/vocab/n4.json` | `b38512a6dc1e06a3615f377b3e58184c4a85b6f769c2e3f58f2a4ef0e1810927` |
| `data/json/kanji/n4.json` | `a034d51bea0ee6c9ee1cc48b1cc83d9602641b9f5d38d99a55f5136f447a58d8` |
| `data/json/grammar/n4.json` | `7b388b8636ab7d9eaed02484d7d6be1c2468885f2354e28c02a29c2dfeb8d70d` |
