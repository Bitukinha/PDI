import { query, queryOne } from "./db.server";
import { requireUserId } from "./auth.server";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
export type Goal = Record<string, Json>;

export type Collaborator = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
  manager: string | null;
  email: string | null;
  pdi_count: number;
};

export type CollaboratorPayload = {
  name: string;
  role?: string | null;
  department?: string | null;
  manager?: string | null;
  email?: string | null;
};

export type Pdi = {
  id: string;
  period: string | null;
  strengths: string | null;
  improvements: string | null;
  goals: Goal[];
  updated_at: string;
};

export type PdiWithCollaborator = {
  id: string;
  period: string;
  strengths: string;
  improvements: string;
  goals: Goal[];
  collaborator: { id: string; name: string; role: string | null; department: string | null; manager: string | null };
};

export type AuditEntry = {
  id: string;
  action: string;
  summary: string | null;
  changes: { field: string; before: Json; after: Json }[];
  created_at: string;
};

export async function fetchCollaborators(): Promise<Collaborator[]> {
  const userId = await requireUserId();
  return query<Collaborator>(
    `SELECT c.id, c.name, c.role, c.department, c.manager, c.email,
            COUNT(p.id)::int AS pdi_count
     FROM collaborators c
     LEFT JOIN pdis p ON p.collaborator_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [userId],
  );
}

export async function insertCollaborator(payload: CollaboratorPayload) {
  const userId = await requireUserId();
  return queryOne<{ id: string }>(
    `INSERT INTO collaborators (user_id, name, role, department, manager, email)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, payload.name, payload.role || null, payload.department || null, payload.manager || null, payload.email || null],
  );
}

export async function updateCollaboratorRow(id: string, payload: CollaboratorPayload) {
  const userId = await requireUserId();
  await query(
    `UPDATE collaborators SET name = $1, role = $2, department = $3, manager = $4, email = $5
     WHERE id = $6 AND user_id = $7`,
    [payload.name, payload.role || null, payload.department || null, payload.manager || null, payload.email || null, id, userId],
  );
  return { success: true };
}

export async function removeCollaborator(id: string) {
  const userId = await requireUserId();
  await query(`DELETE FROM collaborators WHERE id = $1 AND user_id = $2`, [id, userId]);
  return { success: true };
}

export async function fetchCollaborator(id: string) {
  const userId = await requireUserId();
  return queryOne<Omit<Collaborator, "pdi_count">>(
    `SELECT id, name, role, department, manager, email FROM collaborators WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export async function fetchPdisForCollaborator(collaboratorId: string) {
  const userId = await requireUserId();
  return query<Pdi>(
    `SELECT id, period, goals, updated_at FROM pdis
     WHERE collaborator_id = $1 AND user_id = $2
     ORDER BY updated_at DESC`,
    [collaboratorId, userId],
  );
}

export async function insertPdi(collaboratorId: string) {
  const userId = await requireUserId();
  return queryOne<{ id: string }>(
    `INSERT INTO pdis (user_id, collaborator_id, period, goals)
     VALUES ($1, $2, '', '[]'::jsonb) RETURNING id`,
    [userId, collaboratorId],
  );
}

export async function removePdi(id: string) {
  const userId = await requireUserId();
  await query(`DELETE FROM pdis WHERE id = $1 AND user_id = $2`, [id, userId]);
  return { success: true };
}

export async function fetchPdi(id: string): Promise<PdiWithCollaborator | null> {
  const userId = await requireUserId();
  const row = await queryOne<{
    id: string;
    period: string | null;
    strengths: string | null;
    improvements: string | null;
    goals: Goal[];
    c_id: string;
    c_name: string;
    c_role: string | null;
    c_department: string | null;
    c_manager: string | null;
  }>(
    `SELECT p.id, p.period, p.strengths, p.improvements, p.goals,
            c.id AS c_id, c.name AS c_name, c.role AS c_role, c.department AS c_department, c.manager AS c_manager
     FROM pdis p
     JOIN collaborators c ON c.id = p.collaborator_id
     WHERE p.id = $1 AND p.user_id = $2`,
    [id, userId],
  );
  if (!row) return null;
  return {
    id: row.id,
    period: row.period ?? "",
    strengths: row.strengths ?? "",
    improvements: row.improvements ?? "",
    goals: row.goals ?? [],
    collaborator: {
      id: row.c_id,
      name: row.c_name,
      role: row.c_role,
      department: row.c_department,
      manager: row.c_manager,
    },
  };
}

export type SavePdiInput = {
  id: string;
  period: string;
  strengths: string;
  improvements: string;
  goals: Goal[];
  changes: { field: string; before: Json; after: Json }[];
  summary?: string;
};

export async function savePdiRow(input: SavePdiInput) {
  const userId = await requireUserId();
  const pdi = await queryOne<{ collaborator_id: string }>(
    `UPDATE pdis SET period = $1, strengths = $2, improvements = $3, goals = $4
     WHERE id = $5 AND user_id = $6 RETURNING collaborator_id`,
    [input.period, input.strengths, input.improvements, JSON.stringify(input.goals), input.id, userId],
  );
  if (!pdi) throw new Error("PDI não encontrado.");

  if (input.changes.length > 0) {
    await query(
      `INSERT INTO pdi_audit_log (user_id, pdi_id, collaborator_id, action, changes, summary)
       VALUES ($1, $2, $3, 'updated', $4, $5)`,
      [userId, input.id, pdi.collaborator_id, JSON.stringify(input.changes), input.summary || null],
    );
  }
  return { success: true };
}

export async function fetchAuditLog(pdiId: string) {
  const userId = await requireUserId();
  return query<AuditEntry>(
    `SELECT id, action, summary, changes, created_at FROM pdi_audit_log
     WHERE pdi_id = $1 AND user_id = $2
     ORDER BY created_at DESC`,
    [pdiId, userId],
  );
}
