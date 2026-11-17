import { Wish } from '../types';
import { UserBookNote, INITIAL_USER_NOTES } from '../data/abundanceBookStructure';

export const WISHES_PRIMARY_KEY = 'princess_manifestation_wishes';
export const WISHES_LEGACY_KEY = 'lumiere_wishes_v1';

export const READING_NOTES_STORAGE_KEY = 'ABUNDANCE_USER_READING_NOTES_V1';
export const LEGACY_READING_NOTES_STORAGE_KEY = 'lumiere_abundance_notes_v1';

export const PRE_IMPORT_SNAPSHOT_KEY = 'amnd_pre_import_snapshot_v1';
export const ABUNDANCE_NOTES_UPDATED_EVENT = 'amnd:reading-notes-updated';

export const SUPPORTED_BACKUP_VERSIONS = ['1.0', '1.1', '2.0'] as const;
export const CURRENT_BACKUP_VERSION = '1.1';
export const SUPPORTED_APP_IDENTIFIERS = ['LUMIERE_MANIFEST', 'AMND_MANIFESTATION'] as const;

const VALID_WISH_CATEGORIES = new Set(['love', 'wealth', 'beauty', 'career', 'lifestyle']);
const VALID_NOTE_CATEGORIES = new Set(['wealth', 'worth', 'surrender', 'gratitude', 'now', 'general']);

export const VALIDATION_LIMITS = {
  MAX_FILE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_WISHES: 1000,
  MAX_NOTES: 2000,
  MAX_ID_LENGTH: 128,
  MAX_TIMESTAMP_LENGTH: 64,
  MAX_WISH_TITLE_LENGTH: 500,
  MAX_WISH_DETAILS_LENGTH: 20000,
  MAX_WISH_VISUALIZATION_LENGTH: 50000,
  MAX_NOTE_TITLE_LENGTH: 2000,
  MAX_NOTE_REFLECTION_LENGTH: 30000,
  MAX_NOTE_CHAPTER_TITLE_LENGTH: 300,
  MAX_TAGS_PER_NOTE: 50,
  MAX_TAG_LENGTH: 100,
} as const;

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

export interface BackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  wishes: Wish[];
  readingNotes: UserBookNote[];
}

export interface PreImportSnapshot {
  savedAt: string;
  wishes: Wish[];
  readingNotesRaw: string | null;
  legacyNotesRaw: string | null;
}

export type BackupParseResult =
  | {
      ok: true;
      data: {
        version: string;
        wishes: Wish[];
        readingNotes: UserBookNote[] | null; // null means legacy file omitted notes section entirely
      };
    }
  | {
      ok: false;
      errorZh: string;
      errorEn: string;
    };

export type BackupImportResult =
  | {
      ok: true;
      wishesCount: number;
      notesCount: number;
      notesImported: boolean;
      snapshotSaved: boolean;
    }
  | {
      ok: false;
      errorZh: string;
      errorEn: string;
    };

function getDefaultStorage(): StorageLike | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function safeParseArray(raw: string | null): unknown[] | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Validates and constructs a clean Wish object without modifying valid user text.
 */
