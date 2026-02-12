"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Mail, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  shareAsset,
  revokeShare,
  getAssetShares,
} from "@/lib/actions/share";
import { formatDistanceToNow } from "@/lib/format";

interface ShareDialogProps {
  assetId: string;
  assetName: string;
}

interface ShareEntry {
  id: string;
  email: string;
  createdAt: string;
}

export function ShareDialog({ assetId, assetName }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open]);

  async function loadShares() {
    setLoadingShares(true);
    const result = await getAssetShares(assetId);
    setShares(result);
    setLoadingShares(false);
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    const fd = new FormData();
    fd.set("assetId", assetId);
    fd.set("email", email.trim());

    const result = await shareAsset(fd);
    if (result.success) {
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      await loadShares();
    } else {
      toast.error(result.error);
    }
    setSending(false);
  }

  async function handleRevoke(shareId: string) {
    setRevokingId(shareId);
    const result = await revokeShare(shareId);
    if (result.success) {
      toast.success("Access revoked");
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } else {
      toast.error(result.error);
    }
    setRevokingId(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Mail className="size-3.5" /> Share by Email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share &ldquo;{assetName}&rdquo;</DialogTitle>
          <DialogDescription>
            Invite someone to view and download this asset by email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="share-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="share-email"
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={sending} className="gap-1.5">
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            {sending ? "Sending..." : "Send"}
          </Button>
        </form>

        {/* Shared with list */}
        <div className="space-y-2 mt-2">
          <p className="text-xs text-muted-foreground font-medium">
            Shared with ({shares.length})
          </p>

          {loadingShares ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Not shared with anyone yet.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">
                      {share.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(share.createdAt))}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevoke(share.id)}
                    disabled={revokingId === share.id}
                  >
                    {revokingId === share.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
