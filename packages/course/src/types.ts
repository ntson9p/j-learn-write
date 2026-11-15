/**
 * Course content types. Lessons are JSON files in data/lessons/<level>/; every
 * item a teacher reviews carries a `review` record.
 */
import type { CountQuestion, LocationQuestion, ModelAnswerSpec, ModelQuestion, QuestionExample } from '@j-learn-write/grader';

export type ReviewStatus = 'draft' | 'approved' | 'changes_requested';

export interface Review {
  status: ReviewStatus;
  /** Reviewer name or initials. */
  by?: string;
  /** YYYY-MM-DD. */
  date?: string;
  /** Teacher's comment. */
  note?: string;
  /**
   * Content hash at approval time (contentHash). When the item changes
   * afterwards, the approval no longer counts.
   */
  hash?: string;
}

/** Levels of the course, in learning order. */
export type LevelId = 'kana' | 'n5' | 'n4';
/** Levels that have words, kanji and grammar (data/jlpt/). */
export type JlptLevel = 'n5' | 'n4';
export type LevelStatus = 'complete' | 'in_progress' | 'planned';

/** A Japanese sentence with furigana and a Vietnamese translation. */
export interface Sentence {
  ja: string;
  /**
   * Furigana markup, e.g. "{学生|がくせい}です。": every kanji run of `ja` in
   * braces with its reading. Filled by `npm run content:fill`.
   */
  ruby?: string;
  vi: string;
}

/** data/jlpt/vocabulary.json: one word of the N5-N4 lists. */
export interface ListWord {
  /** Stable number (1-…), kept in data/jlpt/ids.lock.json. */
  no: number;
  level: JlptLevel;
  /** Entry id in OpenJLPT. */
  openjlptId: string;
  /** Entry id in JMdict, when linked. */
  jmdictId?: number;
  /** Display form: kanji when usual, otherwise kana. */
  word: string;
  /** Reading in kana. */
  reading: string;
  /** Furigana markup of the display form, e.g. "{学生|がくせい}". */
  ruby: string;
  /** Other written forms accepted in answers (kana form, other kanji…). */
  forms: string[];
  /** JMdict part-of-speech codes (n, v1, v5k, adj-i, adj-na, …). */
  pos: string[];
  /** Hán Việt reading of the kanji of the word, one syllable per kanji ("học sinh"). */
  hanViet?: string;
  /** True when a kanji of the word has several Hán Việt readings that still need a teacher's choice. */
  hanVietAmbiguous?: boolean;
}

/** data/jlpt/kanji.json: one kanji to learn. */
export interface ListKanji {
  no: number;
  char: string;
  level: JlptLevel;
  /** On readings in katakana (KANJIDIC2). */
  on: string[];
  /** Kun readings in hiragana, okurigana after "." (KANJIDIC2). */
  kun: string[];
  strokes: number;
  /** Main Hán Việt reading (lower case). */
  hanViet: string;
  /** Other Hán Việt readings. */
  hanVietOthers: string[];
  hanVietAmbiguous?: boolean;
  /** Level in the pre-2010 JLPT (4 easiest), from KANJIDIC2. */
  jlptOld?: number;
}

/** data/jlpt/grammar.json: one grammar point of the N5-N4 lists. */
export interface ListGrammar {
  /** OpenJLPT id, e.g. "wa". */
  id: string;
  no: number;
  level: JlptLevel;
  /** Pattern as listed, e.g. "〜は". */
  pattern: string;
}

export type KanaScript = 'hiragana' | 'katakana';
export type KanaKind = 'basic' | 'voiced' | 'semi-voiced' | 'small' | 'combo' | 'extended' | 'mark';

/** data/kana.json: one kana (or kana combination) taught in the kana stage. */
export interface KanaEntry {
  kana: string;
  script: KanaScript;
  kind: KanaKind;
  /** Hepburn romaji. */
  romaji: string;
  /** Number of strokes (single characters only). */
  strokes?: number;
}

/** Course content for one word of data/jlpt/vocabulary.json. */
export interface WordContent {
  no: number;
  /** Must equal the list word (checked). */
  word: string;
  /** Short Vietnamese meanings, most useful first. */
  meaningsVi: string[];
  /** Usage note: politeness, Vietnamese interference, a misleading Hán Việt reading… */
  noteVi?: string;
  examples: Sentence[];
  review: Review;
}

