const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

//function to establish a video stream
function send_video_stream(filepath, req, res) {
  const path = filepath;
  const stat = fs.statSync(path);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(path, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4"
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4"
    };
    res.writeHead(200, head);
    fs.createReadStream(path).pipe(res);
  }
}

//define json file in global scope
let ipMap = fs.readFileSync("ip_map.json");
let ipMapJSON = JSON.parse(ipMap);
console.log(ipMapJSON);

//update the json file whenever it changes
function load_ip_map_json() {
  ipMap = fs.readFileSync("ip_map.json");
  ipMapJSON = JSON.parse(ipMap);
  return ipMapJSON;
}

//watch ip_map.json for changes
fs.watch("./ip_map.json", (event, filename) => {
  if (filename) {
    console.log(`${filename} file Changed`);
    load_ip_map_json();
    console.log(ipMapJSON);
  }
});

//send a video to home route
app.get("/", function(req, res) {
  let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  let ipString = ip.toString();
  console.log(ipMapJSON[ipString]);

  send_video_stream(ipMapJSON[ipString], req, res);
  
});

app.listen(3000, "0.0.0.0", function() {
  console.log("App is running on port 3000");
});
