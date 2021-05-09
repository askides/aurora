const { serialize } = require("cookie");
const { AUTH_COOKIE } = require("../../../utils/constants");
const { withAuth } = require("../../../utils/hof/withAuth");

const handle = async function (req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const cookie = serialize(AUTH_COOKIE, null, {
    path: "/",
    httpOnly: true,
    sameSite: true,
    maxAge: -1,
  });

  res.setHeader("Set-Cookie", [cookie]);

  return res.status(200).json({ message: "Logout succeded." });
};

module.exports = withAuth(handle);
