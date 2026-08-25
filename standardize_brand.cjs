const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.jsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Buttons and solid backgrounds
  content = content.replace(/bg-emerald-500/g, 'bg-[var(--saathi-primary)]');
  content = content.replace(/bg-emerald-600/g, 'bg-[var(--saathi-primary)]');
  content = content.replace(/bg-green-500/g, 'bg-[var(--saathi-primary)]');
  content = content.replace(/bg-green-600/g, 'bg-[var(--saathi-primary)]');
  
  content = content.replace(/hover:bg-emerald-600/g, 'hover:bg-[var(--saathi-primary-hover)]');
  content = content.replace(/hover:bg-emerald-700/g, 'hover:bg-[var(--saathi-primary-hover)]');
  content = content.replace(/hover:bg-green-600/g, 'hover:bg-[var(--saathi-primary-hover)]');
  content = content.replace(/hover:bg-green-700/g, 'hover:bg-[var(--saathi-primary-hover)]');

  // Gradients to solid
  content = content.replace(/bg-gradient-to-[a-z]+ from-emerald-[0-9]+ to-green-[0-9]+/g, 'bg-[var(--saathi-primary)]');
  content = content.replace(/bg-gradient-to-[a-z]+ from-emerald-[0-9]+ to-emerald-[0-9]+/g, 'bg-[var(--saathi-primary)]');

  // Text colors
  content = content.replace(/text-emerald-500/g, 'text-[var(--saathi-primary)]');
  content = content.replace(/text-emerald-600/g, 'text-[var(--saathi-primary)]');
  content = content.replace(/text-emerald-700/g, 'text-[var(--saathi-primary)]');
  content = content.replace(/text-green-500/g, 'text-[var(--saathi-primary)]');
  content = content.replace(/text-green-600/g, 'text-[var(--saathi-primary)]');
  content = content.replace(/text-green-700/g, 'text-[var(--saathi-primary)]');

  content = content.replace(/hover:text-emerald-600/g, 'hover:text-[var(--saathi-primary-hover)]');
  content = content.replace(/hover:text-emerald-700/g, 'hover:text-[var(--saathi-primary-hover)]');
  content = content.replace(/hover:text-green-600/g, 'hover:text-[var(--saathi-primary-hover)]');
  content = content.replace(/hover:text-green-700/g, 'hover:text-[var(--saathi-primary-hover)]');

  // Borders and Rings
  content = content.replace(/border-emerald-500/g, 'border-[var(--saathi-primary)]');
  content = content.replace(/border-emerald-600/g, 'border-[var(--saathi-primary)]');
  content = content.replace(/border-green-500/g, 'border-[var(--saathi-primary)]');
  
  content = content.replace(/ring-emerald-500/g, 'ring-[var(--saathi-primary)]');
  content = content.replace(/focus:ring-emerald-50/g, 'focus:ring-[var(--saathi-primary)]');
  content = content.replace(/focus:border-emerald-500/g, 'focus:border-[var(--saathi-primary)]');
  
  // Shadows
  content = content.replace(/shadow-emerald-[0-9]+\/[0-9]+/g, 'shadow-md');

  // Background light (for cards, active states)
  content = content.replace(/bg-emerald-50/g, 'bg-[var(--saathi-surface-alt)]');
  content = content.replace(/bg-green-50/g, 'bg-[var(--saathi-surface-alt)]');
  content = content.replace(/hover:bg-emerald-50/g, 'hover:bg-slate-100');
  content = content.replace(/hover:bg-green-50/g, 'hover:bg-slate-100');
  
  content = content.replace(/bg-emerald-100/g, 'bg-[var(--saathi-border-light)]');
  content = content.replace(/bg-green-100/g, 'bg-[var(--saathi-border-light)]');
  content = content.replace(/hover:bg-emerald-100/g, 'hover:bg-[var(--saathi-border)]');

  // Border light (for cards)
  content = content.replace(/border-emerald-50/g, 'border-[var(--saathi-border-light)]');
  content = content.replace(/border-emerald-100/g, 'border-[var(--saathi-border-light)]');
  content = content.replace(/border-emerald-200/g, 'border-[var(--saathi-border)]');
  content = content.replace(/border-green-100/g, 'border-[var(--saathi-border-light)]');
  content = content.replace(/border-green-200/g, 'border-[var(--saathi-border)]');

  // Hardcoded values from earlier
  content = content.replace(/text-\[\#2E7D32\]/g, 'text-[var(--saathi-primary)]');
  content = content.replace(/bg-\[\#2E7D32\]/g, 'bg-[var(--saathi-primary)]');
  content = content.replace(/hover:bg-\[\#256428\]/g, 'hover:bg-[var(--saathi-primary-hover)]');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fully standardized', file);
  }
});
