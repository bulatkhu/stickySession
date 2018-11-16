import cluster from "cluster";
import _ from "lodash";
import ip from "ip";
import http from "http";
import httpHeaders from "http-headers";

class Master {
  constructor(props) {
    this.props = props;

    var server = http.createServer();

    server.on("connection", this.balance.bind(this));
    server.listen(...props.listen);

    this.seed = (Math.random() * 0xffffffff) | 0;
    this.workers = [];

    for (var i = 0; i < props.workers; i++) this.spawnWorker();
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

  balance(connection) {
    let buffer = null;
    let packetNumber = 0;
    let ipAdress = null;

    connection.on("data", data => {
      console.log(packetNumber);
      connection.resume();
      if(packetNumber === 0) {
        let req = httpHeaders(data);
        ipAdress = ip.toBuffer(
          (req.headers["x-forwarded-for"]
            ? _.split(req.headers["x-forwarded-for"], ",", 1)[0]
            : undefined) ||
            connection.remoteAddress ||
            "127.0.0.1"
        );
      }
      packetNumber++;
      if(buffer == null) {
        buffer = data;
      }
      else {
        buffer = Buffer.concat([buffer, data]);
      }

      if(data.length < 65536) {
        console.log('go');
        try {
          this.workers[this.hash(ipAdress) % this.workers.length].send(
            { msg: "sticky:balance", payload: buffer.toString("base64") },
            connection
          );
        }
        catch(error) {
          console.log(error);
        }
      }
    });
  }
}

export default Master;
