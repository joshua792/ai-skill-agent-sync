"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
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
} from "@/lib/constants";

interface AssetFormProps {
  action: (formData: FormData) => Promise<void>;
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
  };
  submitLabel?: string;
}

export function AssetForm({
  action,
  defaultValues = {},
  submitLabel = "Create Asset",
}: AssetFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
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

  const autoFileName = DEFAULT_FILE_NAMES[selectedType] ?? "README.md";

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await action(formData);
      toast.success("Asset saved successfully!");
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
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues.name}
          placeholder="e.g. Smart Commit"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          defaultValue={defaultValues.description}
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
          name="primaryPlatform"
          defaultValue={defaultValues.primaryPlatform ?? "CLAUDE_CODE"}
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
                type="checkbox"
                name="compatiblePlatforms"
                value={value}
                defaultChecked={defaultValues.compatiblePlatforms?.includes(
                  value
                )}
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
          name="category"
          defaultValue={defaultValues.category ?? "OTHER"}
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
          id="tags"
          name="tags"
          defaultValue={defaultValues.tags?.join(", ")}
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
                type="radio"
                name="visibility"
                value={value}
                defaultChecked={
                  (defaultValues.visibility ?? "PRIVATE") === value
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
          name="license"
          defaultValue={defaultValues.license ?? "UNLICENSED"}
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
                type="radio"
                name="installScope"
                value={value}
                defaultChecked={
                  (defaultValues.installScope ?? "PROJECT") === value
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

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          required
          defaultValue={defaultValues.content}
          placeholder="Paste your skill/command/agent content here..."
          className="min-h-[300px] font-mono text-sm"
        />
      </div>

      {/* Primary File Name */}
      <div className="space-y-2">
        <Label htmlFor="primaryFileName">Primary File Name</Label>
        <Input
          id="primaryFileName"
          name="primaryFileName"
          required
          defaultValue={
            defaultValues.primaryFileName ??
            (fileNameTouched ? undefined : autoFileName)
          }
          key={fileNameTouched ? "touched" : autoFileName}
          onChange={() => setFileNameTouched(true)}
          placeholder="e.g. SKILL.md"
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
