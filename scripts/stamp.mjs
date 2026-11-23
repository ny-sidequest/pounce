// Cache-busting without a build step: hash every js/css/data file, then rewrite index.html so that
//  - the stylesheet and the entry script get ?v=<hash>
//  - an import map maps every module to its ?v=<hash> URL (so module imports are versioned too)
//  - window.BUILD holds the hash (used for the puzzle fetch)
// Run `npm run stamp` before committing. Returning players then never load a stale build.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const files = [
  ...readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
  'css/styles.css', 'data/puzzles.json'
].sort();
const hash = createHash('sha1');
for (const f of files) hash.update(f).update(readFileSync(f));
const v = hash.digest('hex').slice(0, 8);

const imports = Object.fromEntries(files.filter((f) => f.startsWith('js/')).map((f) => [`./${f}`, `./${f}?v=${v}`]));
const block = `<!--build:start-->
  <script>window.BUILD = '${v}';</script>
  <script type="importmap">${JSON.stringify({ imports })}</script>
  <!--build:end-->`;

let html = readFileSync('index.html', 'utf8');
html = html.replace(/<!--build:start-->[\s\S]*?<!--build:end-->/, block);
html = html.replace(/href="css\/styles\.css[^"]*"/, `href="css/styles.css?v=${v}"`);
html = html.replace(/src="js\/app\.js[^"]*"/, `src="js/app.js?v=${v}"`);
writeFileSync('index.html', html);
console.log('stamped build', v);
