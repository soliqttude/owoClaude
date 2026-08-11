const cooldowns = new Map<string, number>();

export const GAMBLING_COOLDOWN_SECONDS = 10;

export function checkCooldown(userId: string, commandName: string) {
  const key = `${commandName}:${userId}`;
  const expiresAt = cooldowns.get(key);
  if (!expiresAt) return 0;

  const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
  if (remaining <= 0) {
    cooldowns.delete(key);
    return 0;
  }

  return remaining;
}

export function setCooldown(userId: string, commandName: string, seconds: number) {
  if (seconds <= 0) return;
  const expiresAt = Date.now() + seconds * 1000;
  cooldowns.set(`${commandName}:${userId}`, expiresAt);
}
