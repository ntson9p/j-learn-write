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

  it('accepts names written in kana', () => {
    expect(grade('たなかさんはせんせいです', '田中さんは先生です。').score).toBe(100);
  });

  it('accepts the model answer written in kana even where the tokenizer would cut it wrongly', () => {
    for (const [a, m] of [
      ['わたしはいしゃです', '私は医者です。'],
      ['きのう、デパートでにくやさかななどをかいました。', '昨日、デパートで肉や魚などを買いました。'],
      ['しろいくつがほしいです', '白い靴が欲しいです。'],
      ['はこのなかにあります', '箱の中にあります。'],
      ['学校の食堂で昼ごはんを食べます。', '学校の食堂で昼ご飯を食べます。'],
      ['わたしはベトナムじんです', '私はベトナム人です。'],
      ['この時計は8,600円です。', 'この時計は8600円です。'],
    ]) expect(grade(a!, m!), a).toMatchObject({ score: 100 });
  });

  it('finds particles written as they sound and katakana words in hiragana, also in mixed answers', () => {
    expect(grade('京都わきれいな町です。', '京都はきれいな町です。')).toMatchObject({ score: 90, codes: ['particle_kana'] });
    expect(grade('来週、飛行機でハノイえ帰ります。', '来週、飛行機でハノイへ帰ります。')).toMatchObject({ score: 90, codes: ['particle_kana'] });
    expect(grade('ミンさんはせんせいでわありません', 'ミンさんは先生ではありません。')).toMatchObject({ score: 90, codes: ['particle_kana'] });
    expect(grade('しゅくだいおします', '宿題をします。')).toMatchObject({ score: 90, codes: ['particle_kana'] });
    expect(grade('ぱんとたまごをたべました', 'パンと卵を食べました。')).toMatchObject({ score: 95, codes: ['kana_script'] });
    expect(grade('てれびをみます', 'テレビを見ます。')).toMatchObject({ score: 95, codes: ['kana_script'] });
    // A counter read without its sound change: same quantity, reading corrected.
    expect(grade('きゅうがつよっかです', '9月4日です。')).toMatchObject({ score: 90, codes: ['counter_reading'] });
    expect(grade('じゅういちじにねました', '11時に寝ました。').score).toBe(100);
    // A decimal point is not a thousands separator.
    expect(grade('この時計は8.600円です。', 'この時計は8600円です。').score).toBe(0);
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

  it('never accepts a swap of から, まで, より, nor dropping だけ or a final の', () => {
    expect(grade('英語は日本語より難しいです。', '英語より日本語が難しいです。').score).toBe(0);
    expect(grade('郵便局は9時まで5時からです。', '郵便局は9時から5時までです。').score).toBe(0);
    expect(grade('このかばんは小さいですから、便利です。', 'このかばんは小さいですが、便利です。').score).toBe(0);
    expect(grade('切手を2枚買いました。', '切手を2枚だけ買いました。').score).toBe(0);
    expect(grade('この傘はナムさんです。', 'この傘はナムさんのです。').score).toBe(0);
    // Forgetting まで is a light slip.
    expect(grade('郵便局は9時から5時です。', '郵便局は9時から5時までです。')).toMatchObject({ score: 85, codes: ['missing_word'] });
  });

  it('accepts から and ので for a reason', () => {
    expect(grade('雨が降ったので、行きません。', '雨が降ったから、行きません。').score).toBe(100);
  });

  it('never accepts a question for a statement', () => {
    expect(grade('ここで食べてはいけませんか。', 'ここで食べてはいけません。').score).toBe(0);
    expect(grade('飲まなければなりませんか。', '飲まなければなりません。').score).toBe(0);
  });

  it('accepts the polite and plain forms of the same predicate', () => {
    expect(grade('今日の宿題はあまり難しくないです。', '今日の宿題はあまり難しくありません。').score).toBe(100);
    expect(grade('ここは静かじゃないです。', 'ここは静かではありません。').score).toBe(100);
    expect(grade('行かないです。', '行きません。').score).toBe(100);
    expect(grade('いいえ、ないです。', 'いいえ、ありません。').score).toBe(100);
    expect(grade('昨日は寒くなかったです。', '昨日は寒くありませんでした。').score).toBe(100);
    // Plain style: a remark, no penalty.
    for (const [a, m] of [['とても寒い。', 'とても寒いです。'], ['高かった。', '高かったです。'], ['ここは静かじゃない。', 'ここは静かではありません。'], ['先生じゃなかった。', '先生ではありませんでした。']]) {
      expect(grade(a!, m!), a).toMatchObject({ score: 100, codes: ['politeness_mix'] });
    }
    expect(grade('とても寒いでした。', 'とても寒かったです。').score).toBeLessThan(100);
  });

  it('accepts ている said quickly and plain questions ending in ？', () => {
    expect(grade('今、テレビを見てる。', '今、テレビを見ています。')).toMatchObject({ score: 100, codes: ['politeness_mix'] });
    expect(grade('本を読んでる。', '本を読んでいる。').score).toBe(100);
    expect(grade('まだ食べてない。', 'まだ食べていません。').score).toBe(100);
    expect(grade('行く？', '行きますか。')).toMatchObject({ score: 100, codes: ['politeness_mix'] });
    expect(grade('あれは何？', 'あれは何ですか。')).toMatchObject({ score: 100, codes: ['politeness_mix'] });
    // A statement is not the question.
    expect(grade('ある。', 'ありますか。').score).toBe(0);
  });

  it('N4: ので/のに are not swapped; てる after たがる/がる; plain invitations; casual endings', () => {
    expect(grade('一生懸命勉強したので、試験に落ちました。', '一生懸命勉強したのに、試験に落ちました。').score).toBe(0);
    expect(grade('弟は日本へ行きたがってる。', '弟は日本へ行きたがっています。').score).toBe(100);
    expect(grade('妹は犬を怖がってる。', '妹は犬を怖がっています。').score).toBe(100);
    expect(grade('お茶でも飲まない？', 'お茶でも飲みませんか。')).toMatchObject({ score: 100, codes: ['politeness_mix'] });
    expect(grade('お茶でも飲まない。', 'お茶でも飲みませんか。').score).toBe(0);
    expect(grade('踊るのが好き。', '踊るのが好きです。')).toMatchObject({ score: 100, codes: ['politeness_mix'] });
    expect(grade('明日は雪が降りますかもしれません。', '明日は雪が降るかもしれません。')).toMatchObject({ score: 85, codes: ['polite_in_clause'] });
  });

  it('ignores a final ね or よ unless the model answer ends with one', () => {
    expect(grade('食堂はあそこですよ。', '食堂はあそこです。').score).toBe(100);
    expect(grade('窓を開けないでくださいね。', '窓を開けないでください。').score).toBe(100);
    expect(grade('いい天気ですよ。', 'いい天気ですね。').score).toBeLessThan(100);
  });

  it('accepts に for へ before a verb of movement', () => {
    expect(grade('学校に行きます。', '学校へ行きます。').score).toBe(100);
    expect(grade('学校へ行きます。', '学校に行きます。').score).toBe(100);
    // Purpose after a verb stem takes に only.
    expect(grade('郵便局へ切手を買いへ行きます。', '郵便局へ切手を買いに行きます。').score).toBeLessThan(100);
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
