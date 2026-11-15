import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatLicenses, packageDirOf, readPackageLicense } from '../build/licenses';

describe('licenses plugin', () => {
  it('finds the package directory of bundled modules', () => {
    expect(packageDirOf('/r/node_modules/preact/dist/preact.mjs')).toBe('/r/node_modules/preact');
    expect(packageDirOf('/r/node_modules/@preact/signals/dist/x.js?v=1')).toBe('/r/node_modules/@preact/signals');
    expect(packageDirOf('/r/node_modules/a/node_modules/b/i.js')).toBe('/r/node_modules/a/node_modules/b');
    expect(packageDirOf('\0/r/node_modules/idb/build/index.js')).toBe('/r/node_modules/idb');
    expect(packageDirOf('/r/packages/grader/src/index.ts')).toBeUndefined();
  });

  it('reads license texts of an installed package', () => {
    const root = join(__dirname, '..', '..', '..', 'node_modules');
    const preact = readPackageLicense(join(root, 'preact'));
    expect(preact).toMatchObject({ name: 'preact', license: 'MIT' });
    expect(preact.texts[0]?.text).toMatch(/MIT License/);
    const text = formatLicenses([preact]);
    expect(text.startsWith('j-learn-write')).toBe(true);
    expect(text).toContain('preact@');
  });

  it('reads LICENSES/ folders', () => {
    const dir = mkdtempSync(join(tmpdir(), 'licenses-'));
    try {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0', license: 'MIT AND Apache-2.0' }));
      writeFileSync(join(dir, 'LICENSE'), 'MIT License');
      mkdirSync(join(dir, 'LICENSES'));
      writeFileSync(join(dir, 'LICENSES', 'Apache-2.0.txt'), 'Apache License');
      expect(readPackageLicense(dir).texts.map((t) => t.file)).toEqual(['LICENSE', 'LICENSES/Apache-2.0.txt']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
