import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'node_modules/just-bash/dist/bundle/browser.js',
  'node_modules/just-bash/dist/bin/chunks/chunk-54G6AE72.js',
  'node_modules/just-bash/dist/bin/chunks/chunk-NAOEMXWM.js',
  'node_modules/just-bash/dist/bin/shell/chunks/chunk-54G6AE72.js',
  'node_modules/just-bash/dist/bin/shell/chunks/chunk-NAOEMXWM.js'
];

for (const file of filesToPatch) {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/import\s*\{([^}]+)\}\s*from\s*["']node:zlib["'];?/g, (match, imports) => {
      // Create inline stubs for any imported identifier
      const items = imports.split(',').map(s => s.trim()).filter(Boolean);
      const defs = items.map(item => {
        const parts = item.split(/\s+as\s+/);
        const localName = (parts[1] || parts[0]).trim();
        const origName = parts[0].trim();
        if (origName === 'constants') {
          return `const ${localName} = { Z_BEST_COMPRESSION: 9, Z_BEST_SPEED: 1, Z_DEFAULT_COMPRESSION: -1, Z_NO_COMPRESSION: 0 };`;
        }
        return `const ${localName} = (data) => new Uint8Array(0);`;
      });
      return defs.join(' ');
    });
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Patched ${file}`);
  }
}