export function validateWishItem(
  item: unknown,
  index: number
): { ok: true; value: Wish } | { ok: false; errorZh: string; errorEn: string } {
  if (!isPlainObject(item)) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望格式无效（应为对象）。`,
      errorEn: `Wish #${index + 1} has an invalid format (expected object).`,
    };
  }

  if (typeof item.id !== 'string' || item.id.trim().length === 0 || item.id.length > VALIDATION_LIMITS.MAX_ID_LENGTH) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望缺少有效 ID 或 ID 过长。`,
      errorEn: `Wish #${index + 1} is missing a valid ID or ID is too long.`,
    };
  }

  if (typeof item.title !== 'string' || item.title.trim().length === 0) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望缺少标题。`,
      errorEn: `Wish #${index + 1} is missing a title.`,
    };
  }
  if (item.title.length > VALIDATION_LIMITS.MAX_WISH_TITLE_LENGTH) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望标题超过 ${VALIDATION_LIMITS.MAX_WISH_TITLE_LENGTH} 字符限制。`,
      errorEn: `Wish #${index + 1} title exceeds ${VALIDATION_LIMITS.MAX_WISH_TITLE_LENGTH} characters.`,
    };
  }

  if (typeof item.category !== 'string' || !VALID_WISH_CATEGORIES.has(item.category)) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望分类无效（${String(item.category)}）。`,
      errorEn: `Wish #${index + 1} has an invalid category (${String(item.category)}).`,
    };
  }

  if (item.details !== undefined && typeof item.details !== 'string') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望的描述字段类型无效。`,
      errorEn: `Wish #${index + 1} has an invalid details field type.`,
    };
  }
  const details = typeof item.details === 'string' ? item.details : '';
  if (details.length > VALIDATION_LIMITS.MAX_WISH_DETAILS_LENGTH) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望描述超过长度限制。`,
      errorEn: `Wish #${index + 1} details exceed maximum allowed length.`,
    };
  }

  if (item.visualizationDetails !== undefined && typeof item.visualizationDetails !== 'string') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望的中文显化细节字段类型无效。`,
      errorEn: `Wish #${index + 1} has an invalid visualizationDetails field.`,
    };
  }
  if (
    typeof item.visualizationDetails === 'string' &&
    item.visualizationDetails.length > VALIDATION_LIMITS.MAX_WISH_VISUALIZATION_LENGTH
  ) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望的中文显化细节超过长度限制。`,
      errorEn: `Wish #${index + 1} visualizationDetails exceeds maximum allowed length.`,
    };
  }

  if (item.visualizationDetailsEn !== undefined && typeof item.visualizationDetailsEn !== 'string') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望的英文显化细节字段类型无效。`,
      errorEn: `Wish #${index + 1} has an invalid visualizationDetailsEn field.`,
    };
  }
  if (
    typeof item.visualizationDetailsEn === 'string' &&
    item.visualizationDetailsEn.length > VALIDATION_LIMITS.MAX_WISH_VISUALIZATION_LENGTH
  ) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望的英文显化细节超过长度限制。`,
      errorEn: `Wish #${index + 1} visualizationDetailsEn exceeds maximum allowed length.`,
    };
  }

  if (item.isManifested !== undefined && typeof item.isManifested !== 'boolean') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望的 isManifested 字段必须为布尔值。`,
      errorEn: `Wish #${index + 1} has a non-boolean isManifested value.`,
    };
  }

  if (
    typeof item.createdAt !== 'string' ||
    item.createdAt.trim().length === 0 ||
    item.createdAt.length > VALIDATION_LIMITS.MAX_TIMESTAMP_LENGTH
  ) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条愿望缺少有效的创建时间（createdAt）。`,
      errorEn: `Wish #${index + 1} is missing a valid createdAt timestamp.`,
    };
  }

  const cleanWish: Wish = {
    id: item.id,
    title: item.title,
    category: item.category as Wish['category'],
    details,
    isManifested: typeof item.isManifested === 'boolean' ? item.isManifested : false,
    createdAt: item.createdAt,
  };

  if (typeof item.visualizationDetails === 'string') {
    cleanWish.visualizationDetails = item.visualizationDetails;
  }
  if (typeof item.visualizationDetailsEn === 'string') {
    cleanWish.visualizationDetailsEn = item.visualizationDetailsEn;
  }

  return { ok: true, value: cleanWish };
}

/**
 * Validates and constructs a clean UserBookNote object without altering ID, timestamps, content, or favorite state.
 */
