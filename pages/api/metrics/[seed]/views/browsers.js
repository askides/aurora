const percentage = require("../../../../../utils/percentage");
const { viewsByBrowser } = require("../../../../../lib/queries");
const { isAuthorized, isWebsitePublic } = require("../../../../../utils/authorization");

const handleGet = async (req, res) => {
  const { range, seed } = req.query;

  if (!isAuthorized(req) && !(await isWebsitePublic(seed))) {
    return { status: 401, data: { message: "Unauthorized" } };
  }

  const rows = await viewsByBrowser(range, seed);

  const totalViews = rows.reduce((acc, el) => acc + el.views, 0);

  const data = rows.map((el) => {
    const perc = percentage(el.views, totalViews);

    return {
      element: el.element,
      views: el.views,
      unique: el.unique,
      percentage: perc,
    };
  });

  return { status: 200, data };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data });
};

module.exports = handle;
