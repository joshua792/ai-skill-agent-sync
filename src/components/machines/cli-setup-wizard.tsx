"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Terminal,
  Key,
  LogIn,
  MonitorSmartphone,
  CircleCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApiKeyAction } from "@/lib/actions/api-key";

const CLI_REPO_URL = "https://github.com/joshua792/ai-skill-agent-sync.git";

// ─── Types ──────────────────────────────────────────

type WizardStep = "install" | "create-key" | "authenticate" | "register" | "done";

interface CliSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appUrl: string;
}

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "install", label: "Install", icon: Terminal },
  { key: "create-key", label: "API Key", icon: Key },
  { key: "authenticate", label: "Login", icon: LogIn },
  { key: "register", label: "Register", icon: MonitorSmartphone },
  { key: "done", label: "Done", icon: CircleCheck },
];

// ─── CopyBlock ──────────────────────────────────────

function CopyBlock({
  value,
  label,
  mono = true,
}: {
  value: string;
  label?: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
        <code
          className={`flex-1 text-sm break-all ${mono ? "font-mono" : ""}`}
        >
          {value}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 size-8 p-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── StepIndicator ──────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <>
      {/* Mobile: compact */}
      <div className="flex items-center justify-center gap-2 sm:hidden mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentIndex + 1} of {STEPS.length}
        </span>
      </div>

      {/* Desktop: full stepper */}
      <div className="hidden sm:flex items-center justify-between mb-6">
        {STEPS.map((step, i) => {
          const isActive = i === currentIndex;
          const isComplete = i < currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex items-center justify-center size-8 rounded-full border-2 transition-colors ${
                    isComplete
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground/50"
                  }`}
                >
                  {isComplete ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isActive
                      ? "text-primary font-medium"
                      : isComplete
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-1rem] ${
                    isComplete ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Wizard ─────────────────────────────────────────

export function CliSetupWizard({
  open,
  onOpenChange,
  appUrl,
}: CliSetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("install");
  const [keyName, setKeyName] = useState("CLI Key");
  const [apiKeyRaw, setApiKeyRaw] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function reset() {
    setStep("install");
    setKeyName("CLI Key");
    setApiKeyRaw(null);
    setCreating(false);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function goNext() {
    const currentIndex = STEPS.findIndex((s) => s.key === step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].key);
    }
  }

  function goBack() {
    const currentIndex = STEPS.findIndex((s) => s.key === step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].key);
    }
  }

  async function handleCreateKey() {
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("name", keyName.trim() || "CLI Key");
      const result = await createApiKeyAction(fd);
      if (result.success) {
        setApiKeyRaw(result.key);
        toast.success("API key created!");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to create API key");
    }
    setCreating(false);
  }

  function handleDone() {
    handleClose(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="size-5" />
            Setup CLI
          </DialogTitle>
          <DialogDescription>
            Install and configure the AssetVault CLI to sync assets across your
            machines.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        {/* ── Step 1: Install ── */}
        {step === "install" && (
          <div className="space-y-4">
            <p className="text-sm">
              Install the AssetVault CLI from source. Requires Git, Node.js 20+,
              and pnpm.
            </p>
            <CopyBlock
              value={`git clone ${CLI_REPO_URL}`}
              label="1. Clone the repository:"
            />
            <CopyBlock
              value="cd ai-skill-agent-sync && pnpm install"
              label="2. Install dependencies:"
            />
            <CopyBlock
              value="cd cli && pnpm build && npm link"
              label="3. Build the CLI and add the av command to your PATH:"
            />
            <p className="text-xs text-muted-foreground">
              Verify with <code className="font-mono">av --version</code>. Later
              updates are one command: <code className="font-mono">av update</code>.
            </p>
          </div>
        )}

        {/* ── Step 2: Create API Key ── */}
        {step === "create-key" && (
          <div className="space-y-4">
            {apiKeyRaw ? (
              <>
                <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <AlertTriangle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Copy this key now — it won&apos;t be shown again.
                  </p>
                </div>
                <CopyBlock value={apiKeyRaw} label="Your API Key" />
              </>
            ) : (
              <>
                <p className="text-sm">
                  Create an API key to authenticate the CLI. You&apos;ll use
                  this in the next step.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. CLI Key"
                  />
                </div>
                <Button
                  onClick={handleCreateKey}
                  disabled={creating || !keyName.trim()}
                  className="w-full gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Key className="size-4" />
                      Create API Key
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Authenticate ── */}
        {step === "authenticate" && (
          <div className="space-y-4">
            <p className="text-sm">
              Run this command and follow the prompts:
            </p>
            <CopyBlock value="av login" />
            {apiKeyRaw && (
              <CopyBlock value={apiKeyRaw} label="When prompted, paste this API key:" />
            )}
            <CopyBlock
              value={appUrl}
              label="When prompted for Server URL, enter:"
            />
          </div>
        )}

        {/* ── Step 4: Register Machine ── */}
        {step === "register" && (
          <div className="space-y-4">
            <p className="text-sm">
              Register this machine so AssetVault can track which assets are
              synced here:
            </p>
            <CopyBlock value="av init" />
            <p className="text-xs text-muted-foreground">
              The CLI will suggest using your computer&apos;s hostname as the
              machine name. You can accept the default or choose a custom name.
            </p>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === "done" && (
          <div className="space-y-4 text-center py-2">
            <CircleCheck className="mx-auto size-12 text-green-500" />
            <div>
              <p className="font-semibold text-lg">All set!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your machine should appear in the list after running{" "}
                <code className="font-mono">av init</code>. Here are some
                useful next commands:
              </p>
            </div>
            <div className="space-y-3 text-left">
              <CopyBlock
                value="av link <asset-slug>"
                label="Link an asset to a local file:"
              />
              <CopyBlock
                value="av status"
                label="Check sync status:"
              />
              <CopyBlock
                value="av watch"
                label="Start real-time sync daemon:"
              />
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          {step === "done" ? (
            <Button onClick={handleDone} className="ml-auto gap-2">
              <Check className="size-4" />
              Done
            </Button>
          ) : (
            <>
              {step === "install" ? (
                <Button
                  variant="ghost"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
              ) : (
                <Button variant="ghost" onClick={goBack}>
                  Back
                </Button>
              )}
              <Button
                onClick={goNext}
                disabled={step === "create-key" && !apiKeyRaw}
              >
                Next
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
