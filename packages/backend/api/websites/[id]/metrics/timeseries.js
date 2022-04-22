import { TimeseriesController } from "../../../../lib/controllers/timeseries-controller";
import { Router } from "../../../../lib/router";

export default async function handler(request, response) {
  const router = new Router(request, response);

  //await router.use(authentication); TODO
  await router.route("GET", TimeseriesController.index);
  //await router.route("GET", ({ req, res }) => {

  // return res.status(200).json([
  //   { count: 100, timeseries: "2021-11-20T00:00:00.000Z" },
  //   { count: 123, timeseries: "2021-11-20T01:00:00.000Z" },
  //   { count: 233, timeseries: "2021-11-20T02:00:00.000Z" },
  //   { count: 24, timeseries: "2021-11-20T03:00:00.000Z" },
  //   { count: 60, timeseries: "2021-11-20T04:00:00.000Z" },
  //   { count: 34, timeseries: "2021-11-20T05:00:00.000Z" },
  //   { count: 103, timeseries: "2021-11-20T06:00:00.000Z" },
  //   { count: 222, timeseries: "2021-11-20T07:00:00.000Z" },
  //   { count: 234, timeseries: "2021-11-20T08:00:00.000Z" },
  //   { count: 134, timeseries: "2021-11-20T09:00:00.000Z" },
  //   { count: 122, timeseries: "2021-11-20T10:00:00.000Z" },
  //   { count: 124, timeseries: "2021-11-20T11:00:00.000Z" },
  //   { count: 233, timeseries: "2021-11-20T12:00:00.000Z" },
  //   { count: 112, timeseries: "2021-11-20T13:00:00.000Z" },
  //   { count: 112, timeseries: "2021-11-20T14:00:00.000Z" },
  //   { count: 211, timeseries: "2021-11-20T15:00:00.000Z" },
  //   { count: 216, timeseries: "2021-11-20T16:00:00.000Z" },
  //   { count: 123, timeseries: "2021-11-20T17:00:00.000Z" },
  //   { count: 133, timeseries: "2021-11-20T18:00:00.000Z" },
  //   { count: 251, timeseries: "2021-11-20T19:00:00.000Z" },
  //   { count: 192, timeseries: "2021-11-20T20:00:00.000Z" },
  //   { count: 111, timeseries: "2021-11-20T21:00:00.000Z" },
  //   { count: 312, timeseries: "2021-11-20T22:00:00.000Z" },
  //   { count: 14, timeseries: "2021-11-20T23:00:00.000Z" },
  // ]);
  // });

  router.fallback();
}
