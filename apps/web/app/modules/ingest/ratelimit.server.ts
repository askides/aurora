/**
 * 120 events a minute is roughly one every half second sustained, which no
 * reader produces and a broken SPA router does. The bucket holds twice that so
 * a burst of queued beacons flushing after a bfcache restore is not punished
 * for arriving at once.
 */
const RATE_PER_MINUTE = 120;
const BURST = 240;

/**
 * A ceiling on live buckets, because the sweep alone is not one.
 *
 * The sweep runs at most once per idle window and only evicts entries already
 * idle that long, so nothing admitted during the current window can be
 * reclaimed — a flood of distinct keys grows the map for two full minutes
 * before anything is dropped. At 50k entries the map is a few MB; past that the
 * least recently used key is evicted, which hands that one caller a fresh
 * bucket and is the correct trade against an unbounded heap.
 */
const MAX_KEYS = 50_000;

export type RateLimiterOptions = {
  ratePerMinute?: number;
  burst?: number;
  maxKeys?: number;
  /** Injected so the refill maths can be tested without waiting for a clock. */
  now?: () => number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** 0 when allowed; otherwise how long until one token exists again. */
  retryAfterMs: number;
};

type Bucket = { tokens: number; at: number };

/**
 * A token bucket per key, held in a Map in least-recently-used order.
 *
 * Aurora is a single self-hosted process, so the alternative is putting Redis
 * on the ingest path to defend an endpoint whose worst case is a skewed chart.
 * Behind N instances the effective limit is N times the configured one, which
 * is the trade being made knowingly.
 *
 * Tokens are only ever recomputed when a key is touched, so an idle bucket
 * costs nothing but its own entry — the sweep and the size cap below are what
 * stop those entries accumulating.
 */
export class RateLimiter {
  #buckets = new Map<string, Bucket>();
  #refillPerMs: number;
  #burst: number;
  #maxKeys: number;
  #now: () => number;
  #idleMs: number;
  #sweptAt: number;

  constructor(options: RateLimiterOptions = {}) {
    const ratePerMinute = options.ratePerMinute ?? RATE_PER_MINUTE;

    this.#burst = options.burst ?? BURST;
    this.#maxKeys = options.maxKeys ?? MAX_KEYS;
    this.#refillPerMs = ratePerMinute / 60_000;
    this.#now = options.now ?? Date.now;
    // Time to refill an empty bucket to full. Past it a bucket is
    // indistinguishable from one that never existed, which is what makes
    // dropping it lossless rather than an amnesty.
    this.#idleMs = Math.ceil(this.#burst / this.#refillPerMs);
    this.#sweptAt = this.#now();
  }

  /** Live bucket count — the number the sweep and the cap keep bounded. */
  get size() {
    return this.#buckets.size;
  }

  take(key: string): RateLimitResult {
    const now = this.#now();

    this.#sweep(now);

    const bucket = this.#buckets.get(key);
    const tokens = bucket
      ? Math.min(
          this.#burst,
          bucket.tokens + (now - bucket.at) * this.#refillPerMs
        )
      : this.#burst;

    if (tokens < 1) {
      // Still written back: the timestamp has to keep moving or the next call
      // would credit the same elapsed milliseconds twice.
      this.#store(key, { tokens, at: now });

      return {
        allowed: false,
        retryAfterMs: Math.ceil((1 - tokens) / this.#refillPerMs),
      };
    }

    this.#store(key, { tokens: tokens - 1, at: now });

    return { allowed: true, retryAfterMs: 0 };
  }

  reset() {
    this.#buckets.clear();
    this.#sweptAt = this.#now();
  }

  /**
   * Delete-then-set so the Map's insertion order is recency order: `set` on a
   * key that already exists leaves it where it was, which would make the
   * eviction below drop whichever client happened to arrive first rather than
   * whichever has been quiet longest.
   */
  #store(key: string, bucket: Bucket) {
    this.#buckets.delete(key);
    this.#buckets.set(key, bucket);

    while (this.#buckets.size > this.#maxKeys) {
      const oldest = this.#buckets.keys().next();

      if (oldest.done) {
        return;
      }

      this.#buckets.delete(oldest.value);
    }
  }

  /**
   * Lazy rather than on a timer: a `setInterval` would keep the process awake
   * and would run in tests, and there is nothing to sweep between requests
   * anyway. Sweeping no more often than the refill window bounds the map to the
   * distinct keys seen in one such window; the size cap bounds it inside one.
   */
  #sweep(now: number) {
    if (now - this.#sweptAt < this.#idleMs) {
      return;
    }

    this.#sweptAt = now;

    for (const [key, bucket] of this.#buckets) {
      if (now - bucket.at >= this.#idleMs) {
        this.#buckets.delete(key);
      }
    }
  }
}

export const limiter = new RateLimiter();

/**
 * Keyed on the caller and on nothing the caller chose.
 *
 * The key used to be `${ip}:${wid}`, and the website id came straight out of an
 * unvalidated request body: rotating one character minted a brand-new full
 * bucket, so the limiter counted requests without ever being able to refuse
 * one, and each rotation left a Map entry behind for two minutes. Per-site
 * budgets were worth having — one office behind a NAT address reading two sites
 * was two budgets — but not at the price of letting the counted party pick the
 * counter.
 *
 * `client` is `clientKey()`: a validated address, or a hash of the user agent
 * where nothing forwards one.
 */
export function rateLimit(client: string) {
  return limiter.take(client);
}
