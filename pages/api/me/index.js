const db = require("../../../lib/db_connect");
const { withAuth } = require("../../../utils/hof/withAuth");
const { hash } = require("../../../utils/hash");

const handleGet = (req, res) => ({ status: 200, data: req.accessTokenBody.data });

const handlePut = async (req, res) => {
  const user = req.accessTokenBody.data;
  const { firstname, lastname, email, password } = req.body;

  await db("users")
    .where("email", user.email)
    .where("id", user.id)
    .update({
      firstname: firstname,
      lastname: lastname,
      email: email,
      password: hash(password),
    });

  return { status: 200, data: { message: "User info updated." } };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    case "PUT":
      ({ status, data } = await handlePut(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handle);
