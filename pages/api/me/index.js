const withAuth = require("../../../utils/with-auth");

const handle = async function (req, res) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  // Return User Data.
  return res.status(200).json({ data: req.accessTokenBody.data });
};

module.exports = withAuth(handle);
