import { catalog, categoryOptions, type EntryType, type Item } from './catalog';

export type Library = { customItems: Item[]; overrides: Record<string, Item>; hiddenIds: string[] };
export const emptyLibrary = (): Library => ({ customItems: [], overrides: {}, hiddenIds: [] });

const entryTypes: EntryType[] = ['Resource', 'Career Path', 'Course', 'Certificate'];
const builtInIds = new Set(catalog.map((item) => item.id));

export function entryTypeOf(item: Item): EntryType {
  if (item.entryType) return item.entryType;
  if (item.kind === 'credential') return 'Certificate';
  if (item.resourceType === 'COURSE') return 'Course';
  return 'Resource';
}

export function allLibraryItems(library: Library, includeHidden = false): Item[] {
  const items = [...catalog.map((item) => library.overrides[item.id] ?? item), ...library.customItems];
  return includeHidden ? items : items.filter((item) => !library.hiddenIds.includes(item.id));
}

function boundedText(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${name} must be 1–${max} characters.`);
  return value.trim();
}

export function validateItem(raw: unknown, expectedId?: string): Item {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid library entry.');
  const value = raw as Record<string, unknown>;
  const id = boundedText(value.id, 'Entry ID', 80);
  if (expectedId && id !== expectedId) throw new Error('An entry ID cannot change.');
  const entryType = value.entryType;
  if (!entryTypes.includes(entryType as EntryType)) throw new Error('Choose a valid entry type.');
  const category = value.category;
  if (!categoryOptions.includes(category as Item['category'])) throw new Error('Choose a valid category.');
  const url = boundedText(value.url, 'URL', 500);
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error();
  } catch { throw new Error('Enter a valid http or https URL.'); }
  const kind = entryType === 'Certificate' ? 'credential' : 'resource';
  if (value.priority !== undefined && !['P1', 'P2', 'P3'].includes(value.priority as string)) throw new Error('Choose a valid priority.');
  return {
    id,
    provider: boundedText(value.provider, 'Provider', 100),
    title: boundedText(value.title, 'Title', 160),
    category: category as Item['category'],
    kind,
    entryType: entryType as EntryType,
    summary: boundedText(value.summary, 'Description', 500),
    url,
    ...(value.priority ? { priority: value.priority as Item['priority'] } : {}),
    ...(kind === 'credential' && value.badge === true ? { badge: true } : {})
  };
}

export function validateLibrary(raw: unknown): Library {
  if (raw === undefined || raw === null) return emptyLibrary();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid library data.');
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.customItems) || value.customItems.length > 300) throw new Error('Invalid custom entries.');
  if (!value.overrides || typeof value.overrides !== 'object' || Array.isArray(value.overrides)) throw new Error('Invalid edited entries.');
  if (!Array.isArray(value.hiddenIds)) throw new Error('Invalid deleted entries.');
  const customItems = value.customItems.map((item) => validateItem(item));
  const customIds = new Set<string>();
  for (const item of customItems) {
    if (!/^custom-[a-f0-9-]{36}$/.test(item.id) || builtInIds.has(item.id) || customIds.has(item.id)) throw new Error('Invalid or duplicate custom entry ID.');
    customIds.add(item.id);
  }
  const overrides: Record<string, Item> = {};
  for (const [id, item] of Object.entries(value.overrides)) {
    if (!builtInIds.has(id)) throw new Error('An edited entry does not exist in the catalog.');
    overrides[id] = validateItem(item, id);
  }
  const hiddenIds: string[] = [];
  for (const id of value.hiddenIds) {
    if (typeof id !== 'string' || (!builtInIds.has(id) && !customIds.has(id)) || hiddenIds.includes(id)) throw new Error('Invalid deleted entry ID.');
    hiddenIds.push(id);
  }
  return { customItems, overrides, hiddenIds };
}
