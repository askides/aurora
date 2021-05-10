const { withSharedAuth } = require("../../../../../utils/hof/withSharedAuth");
const { db } = require("../../../../../lib/db_connect");

const thisRangeViews = async (seed, range, factor) => {
  return await db.raw(`
    SELECT
      range.generate_series as range,
      SUM(
        COALESCE(e.views, 0)
      ) AS views
    FROM
      (
        SELECT
          generate_series(
            date_trunc('${range}', now()),
            date_trunc('${range}', now()) + '1 ${range}' :: interval - '1 ${factor}' :: interval,
            '1 ${factor}' :: interval
          ):: timestamptz
      ) as range
      LEFT JOIN (
        SELECT
          events.created_at AS day,
          COUNT(events.id) AS views
        FROM
          events
          JOIN websites on websites.id = events.website_id
        WHERE
          websites.seed = '${seed}'
        AND
          events.type = 'pageView'
        GROUP BY
          day
      ) AS e ON range.generate_series = date_trunc('${factor}', e.day)
    GROUP BY
      range
    ORDER BY
      range
  `);
};

const handleGet = async (req, res) => {
  const { seed, range } = req.query;

  let data = {};

  switch (range) {
    case "day":
      data = await thisRangeViews(seed, "day", "hour");
      break;
    case "year":
      data = await thisRangeViews(seed, "year", "month");
      break;
    case "month":
      data = await thisRangeViews(seed, "month", "day");
      break;
    case "week":
      data = await thisRangeViews(seed, "week", "day");
      break;
    default:
      throw new Error("Not a valid option..");
  }

  const labels = data.rows.map((el) => el.range);
  const values = data.rows.map((el) => el.views);

  const response = {
    labels: labels,
    series: [
      {
        name: "visits",
        data: values,
      },
    ],
  };

  return { status: 200, data: response };
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
