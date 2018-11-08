import http from "http";
import cluster from "cluster";
import express from "express";
import multipart from "connect-multiparty";
import StickySession from "../lib";

const upload = multipart();

let stickySession = new StickySession({
  listen: [3000],
  workers: 1
});

const app = express();

let server = http.Server(app);

app.get("/", (req, res) => {
  res.send(`worker id ${cluster.worker.id}`);
});

app.get("/upload", (req, res) => {
  res.send(
    `<form enctype="multipart/form-data" method="post"><input class="form-control" name="images" placeholder="Картинка" type="file"><button type="submit">Upload</button></form>`
  );
});

app.post("/upload", upload, (req, res) => {
  res.json(req.files);
});

if (!stickySession.listen(server)) {
  // Master code
  server.once("listening", function() {
    console.log("server started on 3000 port");
  });
} else {
  // Worker code
}
