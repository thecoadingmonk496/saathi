const fs = require('fs');
const glob = require('glob');

const files = [
  'src/pages/BuyerDiscovery.jsx',
  'src/pages/BuyerOrders.jsx',
  'src/pages/MarketExplorer.jsx',
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/http:\/\/localhost:5001/g, '${API_BASE}');
  
  if (content.includes('${API_BASE}') && !content.includes('const API_BASE =')) {
    const apiBaseImport = `const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\\/$/, '') + '/api';\n\n`;
    content = apiBaseImport + content;
  }
  
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
