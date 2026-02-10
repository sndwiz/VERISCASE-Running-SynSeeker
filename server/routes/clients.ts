import type { Express } from "express";
import { storage } from "../storage";
import { insertClientSchema, updateClientSchema } from "@shared/schema";
import { handler, notFound } from "../utils/route-handler";
import { maybePageinate } from "../utils/pagination";

export function registerClientRoutes(app: Express): void {
  app.get("/api/clients", handler(async (req, res) => {
    const clients = await storage.getClients();
    res.json(maybePageinate(clients, req.query));
  }));

  app.get("/api/clients/:id", handler(async (req, res) => {
    const client = await storage.getClient(req.params.id);
    if (!client) return notFound(res, "Client");
    res.json(client);
  }));

  app.post("/api/clients", handler(async (req, res) => {
    const data = insertClientSchema.parse(req.body);
    const client = await storage.createClient(data);
    res.status(201).json(client);
  }));

  app.patch("/api/clients/:id", handler(async (req, res) => {
    const data = updateClientSchema.parse(req.body);
    const client = await storage.updateClient(req.params.id, data);
    if (!client) return notFound(res, "Client");
    res.json(client);
  }));

  app.delete("/api/clients/:id", handler(async (req, res) => {
    const deleted = await storage.deleteClient(req.params.id);
    if (!deleted) return notFound(res, "Client");
    res.status(204).send();
  }));
}
