const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const browserViews = async (range, seed) =>
  await prisma.$queryRaw(`
    SELECT
      browsers.name as element,
      COUNT(events.id) as views
    FROM
      events
      JOIN browsers ON events.browser_id = browsers.id
      JOIN websites ON events.website_id = websites.id
    WHERE events.created_at >= (now() - '1 ${range}'::interval)
    AND websites.seed = '${seed}'
    GROUP BY
      browsers.name
    ORDER BY views DESC
  `);

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range, seed } = req.query;

  const r = range.replace("this_", ""); /// XXX TO CHECK VALUES

  const data = await browserViews(r, seed)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const x = data.map((dv) => [dv.element, dv.views]);

  return res.json({
    data: x,
  });
};
