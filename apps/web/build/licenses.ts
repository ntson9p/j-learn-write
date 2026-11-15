/**
 * Build plugin: writes licenses.txt with the license texts of every npm
 * package whose code ends up in the bundle, so the app can show them on its
 * "About and licenses" page (MIT and Apache-2.0 require shipping them).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

export interface PackageLicense {
  name: string;
  version: string;
  license: string;
  /** License, notice and third-party files found in the package root. */
  texts: { file: string; text: string }[];
}

const LICENSE_FILE = /^(licen[cs]e|copying|notice|third[_-]party[_-]licen[cs]es|arphicpl)(\.(md|txt))?$/i;

/** The package directory of a module path inside node_modules, or undefined. */
export function packageDirOf(moduleId: string): string | undefined {
  const path = moduleId.replace(/\\/g, '/').replace(/^\0/, '').split('?')[0]!;
  const at = path.lastIndexOf('/node_modules/');
  if (at < 0) return undefined;
  const rest = path.slice(at + '/node_modules/'.length).split('/');
  const nameParts = rest[0]?.startsWith('@') ? rest.slice(0, 2) : rest.slice(0, 1);
  if (nameParts.length === 0 || nameParts.some((p) => !p)) return undefined;
  return path.slice(0, at + '/node_modules/'.length) + nameParts.join('/');
}

/** Reads the license information of one package directory. */
export function readPackageLicense(dir: string): PackageLicense {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
    license?: string;
  };
  const texts: PackageLicense['texts'] = [];
  for (const file of readdirSync(dir).sort()) {
    const full = join(dir, file);
    if (LICENSE_FILE.test(file) && statSync(full).isFile()) {
      texts.push({ file, text: readFileSync(full, 'utf8').trim() });
    }
  }
  // Some packages keep extra license texts in a LICENSES/ folder (opencc-js).
  const extra = join(dir, 'LICENSES');
  if (existsSync(extra) && statSync(extra).isDirectory()) {
    for (const file of readdirSync(extra).sort()) {
      texts.push({ file: `LICENSES/${file}`, text: readFileSync(join(extra, file), 'utf8').trim() });
    }
  }
  return { name: pkg.name, version: pkg.version, license: pkg.license ?? 'UNKNOWN', texts };
}

/** Formats the licenses.txt file. */
export function formatLicenses(packages: readonly PackageLicense[]): string {
  const head = [
    'j-learn-write — giấy phép',
    '',
    'Mã nguồn của ứng dụng: MIT. Nội dung khóa học do dự án soạn: CC BY-SA 4.0.',
    'Dưới đây là giấy phép của các thư viện bên thứ ba có trong bản build này.',
    '',
  ];
  const body = packages.map((p) => {
    const lines = [`${'='.repeat(72)}`, `${p.name}@${p.version} — ${p.license}`, `${'='.repeat(72)}`];
    if (p.texts.length === 0) lines.push('(Gói này không kèm file giấy phép; xem trường "license" ở trên.)');
    for (const t of p.texts) lines.push(`--- ${t.file} ---`, t.text, '');
    return lines.join('\n');
  });
  return [...head, ...body].join('\n') + '\n';
}

/**
 * `extraPackages`: packages shipped outside the Rollup bundle, such as the
 * Workbox runtime that vite-plugin-pwa writes into the service worker.
 */
export function licensesPlugin(extraPackages: readonly string[] = []): Plugin {
  const require = createRequire(import.meta.url);
  return {
    name: 'j-learn-write:licenses',
    apply: 'build',
    generateBundle(_options, bundle) {
      const dirs = new Set<string>();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const id of output.moduleIds ?? Object.keys(output.modules)) {
          const dir = packageDirOf(id);
          if (dir && existsSync(join(dir, 'package.json'))) dirs.add(dir);
        }
      }
      for (const name of extraPackages) dirs.add(dirname(require.resolve(`${name}/package.json`)));
      const packages = [...dirs]
        .map(readPackageLicense)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: formatLicenses(packages) });
    },
  };
}
