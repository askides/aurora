const db = require("../../../../lib/db_connect");
const { withAuth } = require("../../../../utils/hof/withAuth");

const handleGet = async (req, res) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;

  const website = await db("websites")
    .where("websites.seed", seed)
    .where("user_id", user.id)
    .first();

  // Boolean to int
  website.shared = +website.shared;

  return { status: 200, data: website };
};

const handlePut = async (req, res) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;
  const { name, url, shared } = req.body;

  await db("websites")
    .where("websites.seed", seed)
    .where("user_id", user.id)
    .update({
      name: name,
      url: url,
      shared: Boolean(Number(shared)),
    });

  return { status: 200, data: { message: "Updated." } };
};

const handleDelete = async (req, res) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;

  await db("websites").where("websites.seed", seed).where("user_id", user.id).del();

  return { status: 200, data: { message: "Deleted." } };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    case "PUT":
      ({ status, data } = await handlePut(req, res));
      break;
    case "DELETE":
      ({ status, data } = await handleDelete(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handler);
