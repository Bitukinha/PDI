import { useEffect, useState } from "react";
import { listAuditLog } from "@/lib/pdi-data.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, ChevronRight } from "lucide-react";
import type { Change } from "@/lib/pdi-diff";

type AuditEntry = {
  id: string;
  action: string;
  summary: string | null;
  changes: Change[];
  created_at: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
}

export function PdiAuditHistory({ pdiId, refreshKey = 0 }: { pdiId: string; refreshKey?: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listAuditLog({ data: { pdiId } });
        if (cancelled) return;
        setEntries(data.map((d) => ({ ...d, changes: (d.changes as unknown as Change[]) ?? [] })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdiId, refreshKey]);

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Histórico de alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const isOpen = !!open[e.id];
              const hasDetails = e.changes && e.changes.length > 0;
              return (
                <li key={e.id} className="rounded-lg border border-border bg-secondary/20">
                  <Button
                    variant="ghost"
                    onClick={() => hasDetails && setOpen((s) => ({ ...s, [e.id]: !isOpen }))}
                    className="w-full justify-start h-auto py-3 px-3 hover:bg-secondary/40"
                  >
                    {hasDetails ? (
                      isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )
                    ) : (
                      <span className="w-4" />
                    )}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="border-primary/30 text-primary capitalize"
                        >
                          {e.action === "created"
                            ? "Criado"
                            : e.action === "updated"
                              ? "Editado"
                              : e.action}
                        </Badge>
                        <span className="text-sm font-medium">{e.summary || "Alteração"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(e.created_at)}
                      </div>
                    </div>
                  </Button>
                  {isOpen && hasDetails && (
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t border-border/60">
                      {e.changes.map((c, i) => (
                        <div key={i} className="text-xs">
                          <div className="font-medium text-foreground">{c.field}</div>
                          <div className="text-muted-foreground mt-0.5 grid grid-cols-[auto_1fr] gap-x-2">
                            <span className="text-destructive/80">antes:</span>
                            <span className="break-words">{formatValue(c.before)}</span>
                            <span className="text-primary">depois:</span>
                            <span className="break-words">{formatValue(c.after)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
