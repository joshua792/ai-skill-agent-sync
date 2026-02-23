"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Monitor, Trash2, RefreshCw } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { registerMachine, deleteMachine } from "@/lib/actions/machine";
import { formatDistanceToNow } from "@/lib/format";

interface SerializedMachine {
  id: string;
  name: string;
  machineIdentifier: string;
  lastSyncAt: string | null;
  createdAt: string;
  _count: { syncStates: number };
}

interface MachinesListProps {
  machines: SerializedMachine[];
}

export function MachinesList({ machines }: MachinesListProps) {
  const router = useRouter();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");

  function generateIdentifier() {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);
    const suffix = Math.random().toString(36).slice(2, 6);
    setIdentifier(slug ? `${slug}-${suffix}` : suffix);
  }

  async function handleRegister(formData: FormData) {
    setRegistering(true);
    const result = await registerMachine(formData);
    if (result.success) {
      toast.success("Machine registered!");
      setRegisterOpen(false);
      setName("");
      setIdentifier("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setRegistering(false);
  }

  async function handleDelete(machineId: string) {
    setDeletingId(machineId);
    const result = await deleteMachine(machineId);
    if (result.success) {
      toast.success("Machine deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setDeletingId(null);
    setDeleteConfirmId(null);
  }

  return (
    <div>
      {/* Register Machine Button */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 mb-6">
            <Plus className="size-4" />
            Register Machine
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Machine</DialogTitle>
            <DialogDescription>
              Add a machine to track which assets are synced to it.
            </DialogDescription>
          </DialogHeader>
          <form action={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Machine Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Work Desktop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineIdentifier">Machine Identifier</Label>
              <div className="flex gap-2">
                <Input
                  id="machineIdentifier"
                  name="machineIdentifier"
                  placeholder="e.g. work-desktop-a7f3"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateIdentifier}
                  className="shrink-0"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A unique identifier for this machine. Letters, numbers, hyphens,
                and underscores only.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={registering}>
                {registering ? "Registering..." : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Machine Cards Grid */}
      {machines.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((machine) => (
            <Card key={machine.id} className="relative group">
              <Link href={`/dashboard/machines/${machine.id}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Monitor className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {machine.name}
                    </CardTitle>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    {machine.machineIdentifier}
                  </p>
                  <CardDescription className="flex items-center gap-2">
                    <span>
                      {machine._count.syncStates} asset
                      {machine._count.syncStates !== 1 && "s"} synced
                    </span>
                    {machine.lastSyncAt &&
                      Date.now() - new Date(machine.lastSyncAt).getTime() < 90_000 ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-green-400 border-green-400/50">
                        <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="text-xs text-muted-foreground justify-between">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="size-3" />
                    {machine.lastSyncAt
                      ? `Last synced ${formatDistanceToNow(new Date(machine.lastSyncAt))}`
                      : "Never synced"}
                  </div>
                </CardFooter>
              </Link>

              {/* Delete button */}
              <Dialog
                open={deleteConfirmId === machine.id}
                onOpenChange={(open) =>
                  setDeleteConfirmId(open ? machine.id : null)
                }
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Machine</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete &quot;{machine.name}
                      &quot;? All sync state for this machine will be lost.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(machine.id)}
                      disabled={deletingId === machine.id}
                    >
                      {deletingId === machine.id ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Monitor className="mx-auto size-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            No machines registered yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Register your machines to track which assets are synced to each
            device.
          </p>
        </div>
      )}
    </div>
  );
}