export function validateReadingNoteItem(
  item: unknown,
  index: number
): { ok: true; value: UserBookNote } | { ok: false; errorZh: string; errorEn: string } {
  if (!isPlainObject(item)) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记格式无效（应为对象）。`,
      errorEn: `Reading note #${index + 1} has an invalid format (expected object).`,
    };
  }

  if (typeof item.id !== 'string' || item.id.trim().length === 0 || item.id.length > VALIDATION_LIMITS.MAX_ID_LENGTH) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记缺少有效 ID。`,
      errorEn: `Reading note #${index + 1} is missing a valid ID.`,
    };
  }

  if (typeof item.quoteOrTitle !== 'string') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记缺少标题或摘录字段。`,
      errorEn: `Reading note #${index + 1} is missing quoteOrTitle.`,
    };
  }
  if (item.quoteOrTitle.length > VALIDATION_LIMITS.MAX_NOTE_TITLE_LENGTH) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记标题/摘录超过长度限制。`,
      errorEn: `Reading note #${index + 1} quoteOrTitle exceeds maximum length.`,
    };
  }

  if (typeof item.reflection !== 'string') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记缺少感悟正文（reflection）。`,
      errorEn: `Reading note #${index + 1} is missing reflection text.`,
    };
  }
  if (item.reflection.length > VALIDATION_LIMITS.MAX_NOTE_REFLECTION_LENGTH) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记感悟正文超过长度限制。`,
      errorEn: `Reading note #${index + 1} reflection exceeds maximum length.`,
    };
  }

  if (typeof item.quoteOrTitle === 'string' && item.quoteOrTitle.trim() === '' && item.reflection.trim() === '') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记内容为空。`,
      errorEn: `Reading note #${index + 1} cannot have both empty title and reflection.`,
    };
  }

  if (typeof item.category !== 'string' || !VALID_NOTE_CATEGORIES.has(item.category)) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记分类无效（${String(item.category)}）。`,
      errorEn: `Reading note #${index + 1} has an invalid category (${String(item.category)}).`,
    };
  }

  if (!Array.isArray(item.tags)) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记的 tags 字段必须为数组。`,
      errorEn: `Reading note #${index + 1} tags must be an array.`,
    };
  }
  if (item.tags.length > VALIDATION_LIMITS.MAX_TAGS_PER_NOTE) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记标签数量过多。`,
      errorEn: `Reading note #${index + 1} has too many tags.`,
    };
  }
  for (let tIdx = 0; tIdx < item.tags.length; tIdx++) {
    const tag = item.tags[tIdx];
    if (typeof tag !== 'string' || tag.length > VALIDATION_LIMITS.MAX_TAG_LENGTH) {
      return {
        ok: false,
        errorZh: `第 ${index + 1} 条读书笔记包含无效或过长的标签。`,
        errorEn: `Reading note #${index + 1} contains an invalid or oversized tag.`,
      };
    }
  }

  if (typeof item.isFavorite !== 'boolean') {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记的收藏状态（isFavorite）必须为布尔值。`,
      errorEn: `Reading note #${index + 1} isFavorite must be a boolean.`,
    };
  }

  if (
    typeof item.createdAt !== 'string' ||
    item.createdAt.trim().length === 0 ||
    item.createdAt.length > VALIDATION_LIMITS.MAX_TIMESTAMP_LENGTH
  ) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记缺少有效的创建时间（createdAt）。`,
      errorEn: `Reading note #${index + 1} is missing a valid createdAt timestamp.`,
    };
  }

  if (item.chapterId !== undefined && (typeof item.chapterId !== 'string' || item.chapterId.length > VALIDATION_LIMITS.MAX_ID_LENGTH)) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记的 chapterId 无效。`,
      errorEn: `Reading note #${index + 1} has an invalid chapterId.`,
    };
  }

  if (
    item.chapterTitle !== undefined &&
    (typeof item.chapterTitle !== 'string' || item.chapterTitle.length > VALIDATION_LIMITS.MAX_NOTE_CHAPTER_TITLE_LENGTH)
  ) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记的 chapterTitle 无效或过长。`,
      errorEn: `Reading note #${index + 1} has an invalid chapterTitle.`,
    };
  }

  if (
    item.updatedAt !== undefined &&
    (typeof item.updatedAt !== 'string' || item.updatedAt.length > VALIDATION_LIMITS.MAX_TIMESTAMP_LENGTH)
  ) {
    return {
      ok: false,
      errorZh: `第 ${index + 1} 条读书笔记的 updatedAt 无效。`,
      errorEn: `Reading note #${index + 1} has an invalid updatedAt timestamp.`,
    };
  }

  const cleanNote: UserBookNote = {
    id: item.id,
    quoteOrTitle: item.quoteOrTitle,
    reflection: item.reflection,
    category: item.category as UserBookNote['category'],
    tags: [...item.tags],
    isFavorite: item.isFavorite,
    createdAt: item.createdAt,
  };

  if (typeof item.chapterId === 'string') cleanNote.chapterId = item.chapterId;
  if (typeof item.chapterTitle === 'string') cleanNote.chapterTitle = item.chapterTitle;
  if (typeof item.updatedAt === 'string') cleanNote.updatedAt = item.updatedAt;

  return { ok: true, value: cleanNote };
}

