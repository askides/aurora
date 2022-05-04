import { StatisticsController } from "../../../../lib/controllers/statistics-controller";
import { withPreflight } from "../../../../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const statistic = new StatisticsController(request, response);

  switch (request.method) {
    case "GET":
      return await statistic.run("index");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
};

export default withPreflight(handler);
