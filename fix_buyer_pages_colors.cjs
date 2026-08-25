const fs = require('fs');

const files = [
  'src/pages/BuyerRegister.jsx',
  'src/pages/BuyerStatus.jsx',
  'src/pages/BuyerUpdate.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/bg-\[\#064E3B\]/g, 'bg-[var(--saathi-primary)]');
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
