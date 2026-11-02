export type Task = {
  id: string;
  title: string;
  url: string;
  details: string;
  createdAt: string;
  updatedAt: string;
  done: boolean;
  deleted: boolean;
};

function validDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.length <= 40;
}

export function validateTasks(raw: unknown): Task[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 300) throw new Error('Invalid tasks or too many tasks.');
  const seen = new Set<string>();
  return raw.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid task.');
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || !/^task-[a-f0-9-]{36}$/.test(item.id) || seen.has(item.id)) throw new Error('Invalid task ID.');
    seen.add(item.id);
    if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 180) throw new Error('Invalid task title.');
    if (typeof item.url !== 'string' || item.url.length > 500) throw new Error('Invalid task link.');
    if (item.url) {
      try { if (!['https:', 'http:'].includes(new URL(item.url).protocol)) throw new Error(); }
      catch { throw new Error('Task links must use http or https.'); }
    }
    if (typeof item.details !== 'string' || item.details.length > 1000) throw new Error('Invalid task details.');
    if (!validDate(item.createdAt) || !validDate(item.updatedAt)) throw new Error('Invalid task date.');
    if (typeof item.done !== 'boolean' || typeof item.deleted !== 'boolean') throw new Error('Invalid task status.');
    return { id: item.id, title: item.title.trim(), url: item.url.trim(), details: item.details.trim(), createdAt: item.createdAt, updatedAt: item.updatedAt, done: item.done, deleted: item.deleted };
  });
}

export function latestOpenTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.done && !task.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
}
