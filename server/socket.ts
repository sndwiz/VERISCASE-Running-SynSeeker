import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { sql } from "drizzle-orm";
import { db } from "./db";

let io: SocketServer | null = null;

export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function setupSocketIO(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.on("join-chat", async (chatId: string) => {
      if (!chatId || typeof chatId !== "string") return;
      try {
        const result = await db.execute(sql`SELECT id FROM board_chats WHERE id = ${chatId} LIMIT 1`);
        if (result.rows && result.rows.length > 0) {
          socket.join(`chat:${chatId}`);
        }
      } catch {
        socket.join(`chat:${chatId}`);
      }
    });

    socket.on("leave-chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on("typing", (data: { chatId: string; userName: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user-typing", {
        userId,
        userName: data.userName,
        chatId: data.chatId,
      });
    });

    socket.on("stop-typing", (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user-stop-typing", {
        userId,
        chatId: data.chatId,
      });
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function broadcastMessage(chatId: string, message: any) {
  if (io) {
    io.to(`chat:${chatId}`).emit("new-message", message);
  }
}

export function broadcastProposal(chatId: string, proposal: any) {
  if (io) {
    io.to(`chat:${chatId}`).emit("new-proposal", proposal);
  }
}

export function broadcastProposalUpdate(chatId: string, proposal: any) {
  if (io) {
    io.to(`chat:${chatId}`).emit("proposal-updated", proposal);
  }
}
