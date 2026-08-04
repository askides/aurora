import { events } from "~/db/schema";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { acquisition, channelOf, siteHost, urlHost } from "../referrer.server";

const SITE = "https://example.com";

/**
 * Read out of the schema rather than restated here.
 *
 * `channel` is a closed set written in three places — the ChannelType union,
 * `channelOf`, and the events_channel_valid CHECK — with nothing linking them.
 * A literal copy in this file would be a fourth: adding a channel to the code
 * and forgetting the migration (or the reverse) would leave the suite green and
 * every insert failing 23514 in production. Derived, the test either sees the
 * new value or fails on the old one.
 */
const CHANNELS = (() => {
  const check = getTableConfig(events).checks.find(
    (constraint) => constraint.name === "events_channel_valid"
  );

  if (!check) {
    throw new Error("events_channel_valid is gone from the schema");
  }

  const { sql } = new PgDialect().sqlToQuery(check.value);

  return [...sql.matchAll(/'([^']+)'/g)].map(([, value]) => value);
})();

describe("urlHost", () => {
  it("keeps the host and nothing else", () => {
    expect(urlHost("https://blog.example.org/posts/1?utm_source=x#top")).toBe(
      "blog.example.org"
    );
  });

  it("normalises case, www and the root dot", () => {
    expect(urlHost("https://WWW.Example.ORG/")).toBe("example.org");
    expect(urlHost("https://example.org./")).toBe("example.org");
  });

  it("drops userinfo", () => {
    expect(urlHost("https://user:secret@example.org/x")).toBe("example.org");
  });

  it("refuses anything that is not an absolute http(s) URL", () => {
    // 'Direct' is the sentinel the previous tracker wrote, and a bare hostname
    // is a path rather than a site; neither may become a referrer.
    expect(urlHost("Direct")).toBeNull();
    expect(urlHost("example.org")).toBeNull();
    expect(urlHost("/blog/post")).toBeNull();
    expect(urlHost("android-app://com.google.android.gm")).toBeNull();
    expect(urlHost("javascript:alert(1)")).toBeNull();
    expect(urlHost("")).toBeNull();
    expect(urlHost(null)).toBeNull();
  });
});

describe("siteHost", () => {
  it("accepts every spelling the website form allows", () => {
    expect(siteHost("example.com")).toBe("example.com");
    expect(siteHost("https://WWW.Example.org/blog")).toBe("example.org");
    expect(siteHost("http://example.org:3000")).toBe("example.org");
    expect(siteHost("  example.com/  ")).toBe("example.com");
  });

  it("reports null for an unusable row", () => {
    expect(siteHost("")).toBeNull();
    expect(siteHost(null)).toBeNull();
  });
});

