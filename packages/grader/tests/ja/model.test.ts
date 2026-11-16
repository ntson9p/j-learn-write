import { describe, expect, it } from 'vitest';
import type { ModelQuestion } from '../../src/core/types';
import { gradeJaModel } from '../../src/lang/ja/model';

const q = (...answers: string[]): ModelQuestion => ({ id: 't', lang: 'ja', type: 'model', prompt: 'x', answers });
const grade = (answer: string, ...answers: string[]) => {
  const r = gradeJaModel(q(...answers), answer);
  return { score: r.score, status: r.content.status, review: r.needsReview, codes: r.issues.map((i) => i.code) };
};

describe('model answers', () => {
  it('accepts the model answer, in kanji or in kana, with or without punctuation', () => {
    for (const a of ['私は学生です。', 'わたしはがくせいです', '私はがくせいです！', ' 私は 学生です ']) expect(grade(a, '私は学生です。'), a).toMatchObject({ score: 100, status: 'correct' });
    expect(grade('僕はご飯を食べます', '[私|僕]は[パン|ご飯]を食べます。').score).toBe(100);
    expect(grade('学生です', '(私は)学生です。').score).toBe(100);
  });

  it('does not grade romaji, and says why', () => {
    const r = gradeJaModel(q('私は学生です。'), 'watashi wa gakusei desu');
    expect(r.content.status).toBe('no_answer');
    expect(r.content.message).toContain('bộ gõ tiếng Nhật');
  });

  it('never accepts a change of meaning: other word, tense, negation, number', () => {
    for (const a of ['私は先生です。', '私は学生ではありません。', '学校へ行きました。', '鉛筆が2本あります。']) {
      expect(grade(a, '私は学生です。', '学校へ行きます。', '鉛筆が3本あります。'), a).toMatchObject({ score: 0, status: 'unmatched' });
    }
    // One meaning-changing difference: a teacher looks at it.
    expect(grade('学校へ行きました。', '学校へ行きます。').review).toBe(true);
  });

  it('tolerates small mistakes with a penalty', () => {
    expect(grade('わたしわがくせいです', '私は学生です。')).toMatchObject({ score: 90, codes: ['particle_kana'] });
    expect(grade('がっこうえいきます', '学校へ行きます。')).toMatchObject({ score: 90, codes: ['particle_kana'] });
    expect(grade('がこうへいきます', '学校へ行きます。')).toMatchObject({ score: 90, codes: ['kana_spelling'] });
    expect(grade('飴が降ります。', '雨が降ります。')).toMatchObject({ score: 95, codes: ['homophone_kanji'] });
    expect(grade('こーひーをのみます', 'コーヒーを飲みます。')).toMatchObject({ score: 95, codes: ['kana_script'] });
    expect(grade('私は学生だ。', '私は学生です。')).toMatchObject({ score: 100, codes: ['politeness_mix'] });
    expect(grade('私が学生です。', '私は学生です。')).toMatchObject({ score: 80, codes: ['wrong_particle'], review: true });
  });

  it('accepts に for へ before a verb of movement', () => {
    expect(grade('学校に行きます。', '学校へ行きます。').score).toBe(100);
    expect(grade('学校へ行きます。', '学校に行きます。').score).toBe(100);
  });

  it("grades through the rules' fixes", () => {
    expect(grade('図書館に勉強します。', '図書館で勉強します。')).toMatchObject({ score: 80, codes: ['ni_de'] });
    expect(grade('ここに書きてください。', 'ここに書いてください。')).toMatchObject({ score: 80, codes: ['te_form'] });
    expect(grade('誰は来ましたか。', '誰が来ましたか。')).toMatchObject({ score: 80, codes: ['wh_wa'] });
  });

  it('accepts an answer with an extra sentence, for a teacher to check', () => {
    expect(grade('コーヒーを飲みます。そしてパンを食べます。', 'コーヒーを飲みます。')).toMatchObject({ score: 100, status: 'correct', review: true });
  });
});
