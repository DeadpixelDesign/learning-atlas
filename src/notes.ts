import type { Item } from './catalog';

export type Notes = Record<string, string>;
export const MAX_NOTE_LENGTH = 100_000;
export const MAX_ALL_NOTES_LENGTH = 300_000;

export function validateNotes(raw: unknown, items: Item[]): Notes {
  if (raw === undefined || raw === null) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid notes data.');
  const ids = new Set(items.map((item) => item.id));
  const notes: Notes = {};
  let total = 0;
  for (const [id, markdown] of Object.entries(raw)) {
    if (!ids.has(id) || typeof markdown !== 'string' || markdown.length > MAX_NOTE_LENGTH) throw new Error('Invalid note in backup.');
    total += markdown.length;
    if (total > MAX_ALL_NOTES_LENGTH) throw new Error('Notes exceed the storage limit.');
    if (markdown) notes[id] = markdown;
  }
  return notes;
}
