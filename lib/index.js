import cluster from "cluster";
import os from "os";
import Master from "./master";

export default class StickySession {
  constructor(props = {}) {
    this.props = props;
  }

  listen() {
    if (cluster.isMaster) {
      let workerCount = this.props.workers || os.cpus().length;

      let master = new Master(this.props);

      return true;
    }

    return false;
  }

  listenWorker(server) {
    server.listen(0, "localhost");

    process.on("message", (data, connection) => {
      if (data.msg !== "sticky:balance" || !connection) return;

      server.emit("connection", connection);

      connection.emit("data", Buffer.from(data.buffer));

      connection.resume();
    });
  }
}
