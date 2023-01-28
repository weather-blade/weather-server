import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

let clients: { id: number; res: Response }[] = []; // all open connections

// Server-sent events handler - open the connection and keep it alive
export async function eventsHandler(req: Request, res: Response, next: NextFunction) {
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

  const keepAliveMS = 60 * 1000;
  function keepAlive() {
    // SSE comment for keep alive. Chrome times out after two minutes.
    res.write(":\n\n");
    setTimeout(keepAlive, keepAliveMS);
  }
  setTimeout(keepAlive, keepAliveMS);

  // remove client on connection close
  res.on("close", () => {
    clients = clients.filter((client) => client.id !== clientId);
    console.log(`[SSE] ${clientId} Connection closed`);
  });
}

// push the new reading to all clients
export async function sendEventsToAll(
  newReading: Prisma.ReadingsGetPayload<{ include: { quality: true } }>
) {
  for (const client of clients) {
    client.res.write(`data: ${JSON.stringify(newReading)}\n\n`);
  }
}
