const { Website } = require("../../../../models/Website");
const { generate } = require("../../../../utils/seeds");
const { withAuth } = require("../../../../utils/hof/withAuth");

const handleGet = async (req) => {
  const user = req.accessTokenBody.data;

  const websites = await new Website().where("user_id", user.id).fetchAll();

  return { status: 200, data: websites };
};

const handlePost = async (req) => {
  const user = req.accessTokenBody.data;

  const { name, url, shared } = req.body;

  const seed = generate();

  const website = await new Website({
    url: url,
    name: name,
    seed: seed,
    shared: Boolean(Number(shared)),
    user_id: user.id,
  }).save();

  return { status: 201, data: website };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req));
      break;
    case "POST":
      ({ status, data } = await handlePost(req));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handler);
