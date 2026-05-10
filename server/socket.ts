import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let _io: Server | null = null;

export function initSocket(server: HTTPServer): Server {
  _io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  _io.on('connection', socket => {
    console.log(`[ws] connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`[ws] disconnected: ${socket.id}`));
  });
  return _io;
}

export function emit(event: string, data?: unknown): void {
  _io?.emit(event, data);
}
