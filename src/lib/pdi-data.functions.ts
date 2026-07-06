import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchCollaborators,
  insertCollaborator,
  updateCollaboratorRow,
  removeCollaborator,
  fetchCollaborator,
  fetchPdisForCollaborator,
  insertPdi,
  removePdi,
  fetchPdi,
  savePdiRow,
  fetchAuditLog,
  type Collaborator,
  type Pdi,
  type PdiWithCollaborator,
  type AuditEntry,
  type Json,
} from "./pdi-data.server";

export type { Collaborator, Pdi, PdiWithCollaborator, AuditEntry, Json };

const collaboratorPayload = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().nullable().optional(),
  department: z.string().trim().nullable().optional(),
  manager: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
});

export const listCollaborators = createServerFn({ method: "GET" }).handler(
  async (): Promise<Collaborator[]> => fetchCollaborators(),
);

export const createCollaborator = createServerFn({ method: "POST" })
  .inputValidator(collaboratorPayload)
  .handler(async ({ data }) => insertCollaborator(data));

export const updateCollaborator = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(collaboratorPayload))
  .handler(async ({ data }) => updateCollaboratorRow(data.id, data));

export const deleteCollaborator = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => removeCollaborator(data.id));

export const getCollaborator = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => fetchCollaborator(data.id));

export const listPdisForCollaborator = createServerFn({ method: "GET" })
  .inputValidator(z.object({ collaboratorId: z.string().uuid() }))
  .handler(async ({ data }): Promise<Pdi[]> => fetchPdisForCollaborator(data.collaboratorId));

export const createPdi = createServerFn({ method: "POST" })
  .inputValidator(z.object({ collaboratorId: z.string().uuid() }))
  .handler(async ({ data }) => insertPdi(data.collaboratorId));

export const deletePdi = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => removePdi(data.id));

export const getPdi = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<PdiWithCollaborator | null> => fetchPdi(data.id));

export const savePdi = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      period: z.string(),
      strengths: z.string(),
      improvements: z.string(),
      goals: z.array(z.record(z.string(), z.custom<Json>())),
      changes: z.array(z.object({ field: z.string(), before: z.custom<Json>(), after: z.custom<Json>() })),
      summary: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => savePdiRow(data));

export const listAuditLog = createServerFn({ method: "GET" })
  .inputValidator(z.object({ pdiId: z.string().uuid() }))
  .handler(async ({ data }): Promise<AuditEntry[]> => fetchAuditLog(data.pdiId));
