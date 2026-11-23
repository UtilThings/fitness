import { createServer, type Socket } from "node:net";

export type CapturedMail = { recipient: string; mime: string };

export async function startSmtpCapture(messages: CapturedMail[], port = 0) {
  const clients = new Set<Socket>();
  const server = createServer((socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => socket.destroy());
    socket.setTimeout(5_000, () => socket.destroy());
    socket.setEncoding("utf8");
    let buffer = "";
    let recipient = "";
    let data: string[] | undefined;
    socket.write("220 localhost SMTP capture\r\n");
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let end: number;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === ".") {
            messages.push({ recipient, mime: data.join("\r\n") });
            data = undefined;
            socket.write("250 Capturado\r\n");
          } else {
            data.push(line.startsWith("..") ? line.slice(1) : line);
          }
        } else if (/^RCPT TO:\s*<[^>]+>$/i.test(line)) {
          recipient = line.match(/<([^>]+)>/)![1]!;
          socket.write("250 OK\r\n");
        } else if (line === "DATA") {
          data = [];
          socket.write("354 Envíe el mensaje\r\n");
        } else if (line === "QUIT") {
          socket.end("221 Hasta luego\r\n");
        } else {
          socket.write("250 OK\r\n");
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    port: (server.address() as { port: number }).port,
    close: () => new Promise<void>((resolve) => {
      for (const socket of clients) socket.destroy();
      server.close(() => resolve());
    }),
  };
}
