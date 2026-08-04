import { beforeEach, describe, expect, it } from "vitest";
import { limiter, RateLimiter, rateLimit } from "../ratelimit.server";

/** Defaults: 240 tokens, refilled at 120 a minute, so one token per 500ms. */
const BURST = 240;
const TOKEN_MS = 500;
const IDLE_MS = 120_000;

const clock = { now: 0 };

const build = (options: { maxKeys?: number } = {}) =>
  new RateLimiter({ ...options, now: () => clock.now });

const drain = (bucket: RateLimiter, key: string) => {
  for (let index = 0; index < BURST; index += 1) {
    bucket.take(key);
  }
};

const spend = (bucket: RateLimiter, key: string, attempts: number) => {
  let allowed = 0;

  for (let index = 0; index < attempts; index += 1) {
    if (bucket.take(key).allowed) {
      allowed += 1;
    }
  }

  return allowed;
};

beforeEach(() => {
  clock.now = 0;
  limiter.reset();
});

describe("RateLimiter", () => {
  it("spends the whole burst and then refuses", () => {
    const bucket = build();

    for (let index = 0; index < BURST; index += 1) {
      expect(bucket.take("client")).toEqual({
        allowed: true,
        retryAfterMs: 0,
      });
    }

    expect(bucket.take("client")).toEqual({
      allowed: false,
      retryAfterMs: TOKEN_MS,
    });
  });

  it("refills one token per 500ms and no faster", () => {
    const bucket = build();

    drain(bucket, "client");

    clock.now += TOKEN_MS - 1;
    expect(bucket.take("client").allowed).toBe(false);

    clock.now += 2;
    expect(bucket.take("client").allowed).toBe(true);
    expect(bucket.take("client").allowed).toBe(false);
  });

  it("sustains 120 a minute once the burst is gone", () => {
    const bucket = build();

    drain(bucket, "client");
    clock.now += 60_000;

    expect(spend(bucket, "client", 200)).toBe(120);
  });

  it("never banks more than the burst however long it idles", () => {
    const bucket = build();

    drain(bucket, "client");
    clock.now += 60 * 60_000;

    expect(spend(bucket, "client", 400)).toBe(BURST);
  });

  it("caps a bucket the sweep has not removed", () => {
    const bucket = build();

    // The test above idles past #idleMs, so the sweep deletes the bucket and
    // the next take reads the fresh-bucket constant instead of the cap. One
    // token spent and a wait just inside the window keeps the entry alive, so
    // this is the only case where the cap is what answers.
    expect(bucket.take("client").allowed).toBe(true);
    clock.now += IDLE_MS - 1;

    // Uncapped the bucket would have banked 239 + 239.998 tokens.
    expect(spend(bucket, "client", 400)).toBe(BURST);
  });

  it("counts down while over the limit instead of restarting the wait", () => {
    const bucket = build();

    drain(bucket, "client");

    clock.now += 200;
    expect(bucket.take("client").retryAfterMs).toBe(300);

    clock.now += 200;
    expect(bucket.take("client").retryAfterMs).toBe(100);
  });

  it("keeps one client's flood off another's budget", () => {
    const bucket = build();

    drain(bucket, "client-a");

    expect(bucket.take("client-a").allowed).toBe(false);
    expect(bucket.take("client-b").allowed).toBe(true);
  });

  it("honours a custom rate", () => {
    const bucket = new RateLimiter({
      ratePerMinute: 60,
      burst: 2,
      now: () => clock.now,
    });

    expect(bucket.take("k").allowed).toBe(true);
    expect(bucket.take("k").allowed).toBe(true);
    expect(bucket.take("k").allowed).toBe(false);

    clock.now += 1_000;
    expect(bucket.take("k").allowed).toBe(true);
  });
});

describe("sweeping", () => {
  it("drops the buckets a rotating-address flood leaves behind", () => {
    const bucket = build();

    for (let index = 0; index < 5_000; index += 1) {
      bucket.take(`10.0.${index}`);
    }

    expect(bucket.size).toBe(5_000);

    clock.now += IDLE_MS;
    bucket.take("fresh");

    expect(bucket.size).toBe(1);
  });

  it("keeps sweeping as the flood continues", () => {
    const bucket = build();

    for (let round = 0; round < 4; round += 1) {
      for (let index = 0; index < 1_000; index += 1) {
        bucket.take(`round-${round}-${index}`);
      }

      clock.now += IDLE_MS;
    }

    bucket.take("last");

    expect(bucket.size).toBe(1);
  });

  it("does not forgive a client by forgetting it", () => {
    const bucket = build();

    drain(bucket, "client");
    // A swept bucket has provably refilled to full, so the entry is redundant
    // rather than load-bearing: dropping it must not hand out a second burst.
    clock.now += IDLE_MS;
    bucket.take("other");

    expect(bucket.size).toBe(1);
    expect(spend(bucket, "client", 400)).toBe(BURST);
  });
});

describe("the size cap", () => {
  it("bounds the map inside a window the sweep cannot reclaim", () => {
    const bucket = build({ maxKeys: 100 });

    // The sweep runs at most once per #idleMs and only evicts entries already
    // idle that long, so nothing admitted during the current window can be
    // dropped by it: without a cap this is 5000 live keys, and with an
    // unbounded key it was 5000 keys of whatever length the caller sent.
    for (let index = 0; index < 5_000; index += 1) {
      clock.now += 1;
      bucket.take(`10.0.${index}`);
    }

    expect(bucket.size).toBe(100);
  });

  it("evicts the quietest key rather than the oldest one", () => {
    const bucket = build({ maxKeys: 2 });

    bucket.take("steady");
    bucket.take("noisy");
    // `steady` was seen first but is still active, so a plain insertion-order
    // eviction would drop the wrong one.
    bucket.take("steady");
    bucket.take("newcomer");

    expect(bucket.size).toBe(2);
    // Checked by budget rather than by a private field: an evicted key comes
    // back with a full bucket, so 238 remaining is proof `steady` survived and
    // 240 would be proof it did not.
    expect(spend(bucket, "steady", 400)).toBe(BURST - 2);
  });
});

describe("rateLimit", () => {
  it("scopes the process-wide limiter to the caller", () => {
    expect(rateLimit("203.0.113.7")).toEqual({
      allowed: true,
      retryAfterMs: 0,
    });
    expect(limiter.size).toBe(1);

    rateLimit("203.0.113.8");

    expect(limiter.size).toBe(2);
  });

  it("takes no key from anything the caller could pick per request", () => {
    // It used to be `${ip}:${wid}` with `wid` straight out of the request body,
    // so one address could mint a fresh full bucket per request forever.
    for (let index = 0; index < 240; index += 1) {
      rateLimit("203.0.113.7");
    }

    expect(rateLimit("203.0.113.7").allowed).toBe(false);
    expect(limiter.size).toBe(1);
  });
});
