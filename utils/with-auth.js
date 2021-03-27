const jwt = require("jsonwebtoken");
const { parse } = require("cookie");
const { AUTH_COOKIE } = require("./constants");

const verifyJwt = ({ accessToken }) => {
  try {
    return jwt.verify(accessToken, process.env.JWT_SECRET);
  } catch (err) {
    return false;
  }
};

// TODO VERIFY USER EXISTS ON DATABASE
const withAuth = (fn) => (req, res) => {
  const { cookie } = req.headers;

  const allCookies = parse(cookie || "");

  if (!allCookies.hasOwnProperty(AUTH_COOKIE)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const accessToken = allCookies[AUTH_COOKIE];

  if (!verifyJwt({ accessToken })) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const enhancedReq = { ...req, accessTokenBody: verifyJwt({ accessToken }) };

  return fn(enhancedReq, res);
};

module.exports = withAuth;
