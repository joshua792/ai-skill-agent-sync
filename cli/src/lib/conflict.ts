export type SyncDecision =
  | "push"
  | "pull"
  | "conflict-push"
  | "conflict-pull"
  | "up-to-date";

export function decideSyncAction(
  localHashChanged: boolean,
  serverVersionChanged: boolean,
  localMtime: Date,
  serverUpdatedAt: Date
): SyncDecision {
  if (!localHashChanged && !serverVersionChanged) return "up-to-date";
  if (localHashChanged && !serverVersionChanged) return "push";
  if (!localHashChanged && serverVersionChanged) return "pull";

  // Both changed — last-write-wins
  return localMtime > serverUpdatedAt ? "conflict-push" : "conflict-pull";
}
