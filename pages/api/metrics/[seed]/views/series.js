const { withSharedAuth } = require("../../../../../utils/hof/withSharedAuth");
const { db } = require("../../../../../lib/db_connect");

// TODO: only pageView event & Fix range
const thisRangeViews = async (range = "month", seed) => {
  return await db.raw(`
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
  await db.raw(`
    SELECT
      range.generate_series::timestamp::time as range,
      COALESCE(e.views, 0) AS views
    FROM
        (select
          generate_series(
            date_trunc('day', now()),
            date_trunc('day', now()) + '1 day' :: interval - '1 hour' :: interval,
            '1 hour' :: interval
          )) AS range
      LEFT JOIN (
        SELECT
          date_trunc('hour', events.created_at) AS hour,
          Count(events.id) AS views
        FROM
          events
          JOIN websites on websites.id = events.website_id
      WHERE
          events.created_at >= date_trunc('day', now())
          AND websites.seed = '${seed}'
        GROUP BY
          hour
      ) AS e ON range.generate_series = e.hour
    ORDER BY
      range
  `);

const thisYearViews = async (seed) =>
  await db.raw(`
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
  `);

const handleGet = async (req, res) => {
  const { seed, range } = req.query;

  let data = {};

  switch (range) {
    case "day":
      data = await thisDayViews(seed);
      break;
    case "year":
      data = await thisYearViews(seed);
      break;
    case "month":
      data = await thisRangeViews("month", seed);
      break;
    case "week":
      data = await thisRangeViews("week", seed);
      break;
    default:
      data = []; // To be fixed
  }

  const series = data.rows.map((dv) => [dv.range, dv.views]);

  return { status: 200, data: series };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withSharedAuth(handle);
