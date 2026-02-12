"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/lib/actions/user";

const BIO_MAX = 280;

interface ProfileFormProps {
  displayName: string | null;
  bio: string | null;
}

export function ProfileForm({ displayName, bio }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bioValue, setBioValue] = useState(bio ?? "");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        toast.success("Profile updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={displayName ?? ""}
          placeholder="Your display name"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">
          Shown on your profile and alongside your assets.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          placeholder="Tell others a bit about yourself"
          maxLength={BIO_MAX}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {bioValue.length}/{BIO_MAX} characters
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
