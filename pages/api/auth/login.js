const jwt = require("jsonwebtoken");
const { serialize } = require("cookie");
const { PrismaClient } = require("@prisma/client");
const { AUTH_COOKIE, AUTH_COOKIE_LIFETIME } = require("../../../utils/constants");

const prisma = new PrismaClient();

const makeJwt = ({ data }) =>
  jwt.sign({ data: data }, process.env.JWT_SECRET, { expiresIn: AUTH_COOKIE_LIFETIME });

const attempt = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  await prisma.$disconnect();

  if (user && true /* XXX password === "password" */) {
    return {
      email: user.email,
    };
  }

  return false;
};

const login = async ({ email, password }) => {
  const user = await attempt({ email, password });

  if (user) {
    return user;
  }

  return false;
};

module.exports = async function (req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { email, password } = req.body;

  const user = await login({ email, password });

  if (user) {
    const accessToken = makeJwt({ data: user });

    const cookie = serialize(AUTH_COOKIE, accessToken, {
      path: "/",
      httpOnly: true,
      sameSite: true,
      maxAge: AUTH_COOKIE_LIFETIME,
    });

    res.setHeader("Set-Cookie", [cookie]);

    return res.status(200).json({ access_token: accessToken });
  }

  // Set unauthorized.
  return res.status(401).json({ message: "Unauthorized" });
};