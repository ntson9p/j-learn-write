import { courseLexicon } from '@j-learn-write/grader';
import { describe, expect, it } from 'vitest';
import { kanjiReadingsMap, loadCourseData } from '../scripts/lib/course-files';
import type { CurriculumLesson, LessonContent } from '../src/types';
import { canBuild, validateCourse, type CourseData } from '../src/validate';

const base = loadCourseData(['none']);
const readings = kanjiReadingsMap();
const tools = { lexicon: courseLexicon(base.names), kanjiReadings: (c: string) => readings.get(c) };
const no = (word: string, reading?: string) => base.vocabulary.find((w) => w.word === word && (!reading || w.reading === reading))!.no;
const draft = { status: 'draft' as const };

const lesson1: CurriculumLesson = {
  id: 'n5-01',
  level: 'n5',
  order: 1,
  titleVi: 'Chào hỏi',
  topicVi: 'Giới thiệu',
  words: [no('私', 'わたし'), no('学生'), no('食べる'), no('パン')],
  grammar: ['wa', 'desu'],
};

function course(content: Partial<LessonContent>, curriculum: CurriculumLesson[] = [lesson1]): CourseData {
  const lesson: LessonContent = {
    id: 'n5-01',
    goalsVi: ['Giới thiệu bản thân'],
    words: (curriculum[0]!.words ?? []).map((n) => ({
      no: n,
      word: base.vocabulary.find((w) => w.no === n)!.word,
      meaningsVi: ['x'],
      examples: [{ ja: '私は学生です。', vi: 'Tôi là học sinh.' }],
      review: draft,
    })),
    grammar: (curriculum[0]!.grammar ?? []).map((id) => ({ id, titleVi: 't', summaryVi: 's', explanationVi: ['e'], examples: [{ ja: '私は学生です。', vi: 'v' }], review: draft })),
    exercises: [],
    ruby: { '私は学生です。': '{私|わたし}は{学|がく}{生|せい}です。' },
    ...content,
  };
  return { ...base, levels: { kana: 'planned', n5: 'planned', n4: 'planned' }, curriculum, lessons: [lesson] };
}

const only = (errors: string[], pattern: RegExp) => errors.filter((e) => pattern.test(e));

