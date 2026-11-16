/** Feedback for learners, in Vietnamese. */

const q = (s: string) => `「${s}」`;

export const vi = {
  empty: 'Bạn chưa nhập câu trả lời.',
  latin: 'Bạn đang gõ chữ Latinh. Hãy bật bộ gõ tiếng Nhật rồi trả lời bằng kana hoặc kanji.',
  notJapanese: 'Hãy trả lời bằng tiếng Nhật.',
  perfect: 'Hoàn toàn chính xác!',

  modelCorrect: 'Câu trả lời đúng.',
  modelPartial: 'Một phần câu trả lời khớp với đáp án; phần còn lại chưa được kiểm tra nội dung.',
  modelUnmatched: 'Câu trả lời chưa khớp với đáp án nào.',
  modelClose: 'Câu trả lời gần đúng nhưng có chỗ khác đáp án làm đổi nghĩa (thì, phủ định, từ…); giáo viên sẽ xem lại.',

  wrongParticle: (written: string, expected: string) =>
    `Trợ từ: đáp án dùng ${q(expected)}, bạn dùng ${q(written)}. Nếu bạn nghĩ cả hai đều đúng, giáo viên sẽ xem lại.`,
  missingWord: (word: string) => `Thiếu ${q(word)}.`,
  extraWord: (word: string) => `Thừa ${q(word)}.`,
  homophoneKanji: (written: string, expected: string) =>
    `Nhầm chữ đồng âm: ${q(written)} và ${q(expected)} đọc giống nhau nhưng là hai từ khác nhau; ở đây phải viết ${q(expected)}.`,
  kanaSpelling: (written: string, expected: string) => `Viết sai: ${q(written)} → ${q(expected)} (chú ý trường âm, âm ngắt っ, âm đục).`,
  kanaScript: (written: string, expected: string) => `Từ này viết bằng ${/[ァ-ヺ]/.test(expected) ? 'katakana' : 'hiragana'}: ${q(expected)}, không viết ${q(written)}.`,
  politeness: 'Câu trả lời dùng thể thông thường trong khi đáp án dùng thể lịch sự です/ます (hoặc ngược lại). Nghĩa vẫn đúng.',

  particleKana: (written: string, right: string, sound: string) =>
    `Trợ từ đọc là "${sound}" nhưng viết là ${q(right)}, không viết ${q(written)}.`,
  teForm: (written: string, right: string) => `Thể て/た chia sai: ${q(written)} → ${q(right)}.`,
  adjectiveI: (written: string, right: string) => `Tính từ đuôi い chia sai: ${q(written)} → ${q(right)}.`,
  adjectiveNa: (written: string, right: string) => `Tính từ đuôi な: ${q(written)} → ${q(right)}.`,
  whWa: (wh: string) => `Từ để hỏi ${q(wh)} làm chủ ngữ thì đi với が, không đi với は: ${q(`${wh}が`)}.`,
  aruIru: (noun: string, right: string) =>
    right === 'います'
      ? `${q(noun)} là người hoặc con vật nên dùng います (いる), không dùng あります.`
      : `${q(noun)} là đồ vật, cây cối nên dùng あります (ある), không dùng います.`,
  niDeAction: (place: string, verb: string) => `Nơi diễn ra hành động ${q(verb)} dùng で: ${q(`${place}で`)}, không dùng に.`,
  niDeExist: (place: string, verb: string) => `Nơi tồn tại, nơi ở (${q(verb)}) dùng に: ${q(`${place}に`)}, không dùng で.`,
  wrongCounter: (noun: string, right: string, wrong: string) => `Trợ số từ: ${q(noun)} đếm bằng ${q(right)}, không đếm bằng ${q(wrong)}.`,
  missingCounter: (num: string) => `Thiếu trợ số từ sau ${q(num)}: tiếng Nhật không đặt số ngay trước danh từ (ví dụ 「りんごを三つ」, 「三人の学生」).`,
  counterReading: (written: string, right: string) => `Cách đọc số đếm có biến âm: ${q(written)} → ${q(right)}.`,

  countCorrect: 'Đúng số lượng.',
  countWrong: (claim: number) => `Số lượng chưa đúng: bạn trả lời ${claim}. Hãy đếm lại nhé.`,
  countAmbiguous: (values: readonly number[]) => `Bạn đưa ra nhiều con số khác nhau (${values.join(', ')}). Hãy chọn một con số.`,
  countNegated: 'Câu trả lời đang ở dạng phủ định (ありません/いません), nhưng câu hỏi muốn biết có bao nhiêu.',
  countNoNumber: (noun: string) => `Câu trả lời chưa nêu số lượng ${q(noun)}.`,
  countOther: (said: string, asked: string) => `Câu trả lời nói về ${q(said)}, nhưng câu hỏi hỏi về ${q(asked)}.`,
  missingCounterBare: (num: string, counter: string) => `Thiếu trợ số từ: nói ${q(num + counter)}, không nói ${q(num)} trống không.`,

  locationCorrect: 'Đúng vị trí.',
  locationWrong: (said: string) => `Vị trí chưa đúng: bạn trả lời ${q(said)}. Hãy nhìn lại hình nhé.`,
  locationAmbiguous: (said: readonly string[]) => `Bạn nêu nhiều nơi khác nhau (${said.map(q).join(', ')}). Hãy chọn một.`,
  locationNegated: 'Câu trả lời đang ở dạng phủ định, nhưng câu hỏi muốn biết ở đâu.',
  locationNone: 'Câu trả lời chưa nêu nơi chốn.',
  missingPosition: (place: string, position: string) => `Thiếu từ chỉ vị trí: nói ${q(`${place}の${position}`)} (ở ${position} của ${place}), không nói ${q(place)} trống không.`,
  positionOrder: (wrong: string, right: string) =>
    `Vị trí đứng sau danh từ, nối bằng の: ${q(right)}, không nói ${q(wrong)} như thứ tự tiếng Việt "trên bàn".`,
};
