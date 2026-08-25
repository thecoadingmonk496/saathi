const fs = require('fs');

const file = 'src/pages/BuyerDiscovery.jsx';
let content = fs.readFileSync(file, 'utf-8');

const replacements = {
  'bg-[#064E3B]': 'bg-[var(--saathi-primary)]',
  'text-[#064E3B]': 'text-[var(--saathi-primary)]',
  'text-[#2E7D32]': 'text-[var(--saathi-primary)]',
  'bg-[#2E7D32]': 'bg-[var(--saathi-primary)]',
  'hover:bg-[#256428]': 'hover:bg-[var(--saathi-primary-hover)]',
  'focus:border-[#2E7D32]': 'focus:border-[var(--saathi-primary)]',
  'hover:text-[#2E7D32]': 'hover:text-[var(--saathi-primary)]',
  'text-emerald-300': 'text-white/80',
  'text-emerald-50/90': 'text-white/90',
  'hover:bg-emerald-50': 'hover:bg-slate-50',
  'bg-emerald-50': 'bg-[var(--saathi-surface-alt)]',
  'border-emerald-100': 'border-[var(--saathi-border-light)]',
  'text-emerald-800': 'text-[var(--saathi-text-secondary)]',
  'text-emerald-900': 'text-[var(--saathi-text)]',
  'bg-green-50/50': 'bg-[var(--saathi-surface-alt)]',
  'hover:bg-green-50': 'hover:bg-[var(--saathi-border-light)]',
  'border-green-200': 'border-[var(--saathi-border-light)]',
};

for (const [search, replace] of Object.entries(replacements)) {
  content = content.replaceAll(search, replace);
}

fs.writeFileSync(file, content);
console.log('Fixed BuyerDiscovery.jsx colors');
