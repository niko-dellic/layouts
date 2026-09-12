import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  realpathSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
execFileSync(process.execPath, ['scripts/pack.mjs'], { stdio: 'inherit' });
const manifest = JSON.parse(readFileSync('artifacts/packages/manifest.json', 'utf8'));
const temp = mkdtempSync(join(tmpdir(), 'layouts-consumer-'));
try {
  const dependencies = Object.fromEntries(
    manifest.packages.map((p) => [p.name, `file:${resolve('artifacts/packages', p.file)}`]),
  );
  // Explicit peer installation keeps the vanilla consumer independent of React.
  writeFileSync(
    join(temp, 'package.json'),
    JSON.stringify({
      name: 'isolated-layouts-consumer',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: {
        '@niko-dellic/layouts-core': dependencies['@niko-dellic/layouts-core'],
        '@niko-dellic/layouts': dependencies['@niko-dellic/layouts'],
      },
    }),
  );
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: temp,
    stdio: 'pipe',
  });
  assert.equal(
    existsSync(join(temp, 'node_modules/react')),
    false,
    'Vanilla installation must not install React',
  );
  writeFileSync(
    join(temp, 'smoke.mjs'),
    `import assert from 'node:assert/strict';
 import {LayoutStore} from '@niko-dellic/layouts-core';
 import {mountLayout} from '@niko-dellic/layouts';
 const store=new LayoutStore({version:1,root:{kind:'group',id:'main',panes:['a'],active:'a'},panes:{a:{id:'a',title:'A',type:'text'}},popouts:[],maximized:null});
 store.split('main','horizontal',{id:'b',title:'B',type:'text'});
 assert.equal(Object.keys(store.export().panes).length,2);
 assert.equal(typeof mountLayout,'function');
 `,
  );
  execFileSync(process.execPath, ['smoke.mjs'], { cwd: temp, stdio: 'inherit' });
  execFileSync(
    'npm',
    [
      'install',
      dependencies['@niko-dellic/layouts-react'],
      'react@19',
      'react-dom@19',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ],
    { cwd: temp, stdio: 'pipe' },
  );
  writeFileSync(
    join(temp, 'react-smoke.mjs'),
    `import assert from 'node:assert/strict';import {Layout,reactRenderer,useLayoutSnapshot} from '@niko-dellic/layouts-react';assert.ok(Layout);assert.equal(typeof reactRenderer,'function');assert.equal(typeof useLayoutSnapshot,'function');`,
  );
  execFileSync(process.execPath, ['react-smoke.mjs'], { cwd: temp, stdio: 'inherit' });
  for (const p of manifest.packages) {
    const location = realpathSync(join(temp, 'node_modules', p.name));
    assert.ok(
      location.startsWith(realpathSync(temp)),
      'Packed packages must not link to the checkout',
    );
    assert.ok(existsSync(join(location, 'dist/index.d.ts')));
    assert.ok(existsSync(join(location, 'LICENSE')));
  }
  assert.ok(existsSync(join(temp, 'node_modules/@niko-dellic/layouts/dist/styles.css')));
  console.log('Isolated tarball installs passed (vanilla without React; React with peers).');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
