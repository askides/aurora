const { User } = require("../../../models/User");
const { withAuth } = require("../../../utils/hof/withAuth");
const { hash } = require("../../../utils/hash");

const handleGet = (req) => ({ status: 200, data: req.accessTokenBody.data });

const handlePut = async (req) => {
  const user = req.accessTokenBody.data;
  const { firstname, lastname, email, password } = req.body;

  await new User({ id: user.id, email: user.email }).save(
    {
      firstname: firstname,
      lastname: lastname,
      email: email,
      ...(password !== undefined && { password: hash(password) }),
    },
    { patch: true }
  );

  return { status: 200, data: { message: "User info updated." } };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req));
      break;
    case "PUT":
      ({ status, data } = await handlePut(req));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handle);
