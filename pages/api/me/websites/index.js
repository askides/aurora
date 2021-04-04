const db = require("../../../../lib/db_connect");
const generateSeed = require("../../../../utils/generate-seed"); // XXX To object module
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

  const seed = generateSeed();

  const website = await db("websites").insert({
    url: url,
    name: name || "nOnAME", // XXX
    seed: seed,
    user_id: user.id,
  });

  return { status: 200, data: website };
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
