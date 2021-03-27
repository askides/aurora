const bcrypt = require("bcryptjs");

const hash = (plainText) => bcrypt.hashSync(plainText, 10);

const verify = (plainText, hashText) => bcrypt.compareSync(plainText, hashText);

module.exports = { hash, verify };