/**
 * Compares and merges notes from primary and legacy keys without losing either side
 * and without altering ID, content, createdAt, or favorite status of existing notes.
 */
export function mergeReadingNotes(primaryNotes: UserBookNote[], legacyNotes: UserBookNote[]): UserBookNote[] {
  if (legacyNotes.length === 0) return [...primaryNotes];
  if (primaryNotes.length === 0) return [...legacyNotes];

  const mergedMap = new Map<string, UserBookNote>();
  const orderedIds: string[] = [];

  for (const note of primaryNotes) {
    if (!mergedMap.has(note.id)) {
      orderedIds.push(note.id);
      mergedMap.set(note.id, note);
    }
  }

  for (const legacyNote of legacyNotes) {
    const existing = mergedMap.get(legacyNote.id);
    if (!existing) {
      orderedIds.push(legacyNote.id);
      mergedMap.set(legacyNote.id, legacyNote);
    } else {
      // Both keys have the same ID: compare updatedAt timestamps if present; never downgrade newer edits
      const existingUpdated = existing.updatedAt ? Date.parse(existing.updatedAt) : NaN;
      const legacyUpdated = legacyNote.updatedAt ? Date.parse(legacyNote.updatedAt) : NaN;
      if (!Number.isNaN(legacyUpdated) && (Number.isNaN(existingUpdated) || legacyUpdated > existingUpdated)) {
        mergedMap.set(legacyNote.id, legacyNote);
      }
    }
  }

  return orderedIds.map((id) => mergedMap.get(id)!);
}

function sanitizeStoredNotes(rawArray: unknown[] | null): UserBookNote[] {
  if (!rawArray) return [];
  const valid: UserBookNote[] = [];
  rawArray.forEach((item, idx) => {
    const res = validateReadingNoteItem(item, idx);
    if ('value' in res) {
      valid.push(res.value);
    }
  });
  return valid;
}

/**
 * Loads reading notes from ABUNDANCE_USER_READING_NOTES_V1 and safely compares/merges
 * with legacy lumiere_abundance_notes_v1 without deleting the legacy key.
 */
export function loadMergedReadingNotes(
  storage: StorageLike | null = getDefaultStorage(),
  fallbackNotes: UserBookNote[] = INITIAL_USER_NOTES
): UserBookNote[] {
  if (!storage) return [...fallbackNotes];

  const primaryRaw = storage.getItem(READING_NOTES_STORAGE_KEY);
  const legacyRaw = storage.getItem(LEGACY_READING_NOTES_STORAGE_KEY);

  const primaryParsed = safeParseArray(primaryRaw);
  const legacyParsed = safeParseArray(legacyRaw);

  const hasPrimaryKey = primaryParsed !== null;
  const primaryValid = sanitizeStoredNotes(primaryParsed);
  const legacyValid = sanitizeStoredNotes(legacyParsed);

  if (hasPrimaryKey && legacyValid.length > 0) {
    return mergeReadingNotes(primaryValid, legacyValid);
  }

  if (hasPrimaryKey) {
    return primaryValid;
  }

  if (legacyValid.length > 0) {
    return mergeReadingNotes(fallbackNotes, legacyValid);
  }

  return [...fallbackNotes];
}

