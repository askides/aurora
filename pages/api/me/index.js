const { default: withAuth } = require("../../../utils/withAuth");

const handle = async function (req, res) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  // Retrieve Data
  const user = req.accessTokenBody.data;

  if (user) {
    // Return User Data.
    return res.status(200).json({ data: user });
  }

  // User false, so not found.
  return res.status(404).json({ message: "Not found" });
};

module.exports = withAuth(handle);
