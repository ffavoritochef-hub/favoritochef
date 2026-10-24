// Limite simples em memória (processo único na VPS).

const buckets = new Map<string, Map<string, number[]>>();

/** true = passou do limite. `name` separa os contadores de cada rota. */
export function rateLimited(name: string, key: string, max: number, windowMs: number): boolean {
  let hits = buckets.get(name);
  if (!hits) buckets.set(name, (hits = new Map()));
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const limited = recent.length >= max;
  if (!limited) recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return limited;
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}