export function getReadingNotesCount(storage: StorageLike | null = getDefaultStorage()): number {
  return loadMergedReadingNotes(storage).length;
}

/**
 * Builds the unified backup payload containing wishes and ALL reading notes.
 */
export function createBackupPayload(
  wishes: Wish[],
  storage: StorageLike | null = getDefaultStorage()
): BackupPayload {
  const readingNotes = loadMergedReadingNotes(storage);
  return {
    app: 'LUMIERE_MANIFEST',
    version: CURRENT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    wishes,
    readingNotes,
  };
}

export function serializeBackupPayload(
  wishes: Wish[],
  storage: StorageLike | null = getDefaultStorage()
): string {
  return JSON.stringify(createBackupPayload(wishes, storage), null, 2);
}

/**
 * Triggers a JSON download in the browser using the unified serializer.
 */
export function downloadBackupFile(
  wishes: Wish[],
  filenamePrefix = 'lumiere_manifest_local_backup',
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  try {
    const jsonString = serializeBackupPayload(wishes, storage);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) {
    console.error('Export backup failed:', e);
    return false;
  }
}

/**
 * Parses and strictly validates an imported JSON string before any storage writes occur.
 * Supports current (`readingNotes`, v1.1/2.0) and legacy (`abundanceNotes`, v1.0 / unversioned) formats.
 */
