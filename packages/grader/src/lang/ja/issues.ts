import type { Fix, Issue, Severity } from '../../core/types.ts';

export type JaIssueCode =
  | 'wrong_particle'
  | 'particle_kana'
  | 'missing_word'
  | 'extra_word'
  | 'homophone_kanji'
  | 'kana_spelling'
  | 'kana_script'
  | 'politeness_mix'
  | 'polite_in_clause'
  | 'te_form'
  | 'adjective_form'
  | 'wh_wa'
  | 'aru_iru'
  | 'ni_de'
  | 'wrong_counter'
  | 'missing_counter'
  | 'counter_reading'
  | 'missing_position'
  | 'position_order';

/** Default points removed per issue; questions can override them. */
export const JA_DEFAULT_PENALTIES: Readonly<Record<JaIssueCode, number>> = {
  wrong_particle: 20,
  particle_kana: 10,
  missing_word: 15,
  extra_word: 15,
  homophone_kanji: 5,
  kana_spelling: 10,
  kana_script: 5,
  politeness_mix: 0,
  polite_in_clause: 15,
  te_form: 20,
  adjective_form: 20,
  wh_wa: 20,
  aru_iru: 20,
  ni_de: 20,
  wrong_counter: 20,
  missing_counter: 20,
  counter_reading: 10,
  missing_position: 20,
  position_order: 20,
};

export const JA_SEVERITY: Readonly<Record<JaIssueCode, Severity>> = {
  wrong_particle: 'error',
  particle_kana: 'error',
  missing_word: 'error',
  extra_word: 'error',
  homophone_kanji: 'typo',
  kana_spelling: 'typo',
  kana_script: 'typo',
  politeness_mix: 'info',
  polite_in_clause: 'error',
  te_form: 'error',
  adjective_form: 'error',
  wh_wa: 'error',
  aru_iru: 'error',
  ni_de: 'error',
  wrong_counter: 'error',
  missing_counter: 'error',
  counter_reading: 'error',
  missing_position: 'error',
  position_order: 'error',
};

/** Short Vietnamese labels, e.g. for badges in a user interface. */
export const JA_ISSUE_LABELS_VI: Readonly<Record<JaIssueCode, string>> = {
  wrong_particle: 'Sai trợ từ',
  particle_kana: 'Cách viết trợ từ',
  missing_word: 'Thiếu từ',
  extra_word: 'Thừa từ',
  homophone_kanji: 'Nhầm chữ đồng âm',
  kana_spelling: 'Viết sai kana',
  kana_script: 'Hiragana/katakana',
  politeness_mix: 'Lịch sự/thân mật',
  polite_in_clause: 'Thể ます trong mệnh đề',
  te_form: 'Thể て',
  adjective_form: 'Chia tính từ',
  wh_wa: 'Từ để hỏi + は',
  aru_iru: 'あります/います',
  ni_de: 'に/で',
  wrong_counter: 'Sai trợ số từ',
  missing_counter: 'Thiếu trợ số từ',
  counter_reading: 'Cách đọc số đếm',
  missing_position: 'Thiếu từ chỉ vị trí',
  position_order: 'Vị trí của 上/下/中…',
};

/** Builds an issue with the severity of its code and the question's penalty. */
export function jaIssue(penalties: Readonly<Record<string, number>>, code: JaIssueCode, start: number, end: number, message: string, fix?: Fix): Issue {
  const issue: Issue = { code, severity: JA_SEVERITY[code], penalty: penalties[code] ?? 0, message, start, end };
  if (fix) issue.fix = fix;
  return issue;
}
