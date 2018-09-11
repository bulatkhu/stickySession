import cluster from "cluster";
import ip from "ip";
import net from "net";

class Master extends net.Server {
  constructor(props) {
      super(props);

    net.Server.call(
      this,
      {
        pauseOnConnect: true
      },
      this.balance
    );

    this.seed = (Math.random() * 0xffffffff) | 0;
    this.workers = [];

    debug("master seed=%d", this.seed);

    this.once("listening", function() {
      debug("master listening on %j", this.address());

      for (var i = 0; i < props.workerCount; i++) this.spawnWorker();
    });
  }

  hash(ip) {
    var hash = this.seed;
    for (var i = 0; i < ip.length; i++) {
      var num = ip[i];

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

  spawnWorker() {
    let worker = cluster.fork(this.props.env);

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
    let addr = ip.toBuffer(
      socket.remoteAddress ||
        socket.handshake.headers["x-forwarded-for"] ||
        "127.0.0.1"
    );
    let hash = this.hash(addr);

    this.workers[hash % this.workers.length].send("sticky:balance", socket);
  }
}


export default Master;
