const { Event } = require("../../../models/Event");
const { Website } = require("../../../models/Website");
const { withCors } = require("../../../utils/hof/withCors");

const handlePost = async (req) => {
  const { id } = req.query;
  const { duration, seed } = JSON.parse(req.body); // Send Beacon Require Parsing

  // Get Website by seed
  const website = await Website.where("seed", seed).fetch();

  if (!website) {
    return { status: 422 };
  }

  await new Event()
    .where({ id: id, website_id: website.id })
    .save({ duration: duration }, { patch: true });

  return { status: 200 };
};

const handle = async function (req, res) {
  let { status } = {};

  switch (req.method) {
    case "POST":
      ({ status } = await handlePost(req));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status);
};

module.exports = withCors(handle);
