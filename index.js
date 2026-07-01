'use strict';

/**
 * retryx — retry an async function with exponential backoff.
 * Zero dependencies.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULTS = {
  retries: 3,
  minDelay: 100,
  maxDelay: 30000,
  factor: 2,
  jitter: false,
  shouldRetry: () => true,
  onRetry: () => {},
};

/** Backoff delay (ms) for a given zero-based attempt. */
function computeDelay(attempt, opts) {
  const raw = opts.minDelay * Math.pow(opts.factor, attempt);
  const capped = Math.min(raw, opts.maxDelay);
  return opts.jitter ? Math.round(Math.random() * capped) : capped;
}

/** Call `fn(attempt)` until it resolves or retries are exhausted. */
async function retry(fn, options) {
  if (typeof fn !== 'function') {
    throw new TypeError('retry: first argument must be a function');
  }
  const opts = Object.assign({}, DEFAULTS, options);
  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= opts.retries || !opts.shouldRetry(err, attempt)) {
        throw err;
      }
      const delay = computeDelay(attempt, opts);
      opts.onRetry(err, attempt, delay);
      await sleep(delay);
      attempt += 1;
    }
  }
}

module.exports = { retry, computeDelay };
