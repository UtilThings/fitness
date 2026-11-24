import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import {
  formatPrice,
  groupPlans,
  jumpPlans,
  personalOneOnOne,
  personalPartner,
} from '../../src/lib/data';

const key = 'pk_fixture1_12345678901234567890123456789012';
const business = {
  name: 'Fitness de prueba',
  city: 'Bogotá, Colombia',
  logo_url: '',
  currency: 'COP',
  timezone: 'America/Bogota',
};
const seenKeys: unknown[] = [];
const server = createServer((request, response) => {
  if (request.url !== '/api/public/catalog') {
    response.writeHead(404).end();
    return;
  }
  const sent = request.headers['x-business-key'];
  seenKeys.push(sent);
  response.setHeader('Content-Type', 'application/json');
  if (sent !== key) {
    response
      .writeHead(401)
      .end(JSON.stringify({ message: 'Clave de API inválida' }));
    return;
  }
  response.writeHead(200).end(
    JSON.stringify({
      version: 2,
      business,
      currency: business.currency,
      services: [
        {
          slug: 'group-strength',
          name: 'Fuerza',
          kind: 'group',
          weekly_times: [],
          plans: [
            {
              name: 'Plan real',
              price_cents: 234500,
              billing_unit: 'per_4_weeks',
              sessions: 8,
              per_week: 2,
              commitment_periods: 0,
              is_first_class: false,
              partner: false,
              note: '',
            },
          ],
        },
      ],
    }),
  );
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const location = server.address();
assert(location && typeof location !== 'string');
const apiUrl = `http://127.0.0.1:${location.port}`;
const { DOMParser } = new Window({
  settings: { disableJavaScriptEvaluation: true },
});
const fallbackPrices = [
  ...personalOneOnOne,
  ...personalPartner,
  ...groupPlans,
  ...jumpPlans,
].map(({ price }) => formatPrice(price));

mkdirSync('.astro', { recursive: true });
const output = mkdtempSync(join(process.cwd(), '.astro', 'public-build-'));

async function build(url: string, businessKey: string, directory: string) {
  const child = spawn(
    process.execPath,
    ['run', 'build', '--outDir', directory],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        PUBLIC_SITE_URL: 'https://fitness.example.test',
        PUBLIC_API_URL: url,
        PUBLIC_BUSINESS_KEY: businessKey,
        PUBLIC_API_TIMEOUT_MS: '500',
      },
    },
  );
  const [status] = await once(child, 'exit');
  assert.equal(status, 0, 'El build con integración pública debe terminar.');
  const html = readFileSync(join(directory, 'pricing', 'index.html'), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

function prices(page: Awaited<ReturnType<typeof build>>) {
  return [...page.querySelectorAll('main .card-surface p.text-5xl')].map(
    (price) => price.textContent.trim(),
  );
}

try {
  const connected = await build(apiUrl, key, join(output, 'connected'));
  assert.deepEqual(prices(connected), [formatPrice(2345, 'COP')]);
  assert(connected.title.includes(business.name));
  assert(
    connected.querySelector('footer')?.textContent.includes(business.city),
  );
  assert.deepEqual([...new Set(seenKeys.splice(0))], [key]);

  const rejectedKey = 'pk_invalid1_00000000000000000000000000000000';
  const rejected = await build(apiUrl, rejectedKey, join(output, 'rejected'));
  assert.deepEqual(prices(rejected), fallbackPrices);
  assert.deepEqual([...new Set(seenKeys)], [rejectedKey]);

  server.close();
  await once(server, 'close');
  const offline = await build(apiUrl, key, join(output, 'offline'));
  assert.deepEqual(prices(offline), fallbackPrices);
  console.log(
    'Build con clave válida, clave rechazada y API inalcanzable verificado.',
  );
} finally {
  if (server.listening) server.close();
  rmSync(output, { recursive: true, force: true });
}
