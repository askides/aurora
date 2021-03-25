const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const makeJwt = ({ data }) => jwt.sign({ data: data }, process.env.JWT_SECRET, { expiresIn: 3600 });

const attempt = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

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

    return res.status(200).json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  }

  // Set unauthorized.
  return res.status(401).json({ message: "Unauthorized" });
};
