import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const dir = 'artifacts/desktop/releases';
const files = readdirSync(dir).filter((file) => /\.(dmg|exe|deb)$/.test(file));
if (!files.length) throw new Error('No desktop distributables found');
for (const file of files) {
  const hash = createHash('sha256')
    .update(readFileSync(dir + '/' + file))
    .digest('hex');
  writeFileSync(dir + '/' + file + '.sha256', hash + '  ' + file + '\n');
}
