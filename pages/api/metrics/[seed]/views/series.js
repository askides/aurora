const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const thisRangeViews = async (range = "month", seed) => {
  return await prisma.$queryRaw(`
    SELECT
      range.generate_series as range,
      COALESCE(e.views, 0) AS views
    FROM
      (
        select
          generate_series(
            date_trunc('${range}', now()),
            date_trunc('${range}', now()) + '1 ${range}' :: interval - '1 day' :: interval,
            '1 day' :: interval
          ):: date
      ) as range
      LEFT JOIN (
        SELECT
          events.created_at :: date AS day,
          Count(events.id) AS views
        FROM
          events
          JOIN websites on websites.id = events.website_id
        WHERE
          websites.seed = '${seed}'
        GROUP BY
          day
      ) AS e ON range.generate_series = e.day
    ORDER BY
      range
  `);
};

const thisDayViews = async (seed) =>
  await prisma.$queryRaw(`
    SELECT
      range,
      COALESCE(e.views, 0) AS views
    FROM
      Generate_series(0, 23) AS range
      LEFT JOIN (
        SELECT
          Date_part('hour', events.created_at) AS hour,
          Count(events.id) AS views
        FROM
          events
          JOIN websites on websites.id = events.website_id
        WHERE
          events.created_at >= now() :: date
          AND websites.seed = '${seed}'
        GROUP BY
          hour
      ) AS e ON range = e.hour
    ORDER BY
      range
  `);

const thisYearViews = async (seed) =>
  await prisma.$queryRaw(`
    SELECT
      to_char(
        to_timestamp (range :: text, 'MM'),
        'TMMonth'
      ) as range,
      COALESCE(e.views, 0) AS views
    FROM
      Generate_series(1, 12) AS range
      LEFT JOIN (
        SELECT
          Date_part('month', events.created_at) AS month,
          Count(events.id) AS views
        FROM
          events
          JOIN websites on websites.id = events.website_id
        WHERE
          websites.seed = '${seed}'
        GROUP BY
          month
      ) AS e ON range = e.month
    ORDER BY
      range
  `);

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { seed, range } = req.query;

  let data = {};

  if (range === "this_day") {
    data = await thisDayViews(seed)
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else if (range === "this_year") {
    data = await thisYearViews(seed)
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else if (range === "this_month") {
    data = await thisRangeViews("month", seed)
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else if (range === "this_week") {
    data = await thisRangeViews("week", seed)
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else {
    data = [];
  }

  const x = data.map((dv) => [dv.range, dv.views]);

  return res.json({
    data: x,
  });
};
