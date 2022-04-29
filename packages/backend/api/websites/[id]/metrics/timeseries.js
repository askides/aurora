import { TimeseriesController } from "../../../../lib/controllers/timeseries-controller";

export default async function handler(request, response) {
  const timeseries = new TimeseriesController(request, response);

  switch (request.method) {
    case "GET":
      return await timeseries.run("index");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
}