export function validateAndParseBackupJson(rawText: string): BackupParseResult {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      ok: false,
      errorZh: '导入失败：文件内容为空。',
      errorEn: 'Import failed: The selected file is empty.',
    };
  }

  if (rawText.length > VALIDATION_LIMITS.MAX_FILE_BYTES) {
    return {
      ok: false,
      errorZh: '导入失败：备份文件体积过大（超过 5MB 限制）。',
      errorEn: 'Import failed: Backup file exceeds the 5MB size limit.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      errorZh: '导入失败：不是有效的 JSON 文件，请检查文件格式。',
      errorEn: 'Import failed: Invalid JSON syntax.',
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      errorZh: '导入失败：备份数据结构无效（根节点必须为 JSON 对象）。',
      errorEn: 'Import failed: Root JSON value must be an object.',
    };
  }

  if (parsed.app !== undefined) {
    if (
      typeof parsed.app !== 'string' ||
      !(SUPPORTED_APP_IDENTIFIERS as readonly string[]).includes(parsed.app)
    ) {
      return {
        ok: false,
        errorZh: `导入失败：未知的应用标识（${String(parsed.app)}），请确认是否为本应用导出的备份。`,
        errorEn: `Import failed: Unrecognized app identifier (${String(parsed.app)}).`,
      };
    }
  }

  let resolvedVersion = '1.0';
  if (parsed.version !== undefined) {
    if (
      typeof parsed.version !== 'string' ||
      !(SUPPORTED_BACKUP_VERSIONS as readonly string[]).includes(parsed.version)
    ) {
      return {
        ok: false,
        errorZh: `导入失败：不支持的备份版本号（${String(parsed.version)}）。`,
        errorEn: `Import failed: Unsupported backup version (${String(parsed.version)}).`,
      };
    }
    resolvedVersion = parsed.version;
  }

  if (!Array.isArray(parsed.wishes)) {
    return {
      ok: false,
      errorZh: '导入失败：备份缺少有效的愿望列表（wishes 数组）。',
      errorEn: 'Import failed: Backup is missing a valid wishes array.',
    };
  }

  if (parsed.wishes.length > VALIDATION_LIMITS.MAX_WISHES) {
    return {
      ok: false,
      errorZh: `导入失败：愿望数量超过安全上限（最多 ${VALIDATION_LIMITS.MAX_WISHES} 条）。`,
      errorEn: `Import failed: Wishes count exceeds the ${VALIDATION_LIMITS.MAX_WISHES} item limit.`,
    };
  }

  const validatedWishes: Wish[] = [];
  for (let i = 0; i < parsed.wishes.length; i++) {
    const wishRes = validateWishItem(parsed.wishes[i], i);
    if ('errorZh' in wishRes) {
      return { ok: false, errorZh: wishRes.errorZh, errorEn: wishRes.errorEn };
    }
    validatedWishes.push(wishRes.value);
  }

  // Validate notes (readingNotes takes precedence; fallback to legacy abundanceNotes)
  const hasReadingNotes = 'readingNotes' in parsed && parsed.readingNotes !== undefined;
  const hasLegacyNotes = 'abundanceNotes' in parsed && parsed.abundanceNotes !== undefined;

  let validatedNotes: UserBookNote[] | null = null;
  if (hasReadingNotes || hasLegacyNotes) {
    const rawNotes = hasReadingNotes ? parsed.readingNotes : parsed.abundanceNotes;
    if (!Array.isArray(rawNotes)) {
      return {
        ok: false,
        errorZh: '导入失败：读书笔记字段必须为数组格式。',
        errorEn: 'Import failed: Reading notes field must be an array.',
      };
    }
    if (rawNotes.length > VALIDATION_LIMITS.MAX_NOTES) {
      return {
        ok: false,
        errorZh: `导入失败：读书笔记数量超过安全上限（最多 ${VALIDATION_LIMITS.MAX_NOTES} 条）。`,
        errorEn: `Import failed: Reading notes count exceeds the ${VALIDATION_LIMITS.MAX_NOTES} item limit.`,
      };
    }

    validatedNotes = [];
    for (let i = 0; i < rawNotes.length; i++) {
      const noteRes = validateReadingNoteItem(rawNotes[i], i);
      if ('errorZh' in noteRes) {
        return { ok: false, errorZh: noteRes.errorZh, errorEn: noteRes.errorEn };
      }
      validatedNotes.push(noteRes.value);
    }
  }

  return {
    ok: true,
    data: {
      version: resolvedVersion,
      wishes: validatedWishes,
      readingNotes: validatedNotes,
    },
  };
}

export function savePreImportSnapshot(
  currentWishes: Wish[],
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  if (!storage) return false;
  try {
    const snapshot: PreImportSnapshot = {
      savedAt: new Date().toISOString(),
      wishes: currentWishes,
      readingNotesRaw: storage.getItem(READING_NOTES_STORAGE_KEY),
      legacyNotesRaw: storage.getItem(LEGACY_READING_NOTES_STORAGE_KEY),
    };
    storage.setItem(PRE_IMPORT_SNAPSHOT_KEY, JSON.stringify(snapshot));
    return true;
  } catch (e) {
    console.warn('Failed to save pre-import safety snapshot:', e);
    return false;
  }
}

export function hasPreImportSnapshot(storage: StorageLike | null = getDefaultStorage()): PreImportSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PRE_IMPORT_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isPlainObject(parsed) && Array.isArray(parsed.wishes) && typeof parsed.savedAt === 'string') {
      return parsed as unknown as PreImportSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

export function dispatchNotesUpdatedEvent(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(ABUNDANCE_NOTES_UPDATED_EVENT));
  }
}

/**
 * Atomically validates and imports backup JSON.
 * Captures a pre-import snapshot before applying changes and rolls back on write failure.
 */
