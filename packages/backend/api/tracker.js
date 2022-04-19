const fs = require("fs");
const path = require("path");

export default function handler(req, res) {
  const filePath = path.join(__dirname, "_files", "tracker.js");

  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    "Content-Type": "text/javascript",
    "Content-Length": stat.size,
  });

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
}
