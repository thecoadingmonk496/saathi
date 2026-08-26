const fs = require('fs');
const glob = require('glob');

const allJsxFiles = glob.sync('src/**/*.jsx');

allJsxFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  const replacements = {
    'text-gray-900': 'text-[var(--saathi-text)]',
    'text-slate-900': 'text-[var(--saathi-text)]',
    'text-gray-800': 'text-[var(--saathi-text)]',
    'text-slate-800': 'text-[var(--saathi-text)]',
    'text-gray-700': 'text-[var(--saathi-text-secondary)]',
    'text-slate-700': 'text-[var(--saathi-text-secondary)]',
    'text-gray-600': 'text-[var(--saathi-text-secondary)]',
    'text-slate-600': 'text-[var(--saathi-text-secondary)]',
    'text-gray-500': 'text-[var(--saathi-text-muted)]',
    'text-slate-500': 'text-[var(--saathi-text-muted)]',
    'bg-gray-50': 'bg-[var(--saathi-surface-alt)]',
    'bg-slate-50': 'bg-[var(--saathi-surface-alt)]',
    'border-gray-200': 'border-[var(--saathi-border-light)]',
    'border-slate-200': 'border-[var(--saathi-border-light)]',
    'border-gray-300': 'border-[var(--saathi-border)]',
    'border-slate-300': 'border-[var(--saathi-border)]',
  };

  let changed = false;
  for (const [search, replace] of Object.entries(replacements)) {
    // Only replace whole words (class names)
    const regex = new RegExp(`\\b${search}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Standardized colors in', file);
  }
});