export function importBackupFromJsonText(
  rawText: string,
  currentWishes: Wish[],
  applyWishes: (wishes: Wish[]) => void,
  storage: StorageLike | null = getDefaultStorage()
): BackupImportResult {
  const parsed = validateAndParseBackupJson(rawText);
  if ('errorZh' in parsed) {
    return { ok: false, errorZh: parsed.errorZh, errorEn: parsed.errorEn };
  }

  // Preserve rollback state in memory in addition to localStorage snapshot
  const prevWishesPrimary = storage?.getItem(WISHES_PRIMARY_KEY) ?? null;
  const prevWishesLegacy = storage?.getItem(WISHES_LEGACY_KEY) ?? null;
  const prevNotesPrimary = storage?.getItem(READING_NOTES_STORAGE_KEY) ?? null;
  const prevNotesLegacy = storage?.getItem(LEGACY_READING_NOTES_STORAGE_KEY) ?? null;

  const snapshotSaved = savePreImportSnapshot(currentWishes, storage);

  try {
    // Write reading notes first (if present in backup)
    if (parsed.data.readingNotes !== null && storage) {
      // Compare with any legacy notes only if primary had nothing? No, backup restore restores the backup's notes;
      // Legacy key is preserved untouched as required ("不得直接删除旧 Key").
      storage.setItem(READING_NOTES_STORAGE_KEY, JSON.stringify(parsed.data.readingNotes));
    }

    // Apply validated wishes (updates App state + wishes localStorage keys)
    applyWishes(parsed.data.wishes);

    if (parsed.data.readingNotes !== null) {
      dispatchNotesUpdatedEvent();
    }

    return {
      ok: true,
      wishesCount: parsed.data.wishes.length,
      notesCount: parsed.data.readingNotes ? parsed.data.readingNotes.length : 0,
      notesImported: parsed.data.readingNotes !== null,
      snapshotSaved,
    };
  } catch (err) {
    // Rollback storage to pre-import state to guarantee no partial writes
    if (storage) {
      try {
        if (prevWishesPrimary !== null) storage.setItem(WISHES_PRIMARY_KEY, prevWishesPrimary);
        if (prevWishesLegacy !== null) storage.setItem(WISHES_LEGACY_KEY, prevWishesLegacy);
        if (prevNotesPrimary !== null) {
          storage.setItem(READING_NOTES_STORAGE_KEY, prevNotesPrimary);
        } else {
          storage.removeItem?.(READING_NOTES_STORAGE_KEY);
        }
        if (prevNotesLegacy !== null) storage.setItem(LEGACY_READING_NOTES_STORAGE_KEY, prevNotesLegacy);
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    console.error('Import failed during storage write:', err);
    return {
      ok: false,
      errorZh: '导入失败：写入本地存储时发生错误，已自动保留原有数据。',
      errorEn: 'Import failed while saving to local storage. Existing data has been preserved.',
    };
  }
}

/**
 * Restores data from the last automatic pre-import snapshot.
 */
export function restorePreImportSnapshot(
  applyWishes: (wishes: Wish[]) => void,
  storage: StorageLike | null = getDefaultStorage()
): { ok: true; wishesCount: number } | { ok: false; errorZh: string; errorEn: string } {
  const snapshot = hasPreImportSnapshot(storage);
  if (!snapshot || !storage) {
    return {
      ok: false,
      errorZh: '未找到可用的导入前备份快照。',
      errorEn: 'No pre-import snapshot available to restore.',
    };
  }

  try {
    if (snapshot.readingNotesRaw !== null) {
      storage.setItem(READING_NOTES_STORAGE_KEY, snapshot.readingNotesRaw);
    } else {
      storage.removeItem?.(READING_NOTES_STORAGE_KEY);
    }
    if (snapshot.legacyNotesRaw !== null) {
      storage.setItem(LEGACY_READING_NOTES_STORAGE_KEY, snapshot.legacyNotesRaw);
    }
    applyWishes(snapshot.wishes);
    dispatchNotesUpdatedEvent();
    return { ok: true, wishesCount: snapshot.wishes.length };
  } catch (err) {
    console.error('Failed to restore pre-import snapshot:', err);
    return {
      ok: false,
      errorZh: '恢复导入前备份失败。',
      errorEn: 'Failed to restore pre-import snapshot.',
    };
  }
}
