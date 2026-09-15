// Rehearse current source without changing this checkout's history or publishing.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const root = resolve('.');
const temp = mkdtempSync(join(tmpdir(), 'quilt-release-rehearsal-'));
const run = (command, args, cwd = temp) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
try {
  const files = run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], root)
    .split('\0')
    .filter(Boolean);
  for (const file of new Set(files)) {
    if (!existsSync(join(root, file))) continue;
    mkdirSync(dirname(join(temp, file)), { recursive: true });
    cpSync(join(root, file), join(temp, file));
  }
  run('git', ['init', '--quiet']);
  run('git', ['add', '.']);
  run('git', [
    '-c',
    'user.name=Quilt release rehearsal',
    '-c',
    'user.email=rehearsal@localhost',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '--quiet',
    '-m',
    'Temporary release rehearsal snapshot',
  ]);
  console.log(run('npm', ['ci', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund']));
  console.log(run('npm', ['run', 'pack:all']));
  const version = JSON.parse(readFileSync(join(temp, 'package.json'), 'utf8')).version;
  const env = { ...process.env, RELEASE_VERSION: version };
  for (const args of [['scripts/release.mjs', '--validate'], ['scripts/release.mjs']])
    execFileSync(process.execPath, args, { cwd: temp, env, stdio: 'inherit' });
  const report = {
    version,
    sourceCommit: run('git', ['rev-parse', 'HEAD'], root),
    includesUncommittedSource: Boolean(run('git', ['status', '--porcelain'], root)),
    rehearsalTree: run('git', ['rev-parse', 'HEAD^{tree}']),
    checks: [
      'isolated npm ci',
      'clean snapshot packing',
      'version and changelog validation',
      'archive provenance and SHA256 validation',
      'npm pack --dry-run',
    ],
    published: false,
    archives: JSON.parse(readFileSync(join(temp, 'artifacts/packages/manifest.json'), 'utf8'))
      .packages,
  };
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  writeFileSync(
    join(root, 'artifacts/release-rehearsal.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log('Release rehearsal passed; no publication. Report: artifacts/release-rehearsal.json');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
