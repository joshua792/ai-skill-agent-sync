"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Copy, Trash2, KeyRound, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions/api-key";
import { formatDistanceToNow } from "@/lib/format";

interface SerializedKey {
  id: string;
  name: string;
  prefix: string;
  machineId: string | null;
  machine: { name: string } | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface Machine {
  id: string;
  name: string;
  machineIdentifier: string;
}

interface ApiKeyManagerProps {
  keys: SerializedKey[];
  machines: Machine[];
}

export function ApiKeyManager({ keys, machines }: ApiKeyManagerProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [machineId, setMachineId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");

  async function handleCreate() {
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      if (machineId && machineId !== "none") fd.append("machineId", machineId);
      if (expiresInDays) fd.append("expiresInDays", expiresInDays);

      const result = await createApiKeyAction(fd);
      if (result.success) {
        setNewKeyRaw(result.key);
        setName("");
        setMachineId("");
        setExpiresInDays("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(true);
    try {
      const fd = new FormData();
      fd.append("keyId", keyId);
      const result = await revokeApiKeyAction(fd);
      if (result.success) {
        toast.success("API key revoked");
        setRevokeConfirmId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setRevoking(false);
    }
  }

  async function copyKey() {
    if (newKeyRaw) {
      await navigator.clipboard.writeText(newKeyRaw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function getKeyStatus(key: SerializedKey) {
    if (key.revokedAt) return { label: "Revoked", variant: "destructive" as const };
    if (key.expiresAt && new Date(key.expiresAt) < new Date())
      return { label: "Expired", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6">
      {/* Create key dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) {
            setNewKeyRaw(null);
            setCopied(false);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent>
          {newKeyRaw ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy this key now. It will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                  {newKeyRaw}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyKey}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setNewKeyRaw(null); }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  This key will authenticate the CLI with your AssetVault account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Laptop CLI"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-machine">Machine (optional)</Label>
                  <Select value={machineId} onValueChange={setMachineId}>
                    <SelectTrigger id="key-machine">
                      <SelectValue placeholder="No specific machine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific machine</SelectItem>
                      {machines.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-expiry">Expires in (days, optional)</Label>
                  <Input
                    id="key-expiry"
                    type="number"
                    min={1}
                    max={365}
                    placeholder="Never expires"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                >
                  {creating ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Active Keys ({activeKeys.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active API keys. Create one to start syncing with the CLI.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeKeys.map((key) => {
                  const status = getKeyStatus(key);
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">
                          {key.prefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.machine?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.lastUsedAt
                          ? formatDistanceToNow(new Date(key.lastUsedAt))
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.expiresAt
                          ? new Date(key.expiresAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog
                          open={revokeConfirmId === key.id}
                          onOpenChange={(o) =>
                            setRevokeConfirmId(o ? key.id : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Revoke API Key</DialogTitle>
                              <DialogDescription>
                                This will immediately disable &quot;{key.name}&quot;.
                                Any CLI using this key will stop working.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setRevokeConfirmId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleRevoke(key.id)}
                                disabled={revoking}
                              >
                                {revoking ? "Revoking..." : "Revoke"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">
              Revoked Keys ({revokedKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Revoked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedKeys.map((key) => (
                  <TableRow key={key.id} className="opacity-60">
                    <TableCell>{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">
                        {key.prefix}...
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(key.createdAt))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.revokedAt
                        ? formatDistanceToNow(new Date(key.revokedAt))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
