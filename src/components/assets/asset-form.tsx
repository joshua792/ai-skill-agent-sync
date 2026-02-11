"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ASSET_TYPE_LABELS,
  PLATFORM_LABELS,
  CATEGORY_LABELS,
  LICENSE_LABELS,
  VISIBILITY_LABELS,
  INSTALL_SCOPE_LABELS,
  INSTALL_SCOPE_DESCRIPTIONS,
  DEFAULT_FILE_NAMES,
  MAX_BUNDLE_SIZE_MB,
} from "@/lib/constants";
import { parseMarkdownFile } from "@/lib/parse-markdown";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BundleManifest } from "@/lib/types/bundle";

interface AssetFormProps {
  action: (formData: FormData) => Promise<void | { success: boolean; redirect?: string }>;
  defaultValues?: {
    name?: string;
    description?: string;
    type?: string;
    primaryPlatform?: string;
    compatiblePlatforms?: string[];
    category?: string;
    tags?: string[];
    visibility?: string;
    license?: string;
    installScope?: string;
    content?: string;
    primaryFileName?: string;
    storageType?: string;
    bundleUrl?: string;
    bundleManifest?: BundleManifest;
  };
  submitLabel?: string;
}

export function AssetForm({
  action,
  defaultValues = {},
  submitLabel = "Create Asset",
}: AssetFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [parsedValues, setParsedValues] = useState<
    Partial<NonNullable<AssetFormProps["defaultValues"]>>
  >({});
  const [fieldKey, setFieldKey] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedType, setSelectedType] = useState(
    defaultValues.type ?? "SKILL"
  );
  const [descLength, setDescLength] = useState(
    defaultValues.description?.length ?? 0
  );
  const [pending, setPending] = useState(false);
  const [fileNameTouched, setFileNameTouched] = useState(
    !!defaultValues.primaryFileName
  );

  // Bundle state
  const [storageType, setStorageType] = useState(
    defaultValues.storageType ?? "INLINE"
  );
  const [bundleUrl, setBundleUrl] = useState(defaultValues.bundleUrl ?? "");
  const [bundleManifest, setBundleManifest] = useState<BundleManifest | null>(
    defaultValues.bundleManifest ?? null
  );
  const [bundleContent, setBundleContent] = useState<string>(
    defaultValues.storageType === "BUNDLE" ? (defaultValues.content ?? "") : ""
  );
  const [uploadingZip, setUploadingZip] = useState(false);
  const [uploadedZipName, setUploadedZipName] = useState<string | null>(null);

  const ev = { ...defaultValues, ...parsedValues };
  const autoFileName = DEFAULT_FILE_NAMES[selectedType] ?? "README.md";
  const isBundle = storageType === "BUNDLE";

  function handleFileUpload(file: File) {
    if (!file.name.endsWith(".md")) {
      toast.error("Please upload a .md file");
      return;
    }
    if (file.size > 512 * 1024) {
      toast.error("File too large. Maximum size is 500 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseMarkdownFile(file.name, text);

      const next: Partial<NonNullable<AssetFormProps["defaultValues"]>> = {
        content: parsed.content,
        primaryFileName: parsed.primaryFileName,
      };
      if (parsed.type) next.type = parsed.type;
      if (parsed.name) next.name = parsed.name;
      if (parsed.description) next.description = parsed.description;
      if (parsed.tags?.length) next.tags = parsed.tags;
      if (parsed.primaryPlatform) next.primaryPlatform = parsed.primaryPlatform;
      if (parsed.category) next.category = parsed.category;

      setParsedValues(next);
      setSelectedType(next.type ?? defaultValues.type ?? "SKILL");
      setDescLength(next.description?.length ?? 0);
      setFileNameTouched(true);
      setUploadedFile(file.name);
      setFieldKey((k) => k + 1);

      const filled = [
        parsed.name,
        parsed.description,
        parsed.type,
        parsed.tags?.length,
        parsed.primaryPlatform,
        parsed.category,
      ].filter(Boolean).length + 2; // +2 for content & filename
      toast.success(`Parsed ${filled} fields from ${file.name}`);
    };
    reader.readAsText(file);
  }

  async function handleZipUpload(file: File) {
    if (!file.name.endsWith(".zip")) {
      toast.error("Please upload a .zip file");
      return;
    }
    if (file.size > MAX_BUNDLE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_BUNDLE_SIZE_MB} MB.`);
      return;
    }

    setUploadingZip(true);

    // Get the current primary file name from the form
    const form = formRef.current;
    const primaryFileNameInput = form?.querySelector<HTMLInputElement>(
      'input[name="primaryFileName"]'
    );
    const primaryFileName = primaryFileNameInput?.value || autoFileName;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("primaryFileName", primaryFileName);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      setBundleUrl(data.url);
      setBundleManifest(data.manifest);
      setBundleContent(data.primaryFileContent ?? "");
      setUploadedZipName(file.name);
      toast.success(
        `Uploaded ${file.name} — ${data.manifest.fileCount} files, ${formatBytes(data.manifest.totalSize)}`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setUploadingZip(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await action(formData);
      toast.success("Asset saved successfully!");
      if (result && typeof result === "object" && "redirect" in result && result.redirect) {
        router.push(result.redirect);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Storage Type Selector */}
      <div className="space-y-2">
        <Label>Storage Type</Label>
        <div className="flex gap-4">
          {(["INLINE", "BUNDLE"] as const).map((value) => (
            <label key={value} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="storageType"
                value={value}
                checked={storageType === value}
                onChange={() => setStorageType(value)}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">
                  {value === "INLINE" ? "Inline" : "Bundle (.zip)"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {value === "INLINE"
                    ? "Single file — paste or upload a .md file"
                    : "Multi-file — upload a .zip archive"}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* File Upload Drop Zone (Inline) */}
      {!isBundle && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = "";
            }}
          />
          {uploadedFile ? (
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{uploadedFile}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Replace
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop a <span className="font-mono">.md</span> file here, or click
                to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Fields will be auto-filled from the file content
              </p>
            </>
          )}
        </div>
      )}

      {/* Zip Upload Drop Zone (Bundle) */}
      {isBundle && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleZipUpload(file);
            }}
            onClick={() => !uploadingZip && zipInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
              uploadingZip && "pointer-events-none opacity-60",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
          >
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleZipUpload(file);
                e.target.value = "";
              }}
            />
            {uploadingZip ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Uploading and parsing...
                </span>
              </div>
            ) : uploadedZipName ? (
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{uploadedZipName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    zipInputRef.current?.click();
                  }}
                >
                  Replace
                </Button>
              </div>
            ) : (
              <>
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop a <span className="font-mono">.zip</span> file here, or
                  click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum {MAX_BUNDLE_SIZE_MB} MB. The primary file will be
                  extracted for preview.
                </p>
              </>
            )}
          </div>

          {/* Bundle manifest summary */}
          {bundleManifest && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Bundle Contents</span>
                <span className="text-muted-foreground">
                  {bundleManifest.fileCount} files,{" "}
                  {formatBytes(bundleManifest.totalSize)}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {bundleManifest.files.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center justify-between text-xs font-mono text-muted-foreground"
                  >
                    <span className="truncate mr-3">{f.path}</span>
                    <span className="shrink-0">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden inputs for bundle data */}
          <input type="hidden" name="bundleUrl" value={bundleUrl} />
          <input
            type="hidden"
            name="bundleManifest"
            value={bundleManifest ? JSON.stringify(bundleManifest) : ""}
          />
          <input type="hidden" name="content" value={bundleContent} />
        </>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          key={`name-${fieldKey}`}
          id="name"
          name="name"
          required
          defaultValue={ev.name}
          placeholder="e.g. Smart Commit"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          key={`desc-${fieldKey}`}
          id="description"
          name="description"
          required
          defaultValue={ev.description}
          placeholder="Brief description of what this asset does..."
          maxLength={280}
          onChange={(e) => setDescLength(e.target.value.length)}
        />
        <p className="text-xs text-muted-foreground text-right">
          {descLength}/280
        </p>
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          key={`type-${fieldKey}`}
          name="type"
          defaultValue={selectedType}
          onValueChange={(v) => setSelectedType(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Primary Platform */}
      <div className="space-y-2">
        <Label>Primary Platform</Label>
        <Select
          key={`platform-${fieldKey}`}
          name="primaryPlatform"
          defaultValue={ev.primaryPlatform ?? "CLAUDE_CODE"}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Compatible Platforms */}
      <div className="space-y-2">
        <Label>Compatible Platforms</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                key={`compat-${value}-${fieldKey}`}
                type="checkbox"
                name="compatiblePlatforms"
                value={value}
                defaultChecked={ev.compatiblePlatforms?.includes(value)}
                className="rounded border-input"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          key={`cat-${fieldKey}`}
          name="category"
          defaultValue={ev.category ?? "OTHER"}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          key={`tags-${fieldKey}`}
          id="tags"
          name="tags"
          defaultValue={ev.tags?.join(", ")}
          placeholder="git, commit, automation (comma-separated)"
        />
        <p className="text-xs text-muted-foreground">
          Separate tags with commas. Maximum 10 tags.
        </p>
      </div>

      <Separator />

      {/* Visibility */}
      <div className="space-y-2">
        <Label>Visibility</Label>
        <div className="flex gap-4">
          {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                key={`vis-${value}-${fieldKey}`}
                type="radio"
                name="visibility"
                value={value}
                defaultChecked={
                  (ev.visibility ?? "PRIVATE") === value
                }
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* License */}
      <div className="space-y-2">
        <Label>License</Label>
        <Select
          key={`license-${fieldKey}`}
          name="license"
          defaultValue={ev.license ?? "UNLICENSED"}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LICENSE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Install Scope */}
      <div className="space-y-2">
        <Label>Install Scope</Label>
        <div className="flex gap-6">
          {Object.entries(INSTALL_SCOPE_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-start gap-2 text-sm">
              <input
                key={`scope-${value}-${fieldKey}`}
                type="radio"
                name="installScope"
                value={value}
                defaultChecked={
                  (ev.installScope ?? "PROJECT") === value
                }
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">{label}</span>
                <p className="text-xs text-muted-foreground">
                  {INSTALL_SCOPE_DESCRIPTIONS[value]}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Content (inline only) */}
      {!isBundle && (
        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            key={`content-${fieldKey}`}
            id="content"
            name="content"
            required
            defaultValue={ev.content}
            placeholder="Paste your skill/command/agent content here..."
            className="min-h-[300px] font-mono text-sm"
          />
        </div>
      )}

      {/* Primary File Name */}
      <div className="space-y-2">
        <Label htmlFor="primaryFileName">Primary File Name</Label>
        <Input
          id="primaryFileName"
          name="primaryFileName"
          required
          defaultValue={
            ev.primaryFileName ??
            (fileNameTouched ? undefined : autoFileName)
          }
          key={fileNameTouched ? `touched-${fieldKey}` : `${autoFileName}-${fieldKey}`}
          onChange={() => setFileNameTouched(true)}
          placeholder="e.g. SKILL.md"
        />
        {isBundle && (
          <p className="text-xs text-muted-foreground">
            The primary file from the bundle to use for preview and search.
          </p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={pending || uploadingZip} className="w-full sm:w-auto">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
