const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const pageViewsPerformance = async () => {
  return await prisma.$queryRaw`
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
          "Event"
        where
          "createdAt" >= (now() - '1 month' :: interval)
      ) as currentPerformance CROSS
      JOIN (
        select
          count(id) as c
        from
          "Event"
        where
          "createdAt" BETWEEN (now() - '2 month' :: interval)
          and (now() - '1 month' :: interval)
      ) as lastPerformance
  `;
};

const uniqueVisitorsPerformance = async () => {
  return await prisma.$queryRaw`
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
          "Event"
        where
          "createdAt" >= (now() - '1 month' :: interval)
      ) as currentPerformance CROSS
      JOIN (
        select
          count(DISTINCT hash) as c
        from
          "Event"
        where
          "createdAt" BETWEEN (now() - '2 month' :: interval)
          and (now() - '1 month' :: interval)
      ) as lastPerformance
  `;
};

const bounceRatePerformance = async () => {
  return await prisma.$queryRaw`
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
                      "Event"
                    group by
                      hash
                    having
                      count(id) = 1
                  ) as t
              ) as uniqueViews
            from
              "Event"
            where
              "createdAt" >= (now() - '1 month' :: interval)
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
                      "Event"
                    group by
                      hash
                    having
                      count(id) = 1
                  ) as t
              ) as uniqueViews
            from
              "Event"
            where
              "createdAt" BETWEEN (now() - '2 month' :: interval)
              and (now() - '1 month' :: interval)
          ) as x
      ) as lastPerformance
  `;
};

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range } = req.query;

  const pvpp = pageViewsPerformance()
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const uvpp = uniqueVisitorsPerformance()
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const brpp = bounceRatePerformance()
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
