import cluster from "cluster";
import _ from "lodash";
import net from "net";
import ip from "ip";
import httpHeaders from "http-headers";

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

  hash(ip) {
    let hash = this.seed;
    for (let i = 0; i < ip.length; i++) {
      let num = ip[i];

      hash += num;
      hash %= 2147483648;
      hash += hash << 10;
      hash %= 2147483648;
      hash ^= hash >> 6;
    }

    hash += hash << 3;
    hash %= 2147483648;
    hash ^= hash >> 11;
    hash += hash << 15;
    hash %= 2147483648;

    return hash >>> 0;
  }

  balance(socket) {
    socket.resume();

    socket.once("close", data => {
      socket.resume();
    });

    socket.once("data", data => {
      let req = httpHeaders(data);

      if (!String(req.headers).includes("multipart/form-data")) socket.pause();

      let ipAdress = ip.toBuffer(
        (req.headers["x-forwarded-for"]
          ? _.split(req.headers["x-forwarded-for"], ",", 1)[0]
          : false) ||
          socket.remoteAddress ||
          "127.0.0.1"
      );

      if (data) {
        data = data.toString("base64");
      }

      this.workers[this.hash(ipAdress) % this.workers.length].send(
        { msg: "sticky:balance", payload: data },
        socket
      );
    });
  }
}

export default Master;
