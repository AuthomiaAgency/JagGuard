// Convierte las traducciones de src/contexts/LanguageContext.tsx a Dart.
// Uso: node tool/extract_translations.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, '..', 'src', 'contexts', 'LanguageContext.tsx'), 'utf8');

const lines = source.split(/\r?\n/);
const langs = ['es', 'en', 'pt', 'qu', 'ay'];
const result = {};
let current = null;
const entryRe = /^\s*'((?:\\.|[^'\\])+)':\s*'((?:\\.|[^'\\])*)'\s*,?\s*$/;
const blockRe = /^\s*(es|en|pt|qu|ay):\s*\{\s*$/;

for (const line of lines) {
  const block = line.match(blockRe);
  if (block) {
    current = block[1];
    result[current] = {};
    continue;
  }
  if (current && /^\s*\}\s*,?\s*$/.test(line)) {
    current = null;
    continue;
  }
  if (!current) continue;
  const m = line.match(entryRe);
  if (m) {
    const key = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    const value = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    result[current][key] = value;
  }
}

function dartString(s) {
  return "'" + s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\$/g, '\\$')
    .replace(/\r?\n/g, '\\n') + "'";
}

const buffer = [];
buffer.push('// GENERATED FILE — generado a partir de src/contexts/LanguageContext.tsx.');
buffer.push('// No editar manualmente: volver a ejecutar `node tool/extract_translations.mjs`.');
buffer.push('');
buffer.push('abstract final class GeneratedTranslations {');
buffer.push('  static const Map<String, Map<String, String>> messages = {');
for (const lang of langs) {
  const entries = Object.entries(result[lang] ?? {});
  buffer.push(`    '${lang}': {`);
  for (const [key, value] of entries) {
    buffer.push(`      ${dartString(key)}: ${dartString(value)},`);
  }
  buffer.push('    },');
}
buffer.push('  };');
buffer.push('}');
buffer.push('');

const outPath = resolve(root, 'lib', 'core', 'l10n', 'generated_translations.dart');
writeFileSync(outPath, buffer.join('\n'), 'utf8');

const counts = langs.map((l) => `${l}=${Object.keys(result[l] ?? {}).length}`).join(' ');
console.log(`OK -> ${outPath}`);
console.log(`Entradas: ${counts}`);
