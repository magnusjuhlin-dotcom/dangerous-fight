const fs = require('fs');
const path = require('path');

const files = [
    'src/audio.js',
    'src/canvas.js',
    'src/particles.js',
    'src/upgrades.js',
    'src/ui.js',
    'src/input.js',
    'src/player.js',
    'src/enemy.js',
    'src/game.js'
];

let bundleCode = '';

console.log('Starting JavaScript Bundler...');

for (const file of files) {
    const fullPath = path.join(__dirname, file);
    console.log(`Processing file: ${file}...`);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove ES6 import statements
    // e.g. import { CanvasController } from './canvas.js';
    // e.g. import { AudioSynth } from './audio.js';
    content = content.replace(/^\s*import\s+[^;\n]+;/gm, '');

    // Remove export keywords before class, const, let, function, etc.
    // e.g. export class CanvasController => class CanvasController
    content = content.replace(/export\s+class\s+(\w+)/g, 'class $1');
    content = content.replace(/export\s+const\s+(\w+)/g, 'const $1');
    content = content.replace(/export\s+let\s+(\w+)/g, 'let $1');
    content = content.replace(/export\s+function\s+(\w+)/g, 'function $1');
    content = content.replace(/export\s+default\s+class\s+(\w+)/g, 'class $1');

    bundleCode += `\n/* --- BUNDLED FROM: ${file} --- */\n`;
    bundleCode += content;
    bundleCode += '\n';
}

// Write the output bundle.js
const outBundleDir = path.join(__dirname, 'src');
if (!fs.existsSync(outBundleDir)) {
    fs.mkdirSync(outBundleDir, { recursive: true });
}
const outBundlePath = path.join(outBundleDir, 'bundle.js');
fs.writeFileSync(outBundlePath, bundleCode, 'utf8');
console.log(`Successfully created bundle at ${outBundlePath}`);

// Update index.html to load bundle.js instead of module game.js
const indexHtmlPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
indexHtml = indexHtml.replace(
    /<script type="module" src="src\/game\.js"><\/script>/g,
    '<script src="src/bundle.js"></script>'
);
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('Updated index.html to load bundle.js');

// Now copy to Android assets folder
const androidAssetsDir = path.join(__dirname, 'android/app/src/main/assets');
if (fs.existsSync(androidAssetsDir)) {
    console.log('Copying files to Android assets...');
    
    // Copy index.html
    fs.writeFileSync(
        path.join(androidAssetsDir, 'index.html'),
        indexHtml,
        'utf8'
    );
    
    // Copy style.css
    const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
    fs.writeFileSync(
        path.join(androidAssetsDir, 'style.css'),
        styleCss,
        'utf8'
    );
    
    // Copy src/bundle.js
    const androidAssetsSrcDir = path.join(androidAssetsDir, 'src');
    if (!fs.existsSync(androidAssetsSrcDir)) {
        fs.mkdirSync(androidAssetsSrcDir, { recursive: true });
    }
    fs.writeFileSync(
        path.join(androidAssetsSrcDir, 'bundle.js'),
        bundleCode,
        'utf8'
    );
    
    console.log('Files successfully copied to Android assets!');
} else {
    console.warn(`Android assets directory not found at: ${androidAssetsDir}`);
}

console.log('Build completed successfully!');
