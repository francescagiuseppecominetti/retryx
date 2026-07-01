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
  factor: 2,
};

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
      if (attempt >= opts.retries) {
        throw err;
      }
      await sleep(opts.minDelay * Math.pow(opts.factor, attempt));
      attempt += 1;
    }
  }
}

module.exports = { retry };
