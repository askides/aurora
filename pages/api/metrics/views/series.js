const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const thisRangeViews = async (range = "month") => {
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
          "createdAt" :: date AS day,
          Count(id) AS views
        FROM
          "Event"
        GROUP BY
          day
      ) AS e ON range.generate_series = e.day
    ORDER BY
      range
  `);
};

const thisDayViews = async () =>
  await prisma.$queryRaw`
    SELECT
      range,
      COALESCE(e.views, 0) AS views
    FROM
      Generate_series(0, 23) AS range
      LEFT JOIN (
        SELECT
          Date_part('hour', "createdAt") AS hour,
          Count(id) AS views
        FROM
          "Event"
        WHERE
          "createdAt" >= now() :: date
        GROUP BY
          hour
      ) AS e ON range = e.hour
    ORDER BY
      range
  `;

const thisYearViews = async () =>
  await prisma.$queryRaw`
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
          Date_part('month', "createdAt") AS month,
          Count(id) AS views
        FROM
          "Event"
        GROUP BY
          month
      ) AS e ON range = e.month
    ORDER BY
      range
  `;

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range } = req.query;

  let data = {};

  if (range === "this_day") {
    data = await thisDayViews()
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else if (range === "this_year") {
    data = await thisYearViews()
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else if (range === "this_month") {
    data = await thisRangeViews("month")
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else if (range === "this_week") {
    data = await thisRangeViews("week")
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  } else {
    data = [];
  }

  //console.log("data", data);
  // format data
  const x = data.map((dv) => [dv.range, dv.views]);

  return res.json({
    data: x,
  });
};
