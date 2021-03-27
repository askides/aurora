const jwt = require("jsonwebtoken");
const { parse } = require("cookie");
const { AUTH_COOKIE } = require("../../utils/constants");

const verifyJwt = ({ accessToken }) => {
  try {
    return jwt.verify(accessToken, process.env.JWT_SECRET);
  } catch (err) {
    return false;
  }
};

const redirect = (res, path) => {
  res.statusCode = 302;
  res.setHeader("Location", path);
  return false;
};

export function withAuth(getServerSideProps) {
  return async (context) => {
    const { req, res } = context;

    const { cookie } = req.headers;

    const allCookies = parse(cookie);

    if (!allCookies.hasOwnProperty(AUTH_COOKIE)) {
      return redirect(res, "/auth/login");
    }

    const accessToken = allCookies[AUTH_COOKIE];

    if (!verifyJwt({ accessToken })) {
      return redirect(res, "/auth/login");
    }

    return await getServerSideProps(context); // Continue on to call `getServerSideProps` logic
  };
}
