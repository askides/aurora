const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const pageViewsPerformance = async (range) => {
  return await prisma.$queryRaw(`
    select
      currentPerformance.c as cp,
      lastPerformance.c as lp,
      (
        (
          (
            currentPerformance.c - lastPerformance.c
          ):: float / (CASE lastPerformance.c WHEN 0 THEN 1 ELSE lastPerformance.c END) :: float
        )* 100
      ) inc
    from
      (
        select
          count(id) as c
        from
          "events"
        where
          "created_at" >= (now() - '1 ${range}' :: interval)
      ) as currentPerformance CROSS
      JOIN (
        select
          count(id) as c
        from
          "events"
        where
          "created_at" BETWEEN (now() - '2 ${range}' :: interval)
          and (now() - '1 ${range}' :: interval)
      ) as lastPerformance
  `);
};

const uniqueVisitorsPerformance = async (range) => {
  return await prisma.$queryRaw(`
    select
      currentPerformance.c as cp,
      lastPerformance.c as lp,
      (
        (
          (
            currentPerformance.c - lastPerformance.c
          ):: float / (CASE lastPerformance.c WHEN 0 THEN 1 ELSE lastPerformance.c END) :: float
        )* 100
      ) inc
    from
      (
        select
          count(DISTINCT hash) as c
        from
          "events"
        where
          "created_at" >= (now() - '1 ${range}' :: interval)
      ) as currentPerformance CROSS
      JOIN (
        select
          count(DISTINCT hash) as c
        from
          "events"
        where
          "created_at" BETWEEN (now() - '2 ${range}' :: interval)
          and (now() - '1 ${range}' :: interval)
      ) as lastPerformance
  `);
};

const bounceRatePerformance = async (range) => {
  return await prisma.$queryRaw(`
    select
      currentPerformance.c as cp,
      lastPerformance.c as lp,
      (
        (
          (
            currentPerformance.c - lastPerformance.c
          ):: float / (
            CASE lastPerformance.c WHEN 0 THEN 1 ELSE lastPerformance.c END
          ) :: float
        )* 100
      ) inc
    from
      (
        select
          CASE totalViews WHEN 0 THEN 0 ELSE round(
            (
              (uniqueViews / totalViews) * 100
            ),
            2
          ) END as c
        from
          (
            select
              count(id) as totalViews,
              (
                select
                  sum(t.c)
                from
                  (
                    select
                      count(id) as c
                    from
                      "events"
                    group by
                      hash
                    having
                      count(id) = 1
                  ) as t
              ) as uniqueViews
            from
              "events"
            where
              "created_at" >= (now() - '1 ${range}' :: interval)
          ) as x
      ) as currentPerformance CROSS
      JOIN (
        select
          CASE totalViews WHEN 0 THEN 0 ELSE round(
            (
              (uniqueViews / totalViews) * 100
            ),
            2
          ) END as c
        from
          (
            select
              count(id) as totalViews,
              (
                select
                  sum(t.c)
                from
                  (
                    select
                      count(id) as c
                    from
                      "events"
                    group by
                      hash
                    having
                      count(id) = 1
                  ) as t
              ) as uniqueViews
            from
              "events"
            where
              "created_at" BETWEEN (now() - '2 ${range}' :: interval)
              and (now() - '1 ${range}' :: interval)
          ) as x
      ) as lastPerformance
  `);
};

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range } = req.query;

  const r = range.replace("this_", ""); /// XXX TO CHECK VALUES

  const pvpp = pageViewsPerformance(r)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const uvpp = uniqueVisitorsPerformance(r)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const brpp = bounceRatePerformance(r)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  return await Promise.all([pvpp, uvpp, brpp]).then(([pvp, uvp, brp]) =>
    res.json({
      data: {
        pageViews: pvp[0], // XXX
        uniqueVisitors: uvp[0], // XXX
        bounceRate: brp[0], // XXX
      },
    })
  );
};
