import cluster from "cluster";
import net from "net";
import headerParse from "./headerParse";
import ipHash from "./ipHash";

class Master extends net.Server {
  constructor(props) {
    super(props);

    this.props = props;

    net.Server.call(
      this,
      {
        pauseOnConnect: true
      },
      this.balance
    );

    this.seed = (Math.random() * 0xffffffff) | 0;
    this.workers = [];

    this.once("listening", function() {
      for (var i = 0; i < props.workers; i++) this.spawnWorker();
    });
  }

  spawnWorker() {
    let worker = cluster.fork(this.props.env || {});

    worker.on("exit", () => this.respawn(worker));

    worker.on("message", msg => {
      if (msg.type === "close") this.respawn(worker);
    });

    this.workers.push(worker);
  }

  respawn(worker) {
    let index = this.workers.indexOf(worker);
    if (index !== -1) this.workers.splice(index, 1);
    this.spawnWorker();
  }

  balance(socket) {
    socket.resume();

    let workers = this.workers;

    return socket.on("data", function(data) {
      this.pause();
      let pos = headerParse(data, "x-forwarded-for"),
        hash;
      if (pos === null) {
        hash = ipHash.hashString(socket.remoteAddress || "127.0.0.1");
      } else {
        hash = ipHash.hashBytes(data, pos.start + 1, pos.end);
      }

      workers[hash % workers.length].send("sticky:balance", socket);
    });
  }
}

export default Master;
