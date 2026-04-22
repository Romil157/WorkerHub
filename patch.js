const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'frontend/src/styles/index.css');
const destPath = path.join(__dirname, 'frontend/src/styles/index_v2.css');

let content = fs.readFileSync(srcPath, 'utf8');

// Theming Overrides (Neo-Glass Premium)
content = content.replace(/--color-rust:\s*#[0-9A-Fa-f]+;/g, '--color-rust: #6366F1;'); // Indigo
content = content.replace(/--color-rust-dark:\s*#[0-9A-Fa-f]+;/g, '--color-rust-dark: #4338CA;');
content = content.replace(/--color-rust-light:\s*#[0-9A-Fa-f]+;/g, '--color-rust-light: #818CF8;');
content = content.replace(/--color-rust-pale:\s*#[0-9A-Fa-f]+;/g, '--color-rust-pale: #EEF2FF;');

content = content.replace(/--color-forest:\s*#[0-9A-Fa-f]+;/g, '--color-forest: #0F172A;'); // Slate Dark
content = content.replace(/--color-forest-dark:\s*#[0-9A-Fa-f]+;/g, '--color-forest-dark: #020617;');
content = content.replace(/--color-forest-light:\s*#[0-9A-Fa-f]+;/g, '--color-forest-light: #334155;');
content = content.replace(/--color-forest-pale:\s*#[0-9A-Fa-f]+;/g, '--color-forest-pale: #F8FAFC;');

content = content.replace(/--color-cream:\s*#[0-9A-Fa-f]+;/g, '--color-cream: #F1F5F9;'); // Cool Gray
content = content.replace(/--color-cream-dark:\s*#[0-9A-Fa-f]+;/g, '--color-cream-dark: #E2E8F0;');
content = content.replace(/--color-white:\s*#[0-9A-Fa-f]+;/g, '--color-white: rgba(255, 255, 255, 0.85);');

content = content.replace(/--font-heading:\s*'[^']+',\s*sans-serif;/g, "--font-heading: 'Outfit', sans-serif;");
content = content.replace(/--font-body:\s*'[^']+',\s*sans-serif;/g, "--font-body: 'Inter', sans-serif;");
content = content.replace(/--font-display:\s*'[^']+',\s*serif;/g, "--font-display: 'Outfit', sans-serif;");

content = content.replace(/--shadow-sm:\s*[^;]+;/g, '--shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);');
content = content.replace(/--shadow-md:\s*[^;]+;/g, '--shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);');
content = content.replace(/--shadow-lg:\s*[^;]+;/g, '--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);');

// Patch card
content = content.replace(/\.card\s*{([^}]+)}/g, `.card {\n  background: rgba(255, 255, 255, 0.7);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  border: 1px solid rgba(255, 255, 255, 0.3);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-md);\n  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n}\n.card:hover {\n  transform: translateY(-4px) scale(1.01);\n  box-shadow: var(--shadow-lg);\n  background: rgba(255, 255, 255, 0.8);\n}`);

// Add glassmorphism to global app background
content = content.replace(/body\s*{([^}]+)}/g, `body {\n  background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);\n$1}`);

// Button updates
content = content.replace(/\.btn-primary\s*{([^}]+)}/g, `.btn-primary {\n  background: linear-gradient(135deg, var(--color-rust) 0%, var(--color-rust-dark) 100%);\n  box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);\n$1}`);

fs.writeFileSync(destPath, content);
console.log('Successfully generated index_v2.css');
