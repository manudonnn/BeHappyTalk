const fs = require('fs');
const pth = 'd:/Projects/BeHappyTalk/app';

const replacers = [
  // Restore backgrounds that were accidentally set to the text's white transparency
  { from: /backgroundColor:\s*'rgba\(255, 255, 255, 0\.92\)'/g, to: "backgroundColor: '#1A1C23'" },
  { from: /backgroundColor:\s*'rgba\(255, 255, 255, 0\.70\)'/g, to: "backgroundColor: 'rgba(255, 255, 255, 0.08)'" },
  
  // Restore layout dividing lines and cut-out borders
  { from: /borderColor:\s*'rgba\(255, 255, 255, 0\.92\)'/g, to: "borderColor: '#0A0B10'" },
  { from: /borderBottomColor:\s*'rgba\(255, 255, 255, 0\.92\)'/g, to: "borderBottomColor: 'rgba(255, 255, 255, 0.08)'" },
  { from: /borderTopColor:\s*'rgba\(255, 255, 255, 0\.92\)'/g, to: "borderTopColor: 'rgba(255, 255, 255, 0.08)'" }
];

try {
  fs.readdirSync(pth).forEach(file => {
    if (!file.endsWith('.tsx') || file === 'payment.tsx') return;
    
    const p = pth + '/' + file;
    let c = fs.readFileSync(p, 'utf-8');
    
    // Apply normal repair replacers
    replacers.forEach(r => {
      c = c.replace(r.from, r.to);
    });

    // Run a smart regex to ensure ALL safeArea containers have the exact same Obsidian background #0A0B10, 
    // overriding the light grey issues on screens like Permissions.tsx
    c = c.replace(/safeArea:\s*\{[\s\S]*?backgroundColor:\s*'[^']+'/g, (match) => {
        return match.replace(/backgroundColor:\s*'[^']+'/, "backgroundColor: '#0A0B10'");
    });

    // In home.tsx I want the statusDot (the cutout on the avatar ring) to match the card background
    if (file === 'home.tsx') {
      c = c.replace(/statusDot:\s*\{([^}]*)borderColor:\s*'#0A0B10'([^}]*)\}/g, "statusDot: {$1borderColor: '#1A1C23'$2}");
      c = c.replace(/statusDotLg:\s*\{([^}]*)borderColor:\s*'#0A0B10'([^}]*)\}/g, "statusDotLg: {$1borderColor: '#0A0B10'$2}");
    }
    
    fs.writeFileSync(p, c);
    console.log('Processed ' + file);
  });
  console.log('Complete! Colors fully repaired.');
} catch (e) {
  console.error("Failed", e);
}
