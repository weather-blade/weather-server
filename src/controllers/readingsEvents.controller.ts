import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

let clients: { id: number; res: Response }[] = []; // all open connections

// Server-sent events handler - open the connection and keep it alive
export async function readingsEventsController(req: Request, res: Response, next: NextFunction) {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  res.writeHead(200, headers);

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res, // save the session response object
  };
  clients.push(newClient);
  console.log(`[SSE] ${clientId} Connection opened`);
  console.log(`[SSE] Number of connected clients: ${clients.length}`);

  const keepAliveMS = 30 * 1000;
  let connectionOpen = true;
  async function keepAlive() {
    if (!connectionOpen) return; // prevent any more recursion if the connection was closed
    try {
      // Send keep-alive message with just SSE comment. Fly.io free plan times out after 60s of inactivity.
      res.write(":\n\n");
      res.flush(); // send the partially compressed response
    } catch (error) {
      console.error(error);
    }

    setTimeout(keepAlive, keepAliveMS);
  }
  setTimeout(keepAlive, keepAliveMS);

  // remove client on connection close
  res.on("close", () => {
    clients = clients.filter((client) => client.id !== clientId);
    // make 100% sure the connection is closed to prevent server memory leaks
    res.end();
    res.socket?.destroy();

    // stop sending keep-alive messages and end the recursive loop (another potential memory leak)
    connectionOpen = false;
    console.log(`[SSE] ${clientId} Connection closed`);
    console.log(`[SSE] Number of connected clients: ${clients.length}`);
  });
}

// push the new reading to all clients
export function sendEventsToAll(newReading: Prisma.ReadingsGetPayload<null>) {
  for (const client of clients) {
    try {
      client.res.write(`data: ${JSON.stringify(newReading)}\n\n`);
      client.res.flush(); // send the partially compressed response
    } catch (error) {
      console.error(error);
    }
  }
}
