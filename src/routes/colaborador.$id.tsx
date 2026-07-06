import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getCollaborator,
  listPdisForCollaborator,
  createPdi,
  deletePdi,
} from "@/lib/pdi-data.functions";
import { signOut } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Pencil, Trash2, FileText, LogOut } from "lucide-react";
import { toast, Toaster } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/colaborador/$id")({
  component: CollaboratorPage,
  head: () => ({ meta: [{ title: "Colaborador | Novaes Tech PDI" }] }),
});

type Collaborator = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
  manager: string | null;
  email: string | null;
};
type Goal = { id: string; title: string; progress: number; done: boolean };
type PDI = { id: string; period: string | null; goals: Goal[]; updated_at: string };

function CollaboratorPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [collab, setCollab] = useState<Collaborator | null>(null);
  const [pdis, setPdis] = useState<PDI[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const load = async () => {
    try {
      const c = await getCollaborator({ data: { id } });
      if (!c) {
        toast.error("Colaborador não encontrado");
        navigate({ to: "/" });
        return;
      }
      setCollab(c as Collaborator);
      const p = await listPdisForCollaborator({ data: { collaboratorId: id } });
      setPdis(p as unknown as PDI[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar dados");
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user, id]);

  const handleCreatePdi = async () => {
    try {
      const data = await createPdi({ data: { collaboratorId: id } });
      if (data) navigate({ to: "/pdi/$pdiId", params: { pdiId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar PDI");
    }
  };

  const removePdi = async (pdiId: string) => {
    if (!confirm("Excluir este PDI?")) return;
    try {
      await deletePdi({ data: { id: pdiId } });
      toast.success("PDI excluído");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir PDI");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const progressOf = (goals: Goal[]) =>
    goals.length === 0
      ? 0
      : Math.round(goals.reduce((s, g) => s + (g.done ? 100 : g.progress || 0), 0) / goals.length);

  if (!collab) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" richColors />

      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
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
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para colaboradores
        </Link>

        <section
          className="rounded-2xl p-6 sm:p-8 border border-border relative overflow-hidden"
          style={{ background: "var(--gradient-dark)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold">
                {collab.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{collab.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {collab.role || "—"}
                  {collab.department && ` · ${collab.department}`}
                </p>
                {collab.manager && (
                  <p className="text-xs text-muted-foreground mt-0.5">Gestor: {collab.manager}</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleCreatePdi}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Novo PDI
            </Button>
          </div>
        </section>

        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Planos de desenvolvimento
        </h3>

        {pdis.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum PDI lançado ainda para este colaborador.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleCreatePdi}>
                <Plus className="h-4 w-4" /> Lançar primeiro PDI
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pdis.map((p) => {
              const overall = progressOf(p.goals || []);
              return (
                <Card key={p.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                          Ciclo {p.period || "—"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          Atualizado em {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{overall}%</div>
                        <div className="text-xs text-muted-foreground">
                          {(p.goals || []).length} metas
                        </div>
                      </div>
                    </div>
                    <Progress value={overall} className="h-2" />
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Link
                        to="/pdi/$pdiId"
                        params={{ pdiId: p.id }}
                        className="flex-1 inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar / Visualizar
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePdi(p.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
