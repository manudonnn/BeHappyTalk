const fs = require('fs');
const pth = 'd:/Projects/BeHappyTalk/app';

const replacers = [
  { from: /style="dark"/g, to: 'style="light"' },
  // Map light yellow backgrounds to premium Dark Blue
  { from: /#FFFDE7/gi, to: '#0B1021' }, // Deep Midnight Blue
  { from: /#FFF9C4/gi, to: '#10182B' }, // Appbar Navy
  { from: /#FFFFFF/gi, to: '#151E32' }, // Surface/Card Navy
  // Map charcoal text back to pure White
  { from: /#333333/gi, to: '#FFFFFF' }, 
  // Map greys to cool blue-tinted greys for dark theme
  { from: /#555555/gi, to: '#D3D8E8' }, 
  { from: /#757575/gi, to: '#8B95A5' }, 
  { from: /#9E9E9E/gi, to: '#6B7B8C' },
  // Map borders to deeper blues
  { from: /#E0E0E0/gi, to: '#1E2A44' }, 
  { from: /#EEEEEE/gi, to: '#16284C' }
  // We DO NOT match or replace the yellow colours (#FFA000, #FFC107) 
  // so they remain exactly as they are currently!
];

try {
  fs.readdirSync(pth).forEach(file => {
    // Skip payment.tsx since it's an external webview mock with a locked white background
    if (!file.endsWith('.tsx') || file === 'payment.tsx') return;
    
    const p = pth + '/' + file;
    let c = fs.readFileSync(p, 'utf-8');
    
    // Protect the circular loading spinner box in wallet.tsx which needs to be actually white
    if (file === 'wallet.tsx') {
      c = c.replace(/backgroundColor: '#FFFFFF'/g, "backgroundColor: 'TEMP_WHITE'");
    }
    // Revert navigation Layout back to dark styling
    if (file === '_layout.tsx') {
      c = c.replace(/dark: false/g, 'dark: true');
    }
    
    replacers.forEach(r => {
      c = c.replace(r.from, r.to);
    });
    
    // Restore the protected white color
    c = c.replace(/'TEMP_WHITE'/g, "'#FFFFFF'");
    
    fs.writeFileSync(p, c);
    console.log('Processed ' + file);
  });
  console.log('Complete! Theme converted to Dark Blue!');
} catch (e) {
  console.error("Failed", e);
}
