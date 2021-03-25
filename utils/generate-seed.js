const { v4: uuidv4 } = require("uuid");
const md5 = require("md5");

const generateSeed = () => md5(uuidv4());

module.exports = generateSeed;
