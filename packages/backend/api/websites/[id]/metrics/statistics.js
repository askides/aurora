import { StatisticsController } from "../../../../lib/controllers/statistics-controller";

export default async function handler(request, response) {
  const statistic = new StatisticsController(request, response);

  switch (request.method) {
    case "GET":
      return await statistic.run("index");
    default:
      return response.status(405).json({ error: "Method not allowed" });
  }
}
