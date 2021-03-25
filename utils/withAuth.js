const jwt = require("jsonwebtoken");

const verifyJwt = ({ accessToken }) => {
  try {
    return jwt.verify(accessToken, process.env.JWT_SECRET);
  } catch (err) {
    return false;
  }
};

// TODO VERIFY USER EXISTS ON DATABASE
const withAuth = (fn) => (req, res) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [tokenType, accessToken] = authorization.split(" ");

  if (tokenType !== "Bearer" || !verifyJwt({ accessToken })) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const enhancedReq = { ...req, accessTokenBody: verifyJwt({ accessToken }) };

  return fn(enhancedReq, res);
};

export default withAuth;
