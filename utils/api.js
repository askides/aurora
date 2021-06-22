const axios = require("axios");

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { Accept: "application/json" },
  withCredentials: true,
});

module.exports = { client };