describe("channelOf", () => {
  it("calls a missing referrer direct", () => {
    expect(channelOf(null)).toBe("direct");
  });

  it("recognises search engines", () => {
    expect(channelOf("google.com")).toBe("search");
    expect(channelOf("duckduckgo.com")).toBe("search");
    expect(channelOf("search.brave.com")).toBe("search");
    expect(channelOf("search.yahoo.com")).toBe("search");
    expect(channelOf("m.baidu.com")).toBe("search");
  });

  it("keeps the rest of a portal out of search", () => {
    // The reason the list is matched whole. A newsletter read in Gmail and a
    // link out of a shared document are not organic search, and counting them
    // as it is invisible from the panel that gets sized off the number.
    expect(channelOf("mail.google.com")).toBe("referral");
    expect(channelOf("docs.google.com")).toBe("referral");
    expect(channelOf("drive.google.com")).toBe("referral");
    expect(channelOf("groups.google.com")).toBe("referral");
    expect(channelOf("news.google.com")).toBe("referral");
    expect(channelOf("mail.yahoo.com")).toBe("referral");
    expect(channelOf("mail.yandex.com")).toBe("referral");
    // Same shape one country domain over, where the brand rule is what could
    // have let it back in.
    expect(channelOf("mail.google.de")).toBe("referral");
  });

  it("recognises the country domains the big engines run", () => {
    expect(channelOf("google.de")).toBe("search");
    expect(channelOf("google.co.uk")).toBe("search");
    expect(channelOf("yahoo.co.jp")).toBe("search");
    expect(channelOf("yandex.com.tr")).toBe("search");
  });

  it("recognises social hosts and their subdomains", () => {
    // Subdomains stay in for these: `m.` and `l.` are the same product on
    // another surface, and none of these domains hosts a mailbox.
    expect(channelOf("t.co")).toBe("social");
    expect(channelOf("x.com")).toBe("social");
    expect(channelOf("m.facebook.com")).toBe("social");
    expect(channelOf("l.instagram.com")).toBe("social");
    expect(channelOf("old.reddit.com")).toBe("social");
    expect(channelOf("news.ycombinator.com")).toBe("social");
  });

  it("calls anything else a referral", () => {
    expect(channelOf("example.org")).toBe("referral");
    expect(channelOf("googleblog.com")).toBe("referral");
    expect(channelOf("notgoogle.com")).toBe("referral");
  });

  it("lets any utm parameter outrank the host", () => {
    expect(channelOf("google.com", { source: "newsletter" })).toBe("campaign");
    expect(channelOf(null, { medium: "email" })).toBe("campaign");
    expect(channelOf("example.org", { content: "footer" })).toBe("campaign");
  });

  it("ignores a utm object whose values are all blank", () => {
    expect(channelOf("google.com", { source: "", medium: "  " })).toBe(
      "search"
    );
    expect(channelOf(null, {})).toBe("direct");
  });

  it("only ever returns a value the channel check accepts", () => {
    const hosts = [
      null,
      "google.com",
      "news.google.com",
      "google.de",
      "yahoo.co.jp",
      "x.com",
      "t.co",
      "news.ycombinator.com",
      "example.org",
      "192.0.2.1",
      "xn--80ak6aa92e.com",
    ];

    for (const host of hosts) {
      expect(CHANNELS).toContain(channelOf(host));
      expect(CHANNELS).toContain(channelOf(host, { source: "n" }));
      expect(CHANNELS).toContain(channelOf(host, { medium: "email" }));
    }
  });

  it("can produce every channel the check constraint allows", () => {
    // The other half of the same guarantee: a value only the database knows
    // about is a bucket the dashboard can never fill.
    const produced = new Set([
      channelOf(null),
      channelOf("google.com"),
      channelOf("x.com"),
      channelOf("example.org"),
      channelOf(null, { source: "newsletter" }),
    ]);

    expect(produced).toEqual(new Set(CHANNELS));
  });
});

describe("acquisition", () => {
  it("stores the host of an external referrer with its channel", () => {
    expect(
      acquisition({
        referrer: "https://www.google.com/search?q=aurora+analytics",
        siteUrl: SITE,
      })
    ).toEqual({ referrer_host: "google.com", channel: "search" });
  });

  it("drops a self-referral to direct", () => {
    expect(
      acquisition({ referrer: "https://example.com/pricing", siteUrl: SITE })
    ).toEqual({ referrer_host: null, channel: "direct" });
  });

  it("compares with www stripped from both sides", () => {
    expect(
      acquisition({
        referrer: "https://www.example.com/pricing",
        siteUrl: "example.com",
      }).referrer_host
    ).toBeNull();
    expect(
      acquisition({
        referrer: "https://example.com/pricing",
        siteUrl: "https://WWW.Example.com/",
      }).referrer_host
    ).toBeNull();
  });

  it("keeps a subdomain of the site, which is a different host", () => {
    expect(
      acquisition({ referrer: "https://docs.example.com/x", siteUrl: SITE })
    ).toEqual({ referrer_host: "docs.example.com", channel: "referral" });
  });

  it("survives an unusable website url", () => {
    expect(
      acquisition({ referrer: "https://x.com/post/1", siteUrl: "" })
    ).toEqual({ referrer_host: "x.com", channel: "social" });
  });

  it("reports direct for the legacy sentinel and for no referrer at all", () => {
    expect(acquisition({ referrer: "Direct", siteUrl: SITE })).toEqual({
      referrer_host: null,
      channel: "direct",
    });
    expect(acquisition({ siteUrl: SITE })).toEqual({
      referrer_host: null,
      channel: "direct",
    });
  });

  it("reports an untagged newsletter read in webmail as a referral", () => {
    expect(
      acquisition({ referrer: "https://mail.google.com/", siteUrl: SITE })
    ).toEqual({ referrer_host: "mail.google.com", channel: "referral" });
  });

  it("keeps the host of a campaign link while calling it a campaign", () => {
    expect(
      acquisition({
        referrer: "https://mail.google.com/",
        siteUrl: SITE,
        utm: { source: "newsletter", medium: "email" },
      })
    ).toEqual({ referrer_host: "mail.google.com", channel: "campaign" });
  });
});
