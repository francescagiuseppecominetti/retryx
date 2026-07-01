# retryx

Retry an async function with **exponential backoff** — zero dependencies,
one small function.

## Usage

```js
const { retry } = require('retryx');

const data = await retry(() => fetch('https://example.com').then((r) => r.json()), {
  retries: 5,        // extra attempts after the first (default: 3)
  minDelay: 200,     // ms before the first retry (default: 100)
  factor: 2,         // exponential growth (default: 2)
  maxDelay: 10000,   // cap per-attempt delay (default: 30000)
  jitter: true,      // randomize delay in [0, computed] (default: false)
  shouldRetry: (err) => err.code !== 'FATAL',
  onRetry: (err, attempt, delay) => console.warn(`retry #${attempt + 1} in ${delay}ms`),
});
```

`retry(fn, options)` calls `fn(attempt)` and resolves with its value. If it
throws/rejects, it waits with exponential backoff and tries again until
`retries` is reached, then rethrows the last error.

## Test

```console
$ npm test
```

## License

[MIT](LICENSE)
