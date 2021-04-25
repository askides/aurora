const { Website } = require("../../../../models/Website");
const { withAuth } = require("../../../../utils/hof/withAuth");

const handleGet = async (req) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;

  const website = await new Website({ seed: seed, user_id: user.id }).fetch();

  // Boolean to int
  website.shared = +website.shared;

  return { status: 200, data: website };
};

const handlePut = async (req) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;
  const { name, url, shared } = req.body;

  await new Website().where({ seed: seed, user_id: user.id }).save(
    {
      name: name,
      url: url,
      shared: Boolean(Number(shared)),
    },
    { patch: true }
  );

  return { status: 200, data: { message: "Updated." } };
};

const handleDelete = async (req) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;

  await new Website().where("websites.seed", seed).where("user_id", user.id).destroy();

  return { status: 200, data: { message: "Deleted." } };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req));
      break;
    case "PUT":
      ({ status, data } = await handlePut(req, res));
      break;
    // case "DELETE":
    //  ({ status, data } = await handleDelete(req, res));
    // break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handler);
