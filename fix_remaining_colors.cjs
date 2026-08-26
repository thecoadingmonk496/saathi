const fs = require('fs');

const fixFile = (file, replacements) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;
  
  for (const [search, replace] of Object.entries(replacements)) {
    content = content.replaceAll(search, replace);
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}

// AIVoiceModal
fixFile('src/components/AIVoiceModal.jsx', {
  'bg-[#15803D]': 'bg-[var(--saathi-primary)]',
  'hover:bg-[#11632f]': 'hover:bg-[var(--saathi-primary-hover)]'
});

// Login and Register
const authReplacements = {
  'bg-[#EF5350]': 'bg-[var(--saathi-accent)]',
  'hover:bg-[#B71C1C]': 'hover:bg-[var(--saathi-accent-dark)]'
};
fixFile('src/pages/Login.jsx', authReplacements);
fixFile('src/pages/Register.jsx', authReplacements);

// Profile
fixFile('src/pages/Profile.jsx', {
  'hover:bg-[#e8e2d2]': 'hover:bg-[var(--saathi-surface-alt)]',
  'border-[#d2c9b4]': 'border-[var(--saathi-border)]'
});
