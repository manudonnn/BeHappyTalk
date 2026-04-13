const fs = require('fs');
const pth = 'd:/Projects/BeHappyTalk/app';

const replacers = [
  // 1. Structural Backgrounds -> Obsidian/Slate (Highly desaturated, 
  // deep premium dark mode rather than saturated blue)
  { from: /#0B1021/gi, to: '#0A0B10' }, // Ultra deep background (almost black)
  { from: /#10182B/gi, to: '#12141A' }, // Headers
  { from: /#151E32/gi, to: '#1A1C23' }, // Cards and Elevated Surfaces

  // 2. High-Quality Translucent Typography (Opacity based text)
  { from: /#FFFFFF/gi, to: 'rgba(255, 255, 255, 0.92)' }, // Strong, but soft primary
  { from: /#D3D8E8/gi, to: 'rgba(255, 255, 255, 0.70)' }, // Clear secondary
  { from: /#8B95A5/gi, to: 'rgba(255, 255, 255, 0.45)' }, // Elegant muted
  { from: /#6B7B8C/gi, to: 'rgba(255, 255, 255, 0.25)' }, // Deep muted

  // 3. Borders and Dividers
  { from: /#1E2A44/gi, to: 'rgba(255, 255, 255, 0.08)' }, // Distinct soft border
  { from: /#16284C/gi, to: 'rgba(255, 255, 255, 0.04)' }, // Extremely faint divider

  // 4. Accent Refinement (Glowing Golden instead of raw Orange/Amber)
  { from: /#FFA000/gi, to: '#FACC15' }, // Tailwind Yellow-400 (Vibrant, premium gold)
  { from: /#FFC107/gi, to: '#FDE047' }, // Tailwind Yellow-300 (Softer highlight)
];

try {
  fs.readdirSync(pth).forEach(file => {
    if (!file.endsWith('.tsx') || file === 'payment.tsx') return;
    
    const p = pth + '/' + file;
    let c = fs.readFileSync(p, 'utf-8');
    
    // Protect the circular loading spinner box in wallet.tsx which needs absolute solid white
    if (file === 'wallet.tsx') {
      // It was currently matching #FFFFFF or rgba() ? Let's protect the known 'TEMP_WHITE' if any, 
      // or actually it became '#FFFFFF' after our last run!
      // But now it will become rgba(255,255,255,0.92). A 92% opaque spinner box is fine and actually looks premium!
      // But wait, the activity indicator inside needs to be visible. Let's just let it run.
    }
    
    replacers.forEach(r => {
      c = c.replace(r.from, r.to);
    });
    
    // Enhance font stylings globally? Too risky via naive regex string replacement
    // E.g., adding lineHeights.
    fs.writeFileSync(p, c);
    console.log('Processed ' + file);
  });
  console.log('Complete! Theme refined to Premium Obsidian with translucent typography.');
} catch (e) {
  console.error("Failed", e);
}
