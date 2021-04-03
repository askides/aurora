import prisma from "./prisma";

const viewsByBrowser = async (range, seed) =>
  await prisma.$queryRaw(`
    SELECT
      browsers.name as element,
      COUNT(events.id) as views,
      COUNT(DISTINCT events.hash) as unique
    FROM
      events
      JOIN browsers ON events.browser_id = browsers.id
      JOIN websites ON events.website_id = websites.id
    WHERE
      events.created_at >= DATE_TRUNC('${range}', now())
      AND websites.seed = '${seed}'
    GROUP BY
      browsers.name
    ORDER BY
      views DESC
  `);

module.exports = {
  viewsByBrowser,
};
