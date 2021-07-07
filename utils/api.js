const axios = require("axios");

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { Accept: "application/json" },
  withCredentials: true,
});

client.interceptors.request.use(
  (request) => {
    if (localStorage.getItem("aurora_jwt") !== null) {
      request.headers.common["Authorization"] = `Bearer ${localStorage.getItem("aurora_jwt")}`;
    }
    return request;
  },
  (err) => {
    return Promise.reject(err);
  }
);

module.exports = { client };
