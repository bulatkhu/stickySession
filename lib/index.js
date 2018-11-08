import cluster from "cluster";
import os from "os";
import Master from "./master";

export default class StickySession {
  constructor(props = {}) {
    this.props = props;
  }

  listen(server) {
    if (cluster.isMaster) {
      let workerCount = this.props.workers || os.cpus().length;

      let master = new Master(this.props);

      master.listen(...this.props.listen);

      master.once("listening", () => server.emit("listening"));

      return false;
    }

    let oldClose = server.close;

    server.close = function close() {
      process.send({ type: "close" });
      return oldClose.apply(this, arguments);
    };

    process.on("message", (data, socket) => {
      if (data.msg !== "sticky:balance" || !socket) return;

      if (data.payload) {
        socket.unshift(new Buffer(data.payload, "base64"));
      }

      server.emit("connection", socket);
    });

    return true;
  }
}
