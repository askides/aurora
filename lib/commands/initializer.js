const { hash } = require("../../utils/hash");
const { db } = require("../db_connect");

console.log("Welcome to the Aurora setup! 🌈\n");

// Checking ENV Vars exists
if (!process.env.DB_URL || process.env.DB_URL === "") {
  console.log("⚠️  No DB_URL found! Please compile your .env file!");
  return false;
}

console.log("Obtaining arguments.. 🐠\n");

const [email, password] = process.argv.slice(2);

console.log("Inserting user..\n");

const data = { firstname: "Change", lastname: "Me", email: email, password: hash(password) };

db("users")
  .insert(data)
  .returning("id")
  .then((id) => {
    db("users")
      .where("id", ...id)
      .then((inserted) => {
        console.log("New User Made!", ...inserted);
        console.log("\nNow you can login and start using Aurora! 🌈");
      });
  })
  .catch((err) => console.log(err));
