const { db } = require("../../../../lib/db_connect");
const { generate } = require("../../../../utils/seeds");
const { withAuth } = require("../../../../utils/hof/withAuth");

const handleGet = async (req, res) => {
  const user = req.accessTokenBody.data;

  const websites = await db("websites")
    .join("users", "websites.user_id", "users.id")
    .where("users.email", user.email);

  return { status: 200, data: websites };
};

const handlePost = async (req, res) => {
  const user = req.accessTokenBody.data;

  const { name, url } = req.body;

  const seed = generate();

  const website = await db("websites")
    .returning("seed")
    .insert({
      url: url,
      name: name || "nOnAME", // XXX
      seed: seed,
      user_id: user.id,
    });

  return { status: 200, data: { seed: website[0] } };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    case "POST":
      ({ status, data } = await handlePost(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handler);
