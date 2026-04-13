const fs = require('fs');

const pth = 'd:/Projects/BeHappyTalk/app';

const replacers = [
  { from: /style="light"/g, to: 'style="dark"' },
  { from: /#21222c/gi, to: '#FFFDE7' }, // Very light happy yellow bg
  { from: /#21222d/gi, to: '#FFF9C4' }, // Light yellow header
  { from: /#2B2C3A/gi, to: '#FFFFFF' }, // Clean white cards
  { from: /#FFFFFF/gi, to: '#333333' }, // White to charcoal
  { from: /#FFF(?=[^\da-fA-F])/gi, to: '#333333' }, // #FFF to charcoal
  { from: /#CFD0D6/gi, to: '#555555' },
  { from: /#8A8A93/gi, to: '#757575' },
  { from: /#656673/gi, to: '#9E9E9E' },
  { from: /#4E4F5A/gi, to: '#E0E0E0' },
  { from: /#3A3B4A/gi, to: '#EEEEEE' },
  { from: /#FFD700/gi, to: '#FFA000' }, // Bold Amber
  { from: /#FFCA28/gi, to: '#FFC107' }, // Classic Yellow/Amber
  { from: /#1DE9B6/gi, to: '#FFA000' }, // (Just in case anything was left over)
  { from: /#00E5FF/gi, to: '#FFC107' }
];

try {
  fs.readdirSync(pth).forEach(file => {
    if (!file.endsWith('.tsx') || file === 'payment.tsx') return;
    
    const p = pth + '/' + file;
    let c = fs.readFileSync(p, 'utf-8');
    
    if (file === 'wallet.tsx') {
      c = c.replace(/backgroundColor: '#FFF'/g, "backgroundColor: 'TEMP_WHITE'");
    }
    if (file === '_layout.tsx') {
      c = c.replace(/dark: true/g, 'dark: false');
    }
    
    replacers.forEach(r => {
      c = c.replace(r.from, r.to);
    });
    
    c = c.replace(/'TEMP_WHITE'/g, "'#FFFFFF'");
    
    fs.writeFileSync(p, c);
    console.log('Processed ' + file);
  });
  console.log('Complete!');
} catch (e) {
  console.error("Failed", e);
}