/** Course content for one kanji of data/jlpt/kanji.json. */
export interface KanjiContent {
  char: string;
  /** Short Vietnamese meaning of the character. */
  meaningVi: string;
  noteVi?: string;
  review: Review;
}

export interface GrammarMistake {
  wrong: string;
  right: string;
  noteVi: string;
  /** Grader issue code that catches this mistake, when there is one. */
  issue?: string;
}

/** Course content for one grammar point of data/jlpt/grammar.json. */
export interface GrammarContent {
  id: string;
  titleVi: string;
  /** One-sentence summary shown in lists. */
  summaryVi: string;
  /** Paragraphs; `**bold**` and 「Japanese」 are rendered. */
  explanationVi: string[];
  /** Sentence patterns, e.g. "N1 は N2 です". */
  patterns?: string[];
  examples: Sentence[];
  mistakes?: GrammarMistake[];
  /** Conjugated forms this point teaches (allowed in later sentences), e.g. "masu", "te". */
  forms?: string[];
  review: Review;
}

/** A kana-stage reading item: a word written in kana, with its meaning. */
export interface KanaPractice {
  ja: string;
  vi: string;
}

interface ExerciseBase {
  /** Unique across the course, e.g. "n5-01-e03". */
  id: string;
  /** Grammar points practised (ids). */
  grammar?: string[];
  review?: Review;
}

/** Pick one option. `ja` may contain ＿ for a blank. */
export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  promptVi: string;
  ja?: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  explainVi?: string;
}

/** Type (or pick) the missing word: before + answer + after. */
export interface FillExercise extends ExerciseBase {
  type: 'fill';
  promptVi?: string;
  before: string;
  after: string;
  answers: string[];
  /** When given, the learner picks among them instead of typing. */
  options?: string[];
  vi?: string;
  explainVi?: string;
}

/** Put tiles in order. */
export interface OrderExercise extends ExerciseBase {
  type: 'order';
  vi: string;
  tiles: string[];
  /** Accepted sentences (tiles joined, no punctuation). */
  answers: string[];
  explainVi?: string;
}

/** Translate a Vietnamese sentence; graded by the "model" grader. */
export interface TranslateExercise extends ExerciseBase {
  type: 'translate';
  vi: string;
  answers: (string | ModelAnswerSpec)[];
  /** Regression examples, as in grader questions. */
  examples?: QuestionExample[];
}

/** A free-answer question graded by the grader (count, location, model). */
export interface QuestionExercise extends ExerciseBase {
  type: 'question';
  question: Omit<CountQuestion, 'id' | 'lang'> | Omit<LocationQuestion, 'id' | 'lang'> | Omit<ModelQuestion, 'id' | 'lang'>;
}

/** Match the left items with the right items. */
export interface MatchExercise extends ExerciseBase {
  type: 'match';
  promptVi: string;
  pairs: [string, string][];
}

export type Exercise = ChoiceExercise | FillExercise | OrderExercise | TranslateExercise | QuestionExercise | MatchExercise;
export type ExerciseType = Exercise['type'];

/** One lesson of data/curriculum.json: what it teaches. */
export interface CurriculumLesson {
  /** "kana-01", "n5-01", "n4-12". */
  id: string;
  level: LevelId;
  order: number;
  titleVi: string;
  topicVi: string;
  /** Kana taught (kana stage). */
  kana?: string[];
  /** Word numbers (data/jlpt/vocabulary.json). */
  words?: number[];
  /** Kanji to learn (data/jlpt/kanji.json). */
  kanji?: string[];
  /** Grammar ids (data/jlpt/grammar.json). */
  grammar?: string[];
}

/** data/lessons/<level>/<NN>.json: the content of one lesson. */
export interface LessonContent {
  id: string;
  /** What the learner can do after the lesson. */
  goalsVi: string[];
  /** Kana-stage reading practice. */
  practice?: KanaPractice[];
  words?: WordContent[];
  kanji?: KanjiContent[];
  grammar?: GrammarContent[];
  exercises: Exercise[];
}

/** A curriculum lesson with its content, when written. */
export interface Lesson {
  meta: CurriculumLesson;
  content: LessonContent | null;
}

/** data/names.json: proper nouns allowed in sentences, with their reading. */
export interface NameEntry {
  ja: string;
  reading: string;
  vi: string;
}
