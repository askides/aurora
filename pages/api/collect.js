const mongoose = require("mongoose");
const UAParser = require("ua-parser-js");

const response = (statusCode, body) => ({
  statusCode: statusCode,
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json",
  },
});

let connection = null;
const uri = process.env.MONGODB_URI;

exports.handler = async function (event, context) {
  // Only allow POST
  if (event.httpMethod !== "GET") {
    return response(405, { message: "Method Not Allowed" });
  }

  context.callbackWaitsForEmptyEventLoop = false;

  if (connection == null) {
    connection = mongoose.createConnection(uri, {
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // and MongoDB driver buffering
    });

    // `await`ing connection after assigning to the `connection` variable
    // to avoid multiple function calls creating new connectionections
    await connection;

    connection.model(
      "events",
      new mongoose.Schema({
        type: String,
        websiteId: String,
        ua: {
          browser: {
            name: String,
            version: String,
            major: String,
          },
          engine: {
            name: String,
            version: String,
          },
          os: {
            name: String,
            version: String,
          },
          device: {},
        },
        /*
        device: {
          vendor: String,
          model: String,
          type: String,
        },
        */
      })
    );
  }

  const Event = connection.model("events");

  const ua = new UAParser(event.headers["user-agent"]);

  const evt = new Event({
    type: "pageView",
    websiteId: "DX8C92MFBN2OSBF03LF93",
    ua: { ...ua.getResult() },
  });

  try {
    const res = await evt.save();
    return response(200, { ...res, event: event });
  } catch (err) {
    return response(500, { message: err });
  }
};
