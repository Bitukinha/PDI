import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPdi, savePdi, type Json } from "@/lib/pdi-data.functions";
import { signOut } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plus,
  Target,
  Trash2,
  Printer,
  Save,
  User,
  Briefcase,
  LogOut,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import logo from "@/assets/logo.png";
import { diffPdi, summarize, type PdiSnapshot } from "@/lib/pdi-diff";
import { PdiAuditHistory } from "@/components/PdiAuditHistory";

export const Route = createFileRoute("/pdi/$pdiId")({
  component: PdiEditor,
  head: () => ({ meta: [{ title: "PDI | Novaes Tech" }] }),
});

type Goal = {
  id: string;
  title: string;
  description: string;
  competency: string;
  priority: "Baixa" | "Média" | "Alta";
  deadline: string;
  progress: number;
  done: boolean;
};
type Collaborator = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
  manager: string | null;
};
type PdiData = {
  id: string;
  period: string;
  strengths: string;
  improvements: string;
  goals: Goal[];
};

function PdiEditor() {
  const { pdiId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [collab, setCollab] = useState<Collaborator | null>(null);
  const [pdi, setPdi] = useState<PdiData | null>(null);
  const [baseline, setBaseline] = useState<PdiSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [auditKey, setAuditKey] = useState(0);
  const [issuedAt, setIssuedAt] = useState("");
  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setIssuedAt(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getPdi({ data: { id: pdiId } });
        if (!data) {
          toast.error("PDI não encontrado");
          navigate({ to: "/" });
          return;
        }
        setCollab(data.collaborator);
        const snap: PdiSnapshot = {
          period: data.period ?? "",
          strengths: data.strengths ?? "",
          improvements: data.improvements ?? "",
          goals: (data.goals as unknown as Goal[]) ?? [],
        };
        setPdi({ id: data.id, ...snap });
        setBaseline(JSON.parse(JSON.stringify(snap)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar PDI");
      }
    })();
  }, [user, pdiId, navigate]);

  const update = <K extends keyof PdiData>(key: K, value: PdiData[K]) =>
    setPdi((p) => (p ? { ...p, [key]: value } : p));

  const addGoal = () => {
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      competency: "",
      priority: "Média",
      deadline: "",
      progress: 0,
      done: false,
    };
    setPdi((p) => (p ? { ...p, goals: [...p.goals, goal] } : p));
  };
  const updateGoal = (id: string, patch: Partial<Goal>) =>
    setPdi((p) =>
      p ? { ...p, goals: p.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) } : p,
    );
  const removeGoal = (id: string) =>
    setPdi((p) => (p ? { ...p, goals: p.goals.filter((g) => g.id !== id) } : p));

  const save = async () => {
    if (!pdi || !user) return;
    setSaving(true);
    const next: PdiSnapshot = {
      period: pdi.period,
      strengths: pdi.strengths,
      improvements: pdi.improvements,
      goals: pdi.goals,
    };
    const changes = baseline ? diffPdi(baseline, next) : [];
    try {
      await savePdi({
        data: {
          id: pdi.id,
          period: next.period,
          strengths: next.strengths,
          improvements: next.improvements,
          goals: next.goals as unknown as Record<string, Json>[],
          changes: changes as unknown as { field: string; before: Json; after: Json }[],
          summary: changes.length > 0 ? summarize(changes) : undefined,
        },
      });
      if (changes.length > 0) setAuditKey((k) => k + 1);
      setBaseline(JSON.parse(JSON.stringify(next)));
      toast.success(changes.length > 0 ? `PDI salvo · ${summarize(changes)}` : "PDI salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar PDI");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  if (!pdi || !collab) return <div className="min-h-screen bg-background" />;

  const overall =
    pdi.goals.length === 0
      ? 0
      : Math.round(
          pdi.goals.reduce((s, g) => s + (g.done ? 100 : g.progress), 0) / pdi.goals.length,
        );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" richColors />

      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Novaes Tech"
              className="h-12 w-12 rounded-lg ring-1 ring-primary/30"
            />
            <div>
              <h1 className="font-semibold text-base leading-tight">Novaes Tech</h1>
              <p className="text-xs text-muted-foreground">PDI</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info("Use 'Salvar como PDF'");
                setTimeout(() => window.print(), 300);
              }}
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="hidden sm:inline-flex"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="hidden print:flex print:items-center print:gap-4 print:mb-6 print:pb-4 print:border-b print:border-black/20">
          <img src={logo} alt="Novaes Tech" className="print:h-20 print:w-20 print:rounded-lg" />
          <div>
            <div className="print:text-2xl print:font-bold print:text-black">Novaes Tech</div>
            <div className="print:text-sm print:text-black/70">
              Plano de Desenvolvimento Individual
            </div>
          </div>
          <div className="print:ml-auto print:text-right print:text-xs print:text-black/60">
            Emitido em {issuedAt}
          </div>
        </div>

        <Link
          to="/colaborador/$id"
          params={{ id: collab.id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary print:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para {collab.name}
        </Link>

        <section
          className="rounded-2xl p-6 sm:p-8 border border-border relative overflow-hidden"
          style={{ background: "var(--gradient-dark)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="relative">
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
              Ciclo {pdi.period || "—"}
            </Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">{collab.name}</h2>
            <p className="text-muted-foreground mt-1">
              {collab.role || "Cargo"}
              {collab.department && ` · ${collab.department}`}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso geral</span>
                  <span className="font-semibold text-primary">{overall}%</span>
                </div>
                <Progress value={overall} className="h-2" />
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-3xl font-bold text-primary">{pdi.goals.length}</span>
                <span className="text-xs text-muted-foreground">metas</span>
              </div>
            </div>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Ciclo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Período do ciclo">
              <Input
                value={pdi.period}
                onChange={(e) => update("period", e.target.value)}
                placeholder="Ex: 2026 · S1"
              />
            </Field>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Pontos fortes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={5}
                value={pdi.strengths}
                onChange={(e) => update("strengths", e.target.value)}
                placeholder="Competências e comportamentos de destaque..."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Pontos a desenvolver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={5}
                value={pdi.improvements}
                onChange={(e) => update("improvements", e.target.value)}
                placeholder="Áreas e habilidades a evoluir no ciclo..."
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Metas
            </CardTitle>
            <Button
              size="sm"
              onClick={addGoal}
              className="bg-primary text-primary-foreground hover:bg-primary/90 print:hidden"
            >
              <Plus className="h-4 w-4" /> Nova meta
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {pdi.goals.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Target className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
              </div>
            )}
            {pdi.goals.map((g, i) => (
              <div
                key={g.id}
                className="rounded-xl border border-border bg-secondary/30 p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      Meta {String(i + 1).padStart(2, "0")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        g.priority === "Alta"
                          ? "border-destructive/40 text-destructive"
                          : g.priority === "Média"
                            ? "border-primary/30 text-primary"
                            : "border-muted-foreground/30 text-muted-foreground"
                      }
                    >
                      {g.priority}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGoal(g.id)}
                    className="text-muted-foreground hover:text-destructive print:hidden"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Título">
                    <Input
                      value={g.title}
                      onChange={(e) => updateGoal(g.id, { title: e.target.value })}
                    />
                  </Field>
                  <Field label="Competência">
                    <Input
                      value={g.competency}
                      onChange={(e) => updateGoal(g.id, { competency: e.target.value })}
                    />
                  </Field>
                  <Field label="Prioridade">
                    <Select
                      value={g.priority}
                      onValueChange={(v) => updateGoal(g.id, { priority: v as Goal["priority"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Prazo">
                    <Input
                      type="date"
                      value={g.deadline}
                      onChange={(e) => updateGoal(g.id, { deadline: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Descrição / ações">
                  <Textarea
                    rows={3}
                    value={g.description}
                    onChange={(e) => updateGoal(g.id, { description: e.target.value })}
                  />
                </Field>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Progresso: {g.done ? 100 : g.progress}%
                    </Label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={g.done}
                        onCheckedChange={(v) =>
                          updateGoal(g.id, { done: !!v, progress: v ? 100 : g.progress })
                        }
                      />
                      Concluída
                    </label>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={g.done ? 100 : g.progress}
                    onChange={(e) =>
                      updateGoal(g.id, { progress: Number(e.target.value), done: false })
                    }
                    className="w-full accent-[oklch(0.58_0.22_25)] print:hidden"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <PdiAuditHistory pdiId={pdi.id} refreshKey={auditKey} />
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
