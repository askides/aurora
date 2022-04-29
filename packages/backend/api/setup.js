import { SetupController } from "../lib/controllers/setup-controller";

const withPreflight = (fn) => async (request, response) => {
  if (request.method === "OPTIONS") {
    return response.status(200).json({
      body: "OK",
    });
  }

  return await fn(request, response);
};

const handler = async (request, response) => {
  const setup = new SetupController(request, response);

  switch (request.method) {
    case "GET":
      return await setup.run("index");
    case "POST":
      return await setup.run("store");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
};

export default withPreflight(handler);
