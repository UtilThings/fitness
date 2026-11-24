import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import {
  formatPrice,
  groupPlans,
  jumpPlans,
  personalOneOnOne,
  personalPartner,
} from '../../src/lib/data';

mkdirSync('.astro', { recursive: true });
const output = mkdtempSync(join(process.cwd(), '.astro', 'offline-'));
try {
  const result = spawnSync(
    process.execPath,
    ['run', 'build', '--outDir', output],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        PUBLIC_SITE_URL: 'https://fitness.example.test',
        PUBLIC_API_URL: 'http://127.0.0.1:9',
        PUBLIC_API_TIMEOUT_MS: '500',
      },
    },
  );
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    'El build con la API inalcanzable debe terminar correctamente.',
  );

  const html = readFileSync(join(output, 'pricing', 'index.html'), 'utf8');
  const { DOMParser } = new Window({
    settings: { disableJavaScriptEvaluation: true },
  });
  const page = new DOMParser().parseFromString(html, 'text/html');
  const renderedPrices = [
    ...page.querySelectorAll('main .card-surface p.text-5xl'),
  ].map((price) => price.textContent.trim());
  assert.deepEqual(
    renderedPrices,
    [...personalOneOnOne, ...personalPartner, ...groupPlans, ...jumpPlans].map(
      ({ price }) => formatPrice(price),
    ),
  );
  console.log('Build con API inalcanzable y precios de respaldo verificados.');
} finally {
  rmSync(output, { recursive: true, force: true });
}
