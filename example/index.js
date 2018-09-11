import http from "http";
import cluster from "cluster";
import StickySession from "../lib";

let stickySession = new StickySession({
  listen: [3000],
  workers: 1
});

let server = require("http").createServer(function(req, res) {
  res.end("worker: " + cluster.worker.id);
});

if (!stickySession.listen(server)) {
  // Master code
  server.once("listening", function() {
    console.log("server started on 3000 port");
  });
} else {
  // Worker code
}
