import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(packageRoot, 'src');

const forbidden = [
  '@_linked/mui-base',
  '@mui/base',
  '@_linked/input',
  'react-select',
  'classnames',
  'lincd-form',
  'lincd-shacl',
  'profile-plus',
  'profile-pics',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (/\.(ts|tsx)$/.test(entry.name)) return [path];
    return [];
  });
}

function importedSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const pattern =
    /(?:from|import)\s*\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1] || match[2] || match[3];
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

describe('profile and dependency imports', () => {
  const files = sourceFiles(srcDir);
  const specifiers = files.flatMap((file) => importedSpecifiers(readFileSync(file, 'utf8')));

  it('imports people and accounts from @linked.cm/profile', () => {
    expect(specifiers.some((specifier) => specifier.startsWith('@linked.cm/profile'))).toBe(
      true
    );
  });

  it('does not import the removed UI and legacy profile packages', () => {
    const hits = specifiers.filter((specifier) =>
      forbidden.some(
        (name) => specifier === name || specifier.startsWith(`${name}/`)
      )
    );
    expect(hits).toEqual([]);
  });

  it('does not declare the removed packages', () => {
    const manifest = JSON.parse(
      readFileSync(join(packageRoot, 'package.json'), 'utf8')
    );
    const declared = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ];
    expect(
      declared.filter((name) =>
        forbidden.some((forbiddenName) => name === forbiddenName || name.startsWith(`${forbiddenName}/`))
      )
    ).toEqual([]);
  });
});
