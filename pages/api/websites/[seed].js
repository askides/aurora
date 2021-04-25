const { Website } = require("../../../models/Website");
const { withSharedAuth } = require("../../../utils/hof/withSharedAuth");

const handleGet = async (req) => {
  const { seed } = req.query;

  const website = await new Website().where("seed", seed).fetch();

  return { status: 200, data: website };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withSharedAuth(handler);
