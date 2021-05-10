const { withSharedAuth } = require("../../../../utils/hof/withSharedAuth");
const { db } = require("../../../../lib/db_connect");

const performance = async (range, seed) => {
  return await db.raw(`
    SELECT
      COUNT(events.created_at) as cp_views,
      COUNT(DISTINCT events.hash) as cp_unique,
      AVG(events.duration) as cp_visit_duration,
      (
        select
          sum(t.c)
        from
          (
            select
              count(events.id) as c
            from
              events
            JOIN websites ON events.website_id = websites.id
            WHERE
              events.created_at >= DATE_TRUNC('${range}', now())
              AND websites.seed = '${seed}'
              AND events.type = 'pageView'
            group by
              hash
            having
              count(events.id) = 1
          ) as t
      ) as cp_bounces
    FROM
      events
      JOIN websites ON events.website_id = websites.id
    WHERE
      events.created_at >= DATE_TRUNC('${range}', now())
      AND websites.seed = '${seed}'
      AND events.type = 'pageView'
  `);
};

const handleGet = async (req, res) => {
  const { range, seed } = req.query;

  const r = await performance(range, seed);

  const perf = r.rows.reduce((acc, el) => el, {});

  const data = {
    pageViews: {
      cp: perf.cp_views,
    },
    uniqueVisitors: {
      cp: perf.cp_unique,
    },
    bounceRate: {
      cp: perf.cp_bounces,
    },
    visitDuration: {
      cp: Math.round(perf.cp_visit_duration / 1000),
    },
  };

  return { status: 200, data: data };
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
