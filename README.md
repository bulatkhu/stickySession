# stickySession

A simple performant way to use [socket.io](https://socket.io) with a [cluster](https://nodejs.org/docs/latest/api/cluster.html).

## Installation
```bash
npm install @kiyasov/sticky-session --save-dev
```

## Usage

```javascript
import http from "http";
import cluster from "cluster";
import StickySession from "../lib";
import SocketIO from "socket.io";
import express from "express";
import SocketIORedis from "socket.io-redis";

let stickySession = new StickySession({
  listen: [3000, '127.0.0.1'],
  workers: 4
});

const app = express();
const server = http.Server(app);
const socket = SocketIO(server);

socket.adapter(SocketIORedis({ host: '127.0.0.1', port: 6379 }));

if (!stickySession.listen(server)) {
  // Master code
  server.once("listening", () => console.log("server started on 3000 port"));
} else {
  socket.on("connection", client => {
      console.log('a user connected');
      
      client.on("disconnect", client => {
        console.log('a user disconnect');
      });
  });
}
```
Simple
