import http from "http";
import cluster from "cluster";
import express from "express";
import multipart from "connect-multiparty";
import StickySession from "../lib";

const upload = multipart();

let stickySession = new StickySession({
  listen: [3000],
  workers: 3
});

if (stickySession.listen()) {
  console.log("server started on 3000 port");
} else {
  const app = express();

  let server = http.createServer(app);

  app.get("/", (req, res) => {
    console.log("Главная");
    res.send(`worker id ${cluster.worker.id}`);
  });

  app.get("/upload", (req, res) => {
    res.send(
      `<form enctype="multipart/form-data" method="post"><input class="form-control" name="images" placeholder="Картинка" type="file"><input class="form-control" name="background" placeholder="Картинка" type="file"><button type="submit">Upload</button></form>`
    );
  });

  app.post("/upload", upload, (req, res) => {
    res.json(req.files);
  });

  stickySession.listenWorker(server);

  server.on("connection", () =>
    console.log(
      "Новый коннект",
      `worker ${cluster.worker.id} pid ${process.pid} started`
    )
  );

  console.log(`worker ${cluster.worker.id} pid ${process.pid} started`);
}