describe('validateCourse', () => {
  it('accepts a correct lesson, except examples that do not use their word', () => {
    const errors = validateCourse(course({}), tools);
    expect(only(errors, /should use/).length).toBe(2); // 食べる, パン: the shared example does not use them
    expect(errors.filter((e) => !/should use/.test(e))).toEqual([]);
  });

  it('checks that kana lessons use taught kana only, small kana included', () => {
    const kanaLessons = base.curriculum.filter((l) => l.level === 'kana');
    const kana02: LessonContent = { id: 'kana-02', goalsVi: ['g'], practice: [{ ja: 'おちゃ', vi: 'trà' }, { ja: 'すし', vi: 'sushi' }], exercises: [] };
    const errors = validateCourse({ ...base, levels: { kana: 'planned', n5: 'planned', n4: 'planned' }, curriculum: kanaLessons, lessons: [kana02] }, tools);
    expect(errors).toEqual(['kana-02 practice おちゃ: kana not taught yet: ゃ in 「おちゃ」']);
  });

  it('allows a particle or copula only once its grammar point is taught', () => {
    const sentence = '私が学生です。';
    const errors = validateCourse(course({ grammar: [{ id: 'wa', titleVi: 't', summaryVi: 's', explanationVi: ['e'], examples: [{ ja: sentence, vi: 'v' }], review: draft }, { id: 'desu', titleVi: 't', summaryVi: 's', explanationVi: ['e'], examples: [{ ja: '私は学生ではありません。', vi: 'v' }], review: draft }], ruby: { '私は学生です。': '{私|わたし}は{学|がく}{生|せい}です。', [sentence]: '{私|わたし}が{学|がく}{生|せい}です。', '私は学生ではありません。': '{私|わたし}は{学|がく}{生|せい}ではありません。' } }), tools);
    expect(only(errors, /「が」 needs grammar ga-subject or/)).toHaveLength(1);
    // ではありません is one unit (not ある + ません, taught later); it needs de-wa-arimasen-ja-nai.
    expect(only(errors, /ではありません/)).toEqual([expect.stringContaining('「ではありません」 needs grammar de-wa-arimasen-ja-nai')]);
  });

  it('accepts いけません and こと of the grammar points that teach them, and dictionary furigana of single kanji', () => {
    const lesson: CurriculumLesson = { ...lesson1, words: [no('パン'), no('食べる'), no('字引'), no('ある')], grammar: ['wa', 'o', 'x-te-form', 'te-wa-ikenai', 'ta', 'ta-koto-ga-aru', 'ga-aru-ga-iru', 'masu'] };
    const s1 = 'パンを食べてはいけません。';
    const s2 = 'パンを食べたことがあります。';
    const s3 = '字引です。';
    const ex = (ja: string) => [{ ja, vi: 'v' }];
    const content: Partial<LessonContent> = {
      words: [
        { no: no('パン'), word: 'パン', meaningsVi: ['x'], examples: ex(s1), review: draft },
        { no: no('食べる'), word: '食べる', meaningsVi: ['x'], examples: ex(s2), review: draft },
        { no: no('字引'), word: '字引', meaningsVi: ['x'], examples: ex(s3), review: draft },
        { no: no('ある'), word: 'ある', meaningsVi: ['x'], examples: ex(s2), review: draft },
      ],
      grammar: lesson.grammar!.map((id) => ({ id, titleVi: 't', summaryVi: 's', explanationVi: ['e'], examples: ex(s1), review: draft })),
      ruby: { [s1]: 'パンを{食|た}べてはいけません。', [s2]: 'パンを{食|た}べたことがあります。', [s3]: '{字|じ}{引|びき}です。' },
    };
    const errors = validateCourse(course(content, [lesson]), tools).filter((e) => !/desu|です/.test(e));
    expect(errors).toEqual([]);
  });

  it('checks the curriculum', () => {
    const errors = validateCourse(course({}, [{ ...lesson1, id: 'n5-1', words: [...lesson1.words!, no('学生')] }]), tools);
    expect(errors).toContain('n5-1: id must be <level>-<order, 2 digits>');
    expect(errors.some((e) => e.includes('is already taught in'))).toBe(true);
  });

  it('reports words taught later and forms whose grammar is not taught yet', () => {
    const sentence = '私は先生です。';
    const ex = [{ ja: sentence, vi: 'v' }];
    const errors = validateCourse(course({ grammar: [{ id: 'wa', titleVi: 't', summaryVi: 's', explanationVi: ['e'], examples: ex, review: draft }, { id: 'desu', titleVi: 't', summaryVi: 's', explanationVi: ['e'], examples: [{ ja: '私はパンを食べます。', vi: 'v' }], review: draft }], ruby: { '私は学生です。': '{私|わたし}は{学|がく}{生|せい}です。', [sentence]: '{私|わたし}は{先|せん}{生|せい}です。', '私はパンを食べます。': '{私|わたし}はパンを{食|た}べます。' } }), tools);
    expect(only(errors, /先生/)).toEqual([expect.stringContaining('「先生」 word')]);
    expect(only(errors, /食べます」 form/)).toEqual([expect.stringContaining('form masu needs grammar masu')]);
  });

  it('checks furigana', () => {
    const missing = validateCourse(course({ ruby: {} }), tools);
    expect(missing.some((e) => e.includes('missing furigana for 「私は学生です。」'))).toBe(true);
    const wrong = validateCourse(course({ ruby: { '私は学生です。': '{私|わたし}は{学生|せいと}です。' } }), tools);
    expect(wrong.some((e) => e.includes('「学生」 cannot be read 「せいと」'))).toBe(true);
    const extra = validateCourse(course({ ruby: { '私は学生です。': '{私|わたし}は{学|がく}{生|せい}です。', 'もう一つ': 'もう一つ' } }), tools);
    expect(extra.some((e) => e.includes('unused furigana entry'))).toBe(true);
  });

  it('checks order exercises', () => {
    const errors = validateCourse(course({ exercises: [{ id: 'n5-01-e01', type: 'order', vi: 'Tôi là học sinh.', tiles: ['私', 'は', '学生', 'です'], answers: ['私は学生でした'] }], ruby: { '私は学生です。': '{私|わたし}は{学|がく}{生|せい}です。', 私: '{私|わたし}', 学生: '{学|がく}{生|せい}', は: 'は', です: 'です', 私は学生でした: '{私|わたし}は{学|がく}{生|せい}でした' } }), tools);
    expect(errors.some((e) => e.includes('cannot be built from the tiles'))).toBe(true);
  });
});

describe('canBuild', () => {
  it('uses every tile once', () => {
    expect(canBuild('私は学生です', ['です', '私', 'は', '学生'])).toBe(true);
    expect(canBuild('私は学生', ['です', '私', 'は', '学生'])).toBe(false);
    expect(canBuild('私は私', ['私', 'は'])).toBe(false);
  });
});
