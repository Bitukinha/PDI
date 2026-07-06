export type Goal = {
  id: string;
  title: string;
  description: string;
  competency: string;
  priority: "Baixa" | "Média" | "Alta";
  deadline: string;
  progress: number;
  done: boolean;
};
export type PdiSnapshot = {
  period: string;
  strengths: string;
  improvements: string;
  goals: Goal[];
};
export type Change = { field: string; before: unknown; after: unknown };

const FIELD_LABELS: Record<string, string> = {
  period: "Período",
  strengths: "Pontos fortes",
  improvements: "Pontos a desenvolver",
  title: "Título",
  description: "Descrição",
  competency: "Competência",
  priority: "Prioridade",
  deadline: "Prazo",
  progress: "Progresso",
  done: "Concluída",
};

export function fieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key;
}

export function diffPdi(before: PdiSnapshot, after: PdiSnapshot): Change[] {
  const changes: Change[] = [];
  (["period", "strengths", "improvements"] as const).forEach((k) => {
    if ((before[k] ?? "") !== (after[k] ?? "")) {
      changes.push({ field: fieldLabel(k), before: before[k], after: after[k] });
    }
  });

  const beforeMap = new Map(before.goals.map((g) => [g.id, g]));
  const afterMap = new Map(after.goals.map((g) => [g.id, g]));

  for (const [id, g] of afterMap) {
    const prev = beforeMap.get(id);
    const label = g.title?.trim() || "Meta sem título";
    if (!prev) {
      changes.push({
        field: `Meta adicionada: ${label}`,
        before: null,
        after: g.title || "(em branco)",
      });
      continue;
    }
    (Object.keys(g) as (keyof Goal)[]).forEach((k) => {
      if (k === "id") return;
      if (prev[k] !== g[k]) {
        changes.push({
          field: `Meta "${label}" — ${fieldLabel(String(k))}`,
          before: prev[k],
          after: g[k],
        });
      }
    });
  }
  for (const [id, g] of beforeMap) {
    if (!afterMap.has(id)) {
      changes.push({
        field: `Meta removida: ${g.title?.trim() || "Sem título"}`,
        before: g.title,
        after: null,
      });
    }
  }
  return changes;
}

export function summarize(changes: Change[]): string {
  if (changes.length === 0) return "Nenhuma alteração";
  if (changes.length === 1) return changes[0].field;
  return `${changes.length} alterações`;
}
