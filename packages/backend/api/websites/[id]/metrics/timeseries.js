import { TimeseriesController } from "../../../../lib/controllers/timeseries-controller";
import { withPreflight } from "../../../../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const timeseries = new TimeseriesController(request, response);

  switch (request.method) {
    case "GET":
      return await timeseries.run("index");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
};

export default withPreflight(handler);
