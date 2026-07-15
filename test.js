'use strict';
const assert = require('assert');
const { retry, computeDelay, decorate } = require('./index.js');

(async () => {
  // resolves on first try, no retry
  let calls = 0;
  assert.strictEqual(await retry(async () => { calls += 1; return 42; }, { minDelay: 1 }), 42);
  assert.strictEqual(calls, 1);

  // fails twice, then succeeds
  calls = 0;
  const val = await retry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('boom');
    return 'ok';
  }, { retries: 5, minDelay: 1 });
  assert.strictEqual(val, 'ok');
  assert.strictEqual(calls, 3);

  // exhausts retries then rejects (initial + 2 retries)
  calls = 0;
  await assert.rejects(
    retry(async () => { calls += 1; throw new Error('always'); }, { retries: 2, minDelay: 1 }),
    /always/
  );
  assert.strictEqual(calls, 3);

  // shouldRetry can stop early
  calls = 0;
  await assert.rejects(
    retry(async () => { calls += 1; throw new Error('fatal'); }, {
      retries: 5, minDelay: 1, shouldRetry: (e) => e.message !== 'fatal',
    }),
    /fatal/
  );
  assert.strictEqual(calls, 1);

  // computeDelay: exponential growth capped at maxDelay
  const base = { minDelay: 100, factor: 2, maxDelay: 30000, jitter: false };
  assert.strictEqual(computeDelay(0, base), 100);
  assert.strictEqual(computeDelay(3, base), 800);
  assert.strictEqual(computeDelay(10, { ...base, maxDelay: 500 }), 500);

  // jitter stays within [0, capped]
  const capped = computeDelay(2, base);
  for (let i = 0; i < 50; i += 1) {
    const d = computeDelay(2, { ...base, jitter: true });
    assert.ok(d >= 0 && d <= capped);
  }

  // decorate wraps a function into a retrying one
  let dn = 0;
  const flaky = async (x) => { dn += 1; if (dn < 2) throw new Error('e'); return x * 2; };
  const safe = decorate(flaky, { retries: 3, minDelay: 1 });
  assert.strictEqual(await safe(21), 42);
  assert.strictEqual(dn, 2);

  // an aborted signal stops the retry loop
  const ac = new AbortController();
  let an = 0;
  const pending = retry(async () => { an += 1; throw new Error('nope'); }, {
    retries: 10, minDelay: 30, signal: ac.signal,
  });
  setTimeout(() => ac.abort(), 5);
  await assert.rejects(pending, (e) => e.name === 'AbortError');

  console.log('ok - all retryx tests passed');
})().catch((err) => { console.error(err); process.exit(1); });
