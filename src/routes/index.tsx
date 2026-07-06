import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  listCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  type Collaborator,
} from "@/lib/pdi-data.functions";
import { signOut } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, Pencil, Trash2, Target, Search, ChevronRight } from "lucide-react";
import { toast, Toaster } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "PDI - Novaes Tech" },
      {
        name: "description",
        content: "Plataforma de Plano de Desenvolvimento Individual da Novaes Tech.",
      },
    ],
  }),
});

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Collaborator[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [form, setForm] = useState({ name: "", role: "", department: "", manager: "", email: "" });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const load = async () => {
    try {
      const data = await listCollaborators();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar colaboradores");
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", role: "", department: "", manager: "", email: "" });
    setOpen(true);
  };

  const openEdit = (c: Collaborator) => {
    setEditing(c);
    setForm({
      name: c.name,
      role: c.role ?? "",
      department: c.department ?? "",
      manager: c.manager ?? "",
      email: c.email ?? "",
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      name: form.name.trim(),
      role: form.role || null,
      department: form.department || null,
      manager: form.manager || null,
      email: form.email || null,
    };
    try {
      if (editing) {
        await updateCollaborator({ data: { id: editing.id, ...payload } });
        toast.success("Colaborador atualizado");
      } else {
        await createCollaborator({ data: payload });
        toast.success("Colaborador cadastrado");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar colaborador");
    }
  };

  const remove = async (c: Collaborator) => {
    if (!confirm(`Excluir "${c.name}" e todos os PDIs vinculados?`)) return;
    try {
      await deleteCollaborator({ data: { id: c.id } });
      toast.success("Excluído");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const filtered = items.filter((c) =>
    [c.name, c.role, c.department, c.manager, c.email].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  if (loading) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" richColors />

      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Novaes Tech"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl ring-1 ring-primary/30 shadow-[var(--shadow-glow)]"
            />
            <div>
              <h1 className="font-semibold text-lg sm:text-xl leading-tight">Novaes Tech</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                PDI · Gestão de Colaboradores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section
          className="rounded-2xl p-6 sm:p-8 border border-border relative overflow-hidden"
          style={{ background: "var(--gradient-dark)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                Colaboradores
              </Badge>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold">
                {items.length} {items.length === 1 ? "cadastrado" : "cadastrados"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Gerencie sua equipe e os Planos de Desenvolvimento Individual.
              </p>
            </div>
            <Button
              onClick={openNew}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Novo colaborador
            </Button>
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo, departamento..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {items.length === 0
                  ? "Nenhum colaborador cadastrado ainda."
                  : "Nenhum resultado para sua busca."}
              </p>
              {items.length === 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={openNew}>
                  <Plus className="h-4 w-4" /> Cadastrar primeiro
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <Card key={c.id} className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0">
                        {c.name
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{c.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{c.role || "—"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary shrink-0">
                      {c.pdi_count} PDI{c.pdi_count === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {c.department && <div>📂 {c.department}</div>}
                    {c.manager && <div>👤 Gestor: {c.manager}</div>}
                    {c.email && <div className="truncate">✉️ {c.email}</div>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Link
                      to="/colaborador/$id"
                      params={{ id: c.id }}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Ver PDIs <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(c)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(c)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gestor</Label>
                <Input
                  value={form.manager}
                  onChange={(e) => setForm({ ...form, manager: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {editing ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
