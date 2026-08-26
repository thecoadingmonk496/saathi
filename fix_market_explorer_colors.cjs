const fs = require('fs');

const file = 'src/pages/MarketExplorer.jsx';
let content = fs.readFileSync(file, 'utf-8');

// The main layout background and text colors
content = content.replace(/bg-\[\#F9FAFB\]/g, 'bg-[var(--saathi-background)]');
content = content.replace(/text-\[\#111827\]/g, 'text-[var(--saathi-text)]');

// The dark green header background
content = content.replace(/bg-\[\#0C3B2E\]/g, 'bg-[var(--saathi-primary)]');

// The dark blue market engine header background
content = content.replace(/bg-\[\#1E3A8A\]/g, 'bg-[var(--saathi-primary)]');

// Button colors using blue-600 in MarketExplorer
content = content.replace(/bg-blue-600/g, 'bg-[var(--saathi-accent)]');
content = content.replace(/hover:bg-blue-700/g, 'hover:bg-[var(--saathi-accent-dark)]');
content = content.replace(/focus:ring-blue-500/g, 'focus:ring-[var(--saathi-accent)]');
content = content.replace(/focus:border-blue-500/g, 'focus:border-[var(--saathi-accent)]');

// text-blue-700 / bg-blue-50 in the "data.gov.in" badge
content = content.replace(/text-blue-700/g, 'text-[var(--saathi-accent-dark)]');
content = content.replace(/bg-blue-50/g, 'bg-red-50');
content = content.replace(/border-blue-100/g, 'border-red-100');

fs.writeFileSync(file, content);
console.log('Fixed colors in MarketExplorer.jsx');
