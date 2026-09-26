import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;
const localizedTextPath = path.resolve('src/components/LocalizedText.jsx');

function normalizeJsxText(value) {
  const lines = value.replace(/\r/g, '').split('\n');
  let lastNonEmpty = lines.length - 1;
  while (lastNonEmpty >= 0 && !lines[lastNonEmpty].trim()) lastNonEmpty -= 1;

  let output = '';
  lines.forEach((line, index) => {
    let text = line.replace(/\t/g, ' ');
    if (index !== 0) text = text.replace(/^ +/, '');
    if (index !== lines.length - 1) text = text.replace(/ +$/, '');
    if (!text) return;
    output += text;
    if (index !== lastNonEmpty) output += ' ';
  });
  return output;
}

function jsxTextLocalization() {
  return {
    name: 'saathi-jsx-text-localization',
    enforce: 'pre',
    transform(code, id) {
      const filePath = id.split('?')[0];
      const normalizedPath = filePath.replace(/\\/g, '/');
      if (!normalizedPath.includes('/src/') || !/\.jsx?$/.test(normalizedPath)) return null;
      if (path.resolve(filePath) === localizedTextPath) return null;

      let ast;
      try {
        ast = parse(code, { sourceType: 'unambiguous', plugins: ['jsx'] });
      } catch {
        return null;
      }

      const replacements = [];
      traverse(ast, {
        JSXText(nodePath) {
          const text = normalizeJsxText(nodePath.node.value);
          if (!text || !/[A-Za-z]/.test(text)) return;
          const replacement = `{<LocalizedText text={${JSON.stringify(text)} } />}`;
          replacements.push({ start: nodePath.node.start, end: nodePath.node.end, replacement });
        },
        JSXExpressionContainer(nodePath) {
          const expression = nodePath.node.expression;
          if (expression.type !== 'StringLiteral' || !/[A-Za-z]/.test(expression.value)) return;
          const replacement = `{<LocalizedText text={${JSON.stringify(expression.value)} } />}`;
          replacements.push({ start: nodePath.node.start, end: nodePath.node.end, replacement });
        },
      });

      if (!replacements.length) return null;

      let transformed = code;
      replacements.sort((a, b) => b.start - a.start).forEach(({ start, end, replacement }) => {
        transformed = `${transformed.slice(0, start)}${replacement}${transformed.slice(end)}`;
      });

      const relativeImport = path.relative(path.dirname(filePath), localizedTextPath).replace(/\\/g, '/');
      const importPath = relativeImport.startsWith('.') ? relativeImport : `./${relativeImport}`;
      transformed = `import LocalizedText from ${JSON.stringify(importPath)};\n${transformed}`;
      return { code: transformed, map: null };
    },
  };
}

export default jsxTextLocalization;
