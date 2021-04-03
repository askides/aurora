const jwt = require("jsonwebtoken");
const { parse } = require("cookie");

const { AUTH_COOKIE } = require("./constants");
const prisma = require("../lib/prisma");

const verifyJwt = ({ accessToken }) => {
  try {
    return jwt.verify(accessToken, process.env.JWT_SECRET);
  } catch (err) {
    return false;
  }
};

// TODO VERIFY USER EXISTS ON DATABASE
const isAuthorized = (req) => {
  const { cookie } = req.headers;

  const allCookies = parse(cookie || "");

  if (!allCookies.hasOwnProperty(AUTH_COOKIE)) {
    return false;
  }

  const accessToken = allCookies[AUTH_COOKIE];

  if (!verifyJwt({ accessToken })) {
    return false;
  }

  return true;
};

const isWebsitePublic = async (seed) => {
  const ws = await prisma.website.findFirst({
    where: {
      seed: seed,
    },
  });

  return ws.shared;
};

module.exports = { isAuthorized, isWebsitePublic };
