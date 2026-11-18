import { describe, expect, it } from 'vitest';
import { loadCourseData } from '../scripts/lib/course-files';
import { parseCsv, parseCsvObjects, toCsv } from '../src/csv';
import { contentHash } from '../src/hash';
import { effectiveStatus } from '../src/review';
import { applyReviewRows, buildReviewRows, REVIEW_HEADER } from '../src/review-sheet';
import type { CurriculumLesson, LessonContent } from '../src/types';

const data = loadCourseData(['none']);
const no = (word: string, reading?: string) => data.vocabulary.find((w) => w.word === word && (!reading || w.reading === reading))!.no;
const meta: CurriculumLesson = { id: 'n5-01', level: 'n5', order: 1, titleVi: 'Chào hỏi', topicVi: 'Giới thiệu', words: [no('私', 'わたし'), no('学生'), no('先生')], kanji: ['学'], grammar: ['wa'] };
const src = { ...data, curriculum: [meta] };
const draft = { status: 'draft' as const };

const fresh = (): LessonContent => ({
  id: 'n5-01',
  goalsVi: ['Giới thiệu bản thân'],
  words: [
    { no: no('私', 'わたし'), word: '私', meaningsVi: ['tôi'], examples: [{ ja: '私は学生です。', vi: 'Tôi là học sinh.' }], review: draft },
    { no: no('学生'), word: '学生', meaningsVi: ['học sinh', 'sinh viên'], examples: [{ ja: '私は学生です。', vi: 'Tôi là học sinh.' }], review: draft },
    { no: no('先生'), word: '先生', meaningsVi: ['giáo viên'], noteVi: 'Không dùng cho bản thân.', examples: [{ ja: '先生です。', vi: 'Là giáo viên.' }], review: draft },
  ],
  kanji: [{ char: '学', meaningVi: 'học', review: draft }],
  grammar: [{ id: 'wa', titleVi: 'Trợ từ は', summaryVi: 'Đánh dấu chủ đề.', explanationVi: ['…'], examples: [{ ja: '私は学生です。', vi: 'Tôi là học sinh.' }], review: draft }],
  exercises: [{ id: 'n5-01-e01', type: 'choice', promptVi: 'Chọn trợ từ', ja: '私＿学生です。', options: ['は', 'を'], answer: 0 }],
  ruby: { '私は学生です。': '{私|わたし}は{学|がく}{生|せい}です。', '先生です。': '{先|せん}{生|せい}です。' },
});

function roundTrip(content: LessonContent, edit: (rows: string[][]) => void): Record<string, string>[] {
  const rows = buildReviewRows([content], src);
  edit(rows);
  return parseCsvObjects(toCsv(rows, true));
}
const col = (name: (typeof REVIEW_HEADER)[number]) => REVIEW_HEADER.indexOf(name);

describe('review spreadsheet', () => {
  it('exports and reviews the practice words of a kana lesson', () => {
    const kana: LessonContent = { id: 'kana-01', goalsVi: ['g'], practice: [{ ja: 'あき', vi: 'mùa thu' }], exercises: [] };
    const kanaSrc = { ...src, curriculum: [{ id: 'kana-01', level: 'kana' as const, order: 1, titleVi: 'Hàng あ', topicVi: 't', kana: ['あ'] }] };
    const rows = buildReviewRows([kana], kanaSrc);
    expect(rows[1]!.slice(0, 4)).toEqual(['kana-01/luyen-doc/あき', 'kana-01 Hàng あ', 'Từ luyện đọc', 'あき']);
    expect(rows[1]![col('Nội dung')]).toBe('mùa thu');
    rows[1]![col('Kết quả duyệt')] = 'đạt';
    expect(applyReviewRows([kana], parseCsvObjects(toCsv(rows, true)), '2026-12-01').updated).toBe(1);
    expect(effectiveStatus(kana.practice![0]!)).toBe('approved');
  });

  it('exports one row per word, kanji, grammar point and exercise', () => {
    const c = fresh();
    const rows = buildReviewRows([c], src);
    expect(rows[0]).toEqual([...REVIEW_HEADER]);
    expect(rows).toHaveLength(1 + 3 + 1 + 1 + 1);
    expect(rows[2]!.slice(0, 6)).toEqual([`n5-01/tu/${no('学生')}`, 'n5-01 Chào hỏi', 'Từ', '学生', 'がくせい', 'học sinh']);
    expect(rows[2]![col('Ví dụ')]).toBe('私は学生です。 — わたしはがくせいです。 — Tôi là học sinh.');
    expect(rows[4]!.slice(2, 6)).toEqual(['Kanji', '学', 'on: ガク · kun: まな.ぶ', 'học']);
    expect(rows[5]![0]).toBe('n5-01/ngu-phap/wa');
    // The CSV survives a round trip unchanged (multi-line cells, quotes, BOM).
    expect(parseCsv(toCsv(rows, true))).toEqual(rows);
  });

  it('records approvals with the content hash, and changes requested with the note', () => {
    const c = fresh();
    const rows = roundTrip(c, (r) => {
      r[1]![col('Kết quả duyệt')] = 'Đạt';
      r[1]![col('Người duyệt')] = 'GV Hương';
      r[2]![col('Kết quả duyệt')] = 'cần sửa';
      r[2]![col('Góp ý')] = 'Thêm nghĩa "sinh viên đại học".';
    });
    expect(applyReviewRows([c], rows, '2026-12-01')).toEqual({ updated: 2, errors: [] });
    expect(c.words![0]!.review).toEqual({ status: 'approved', date: '2026-12-01', hash: contentHash(c.words![0]!), by: 'GV Hương' });
    expect(effectiveStatus(c.words![0]!)).toBe('approved');
    expect(c.words![1]!.review).toEqual({ status: 'changes_requested', date: '2026-12-01', note: 'Thêm nghĩa "sinh viên đại học".' });
    c.words![0]!.meaningsVi.push('mình');
    expect(effectiveStatus(c.words![0]!)).toBe('draft');
  });

  it('refuses unknown verdicts, unknown rows and content changed since the export, writing nothing', () => {
    const c = fresh();
    const rows = roundTrip(c, (r) => {
      r[1]![col('Kết quả duyệt')] = 'được';
      r[3]![col('Kết quả duyệt')] = 'đạt';
      r[4]![col('Kết quả duyệt')] = 'cần sửa';
      r.push([...r[5]!.slice(0, 9), 'đạt', '', '', '']);
      r[r.length - 1]![0] = 'n5-01/tu/9999';
    });
    c.words![2]!.meaningsVi = ['thầy giáo'];
    const result = applyReviewRows([c], rows, '2026-12-01');
    expect(result.updated).toBe(0);
    expect(result.errors).toEqual([
      'dòng 2: "Kết quả duyệt" phải là "đạt" hoặc "cần sửa", không phải "được"',
      `dòng 4: nội dung của "n5-01/tu/${no('先生')}" đã thay đổi sau khi xuất bảng tính; hãy xuất lại và duyệt lại mục này`,
      'dòng 5: "cần sửa" cần có góp ý',
      `dòng ${rows.length + 1}: không tìm thấy mục "n5-01/tu/9999"`,
    ]);
    expect(c.words![0]!.review).toEqual({ status: 'draft' });
  });
});
