const { v4: uuidv4 } = require("uuid");
const md5 = require("md5");

const generate = () => md5(uuidv4());

module.exports = { generate };
