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

      master.listen(port);

      master.once("listening", () => server.emit("listening"));

      return false;
    }

    let oldClose = server.close;

    server.close = function close() {
      process.send({ type: "close" });
      return oldClose.apply(this, arguments);
    };

    process.on("message", (msg, socket) => {
      if (msg !== "sticky:balance" || !socket) return;

      server._connections++;
      socket.server = server;
      server.emit("connection", socket);
    });

    return true;
  }
}
