const jwt = require("jsonwebtoken");
const { serialize } = require("cookie");

const { AUTH_COOKIE, AUTH_COOKIE_LIFETIME } = require("../../../utils/constants");
const { verify } = require("../../../utils/hash");
const db = require("../../../lib/db_connect");

const makeJwt = ({ data }) =>
  jwt.sign({ data: data }, process.env.JWT_SECRET, { expiresIn: AUTH_COOKIE_LIFETIME });

const attempt = async ({ email, password }) => {
  const user = await db("users").where("email", email).first();

  if (user && verify(password, user.password)) {
    return {
      id: user.id,
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
