const inquirer = require("inquirer");
const { hash } = require("../../utils/hash");
const { db } = require("../db_connect");

require("dotenv").config();

const requireLetterAndNumber = (value) => {
  if (/\w/.test(value) && /\d/.test(value)) {
    return true;
  }

  return "Password need to have at least a letter and a number";
};

const email = (value) => {
  if (/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
    return true;
  }

  return "Ops.. this is not a valid email.. 📬";
};

console.log("Welcome to the Aurora setup! 🌈\n");

// Checking ENV Vars exists
if (!process.env.DB_URL || process.env.DB_URL === "") {
  console.log("⚠️  No DB_URL found! Please compile your .env file!");
  return false;
}

console.log("Very little information is needed to get started! 🐠\n");

inquirer
  .prompt([
    {
      type: "text",
      message: "Firstname:",
      name: "firstname",
      validate: (value) => value !== "",
    },
    {
      type: "text",
      message: "Lastname:",
      name: "lastname",
      validate: (value) => value !== "",
    },
    {
      type: "email",
      message: "Your Email (will be used to log in):",
      name: "email",
      validate: email,
    },
    {
      type: "password",
      message: "A strong password:",
      name: "password",
      mask: "*",
      validate: requireLetterAndNumber,
    },
  ])
  .then((answers) => {
    const data = { ...answers, password: hash(answers.password) };

    db("users")
      .insert(data)
      .returning("id")
      .then((id) => {
        db("users")
          .where("id", ...id)
          .then((inserted) => {
            console.log("\nNew User Made!", ...inserted);
            console.log("\nNow you can login and start using Aurora! 🌈");
          });
      })
      .catch((err) => console.log(err));
  });
