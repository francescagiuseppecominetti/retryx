'use strict';

/**
 * retryx — retry an async function with exponential backoff.
 * Zero dependencies.
 */

function abortError() {
  const err = new Error('the operation was aborted');
  err.name = 'AbortError';
  return err;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

const DEFAULTS = {
  retries: 3,
  minDelay: 100,
  maxDelay: 30000,
  factor: 2,
  jitter: false,
  signal: null,
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
    if (opts.signal && opts.signal.aborted) {
      throw abortError();
    }
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= opts.retries || !opts.shouldRetry(err, attempt)) {
        throw err;
      }
      const delay = computeDelay(attempt, opts);
      opts.onRetry(err, attempt, delay);
      await sleep(delay, opts.signal);
      attempt += 1;
    }
  }
}

/** Wrap an async function so every call is retried with the same options. */
function decorate(fn, options) {
  return function decorated(...args) {
    return retry(() => fn(...args), options);
  };
}

module.exports = { retry, computeDelay, decorate };
