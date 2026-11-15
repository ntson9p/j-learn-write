import { useEffect, useState } from 'preact/hooks';
import type { PageProps } from '../components/lazy';
import { T } from '../strings';

export const REPO_URL = 'https://github.com/ntson9p/j-learn-write';

export interface DataSource {
  name: string;
  use: string;
  license: string;
  url: string;
}

/** Data the app is built from (also listed in THIRD_PARTY_NOTICES.md). */
export const DATA_SOURCES: DataSource[] = [
  {
    name: 'OpenJLPT',
    use: 'Danh sách từ, kanji và điểm ngữ pháp N5–N4 (cấp theo danh sách JLPT của Jonathan Waller)',
    license: 'CC BY-SA 4.0',
    url: 'https://github.com/evanclan/OpenJLPT',
  },
  {
    name: 'JMdict (Electronic Dictionary Research and Development Group)',
    use: 'Cách đọc và từ loại của từ',
    license: 'CC BY-SA 4.0, theo giấy phép của EDRDG',
    url: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
  },
  {
    name: 'KANJIDIC2 (Electronic Dictionary Research and Development Group)',
    use: 'Âm on, âm kun, số nét, âm Hán Việt (đối chiếu) của kanji',
    license: 'CC BY-SA 4.0, theo giấy phép của EDRDG',
    url: 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project',
  },
  {
    name: 'Giấy phép của EDRDG (JMdict, KANJIDIC2)',
    use: 'Văn bản giấy phép và điều kiện sử dụng',
    license: 'CC BY-SA 4.0',
    url: 'https://www.edrdg.org/edrdg/licence.html',
  },
  {
    name: 'JmdictFurigana',
    use: 'Furigana theo từng chữ của từ',
    license: 'CC BY-SA (như JMdict)',
    url: 'https://github.com/Doublevil/JmdictFurigana',
  },
  {
    name: 'hanviet-pinyin-wordlist (Phong Phan)',
    use: 'Âm Hán Việt của kanji',
    license: 'MIT',
    url: 'https://github.com/ph0ngp/hanviet-pinyin-wordlist',
  },
  {
    name: 'AnimCJK',
    use: 'Dữ liệu nét chữ để luyện viết kana và kanji (dữ liệu kana đã được ghép lại các đoạn nét)',
    license: 'Arphic Public License',
    url: 'https://github.com/parsimonhi/animCJK',
  },
  {
    name: 'KanjiVG (Ulrich Apel)',
    use: 'Đường nét của các nét kana được ghép lại, số nét để kiểm tra',
    license: 'CC BY-SA 3.0',
    url: 'https://kanjivg.tagaini.net/',
  },
];

export default function AboutPage(_props: PageProps) {
  const [licenses, setLicenses] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('./licenses.txt')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => alive && setLicenses(text.startsWith('j-learn-write') ? text : ''))
      .catch(() => alive && setLicenses(''));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section class="page about-page">
      <h1>{T.about.title}</h1>
      <p class="lead">{T.about.intro}</p>

      <div class="card">
        <h2>{T.about.principlesTitle}</h2>
        <ul>
          {T.about.principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div class="card">
        <h2>{T.about.sourcesTitle}</h2>
        <ul class="sources">
          {DATA_SOURCES.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>
              <span class="muted"> · {s.use} · {s.license}</span>
            </li>
          ))}
        </ul>
      </div>

      <div class="card">
        <h2>{T.about.licensesTitle}</h2>
        <p>{T.about.codeLicense}</p>
        <p>{T.about.contentLicense}</p>
        <p>
          {T.about.sourceCode}:{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {REPO_URL}
          </a>
        </p>
        <details>
          <summary>{T.about.thirdParty}</summary>
          {licenses === null ? <p>{T.loading}</p> : licenses ? <pre class="licenses">{licenses}</pre> : <p>{T.about.thirdPartyMissing}</p>}
        </details>
      </div>
    </section>
  );
}
