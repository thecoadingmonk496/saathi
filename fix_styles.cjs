const fs = require('fs');
const glob = require('glob');

const filesToFix = glob.sync('src/pages/*Discovery.jsx').concat(glob.sync('src/pages/*Orders.jsx'));

filesToFix.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  // Headers
  content = content.replace(/text-2xl font-bold text-gray-800 tracking-tight/g, 'text-3xl sm:text-4xl font-extrabold text-[var(--saathi-primary)] tracking-tight');
  
  // Subtitles
  content = content.replace(/text-sm text-gray-500 font-medium mt-1/g, 'text-base font-semibold text-[var(--saathi-text-secondary)] mt-1.5');
  
  // Icons Backgrounds
  content = content.replace(/bg-gradient-to-br from-emerald-400 to-green-600/g, 'bg-[var(--saathi-primary)]');
  content = content.replace(/shadow-emerald-500\/20/g, 'shadow-md');
  
  // Buttons
  content = content.replace(/bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700/g, 'bg-[var(--saathi-primary)] hover:bg-[var(--saathi-primary-hover)]');
  
  // Focus rings
  content = content.replace(/focus:ring-emerald-500\/20 focus:border-emerald-500/g, 'focus:border-[var(--saathi-primary)]');
  
  // Success Messages
  content = content.replace(/bg-emerald-50 border-emerald-100 text-emerald-700/g, 'bg-green-50 border-green-200 text-green-800');
  
  // Text links/buttons
  content = content.replace(/text-emerald-600 hover:text-emerald-700/g, 'text-[var(--saathi-primary)] hover:opacity-80');
  
  // Subheaders (h2, h3)
  content = content.replace(/text-xl font-bold text-gray-800/g, 'text-2xl font-extrabold text-[var(--saathi-text)] tracking-tight');
  content = content.replace(/text-lg font-bold text-gray-800/g, 'text-xl font-extrabold text-[var(--saathi-text)] tracking-tight');
  content = content.replace(/text-gray-800/g, 'text-[var(--saathi-text)]');
  content = content.replace(/text-gray-700/g, 'text-[var(--saathi-text-secondary)]');
  content = content.replace(/text-gray-600/g, 'text-[var(--saathi-text-secondary)]');
  content = content.replace(/text-gray-500/g, 'text-[var(--saathi-text-muted)]');
  
  // Loading Text
  content = content.replace(/text-emerald-600/g, 'text-[var(--saathi-primary)]');

  fs.writeFileSync(file, content);
  console.log('Fixed styles in', file);
});
