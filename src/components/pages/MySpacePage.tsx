import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  Download,
  Feather,
  HardDrive,
  Heart,
  Mic,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Wind,
} from 'lucide-react';
import { Wish } from '../../types';
import { UserBookNote, INITIAL_USER_NOTES } from '../../data/abundanceBookStructure';
import {
  ABUNDANCE_NOTES_UPDATED_EVENT,
  downloadBackupFile,
  getReadingNotesCount,
  hasPreImportSnapshot,
  importBackupFromJsonText,
  loadMergedReadingNotes,
  restorePreImportSnapshot,
} from '../../services/backupService';
import {
  GRATITUDE_ENTRIES_STORAGE_KEY,
  LETGO_ENTRIES_STORAGE_KEY,
  REFLECTION_ENTRIES_STORAGE_KEY,
  SimpleJournalEntry,
} from './ManifestationPage';
import type { PrimaryViewId } from './HomePage';

interface SavedVoiceSummary {
  id: string;
  name: string;
  duration: number;
  createdAt: string;
}

interface MySpacePageProps {
  language: 'zh' | 'en';
  wishes: Wish[];
  onImportWishes: (imported: Wish[]) => void;
  onOpenShareModal: () => void;
  onStartMeditationForWish: (wish: Wish) => void;
  onNavigate: (view: PrimaryViewId) => void;
}

function readJsonArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`Failed to parse localStorage key ${key}:`, e);
  }
  return [];
}

export default function MySpacePage({
  language,
  wishes,
  onImportWishes,
  onOpenShareModal,
  onStartMeditationForWish,
  onNavigate,
}: MySpacePageProps) {
  const isEn = language === 'en';

  const [readingNotes, setReadingNotes] = useState<UserBookNote[]>(() =>
    loadMergedReadingNotes(window.localStorage, INITIAL_USER_NOTES)
  );
  const [savedVoicesCount, setSavedVoicesCount] = useState<number>(() =>
    readJsonArray<SavedVoiceSummary>('lumiere_saved_voices').length
  );
  const [gratitudeCount, setGratitudeCount] = useState<number>(() =>
    readJsonArray<SimpleJournalEntry>(GRATITUDE_ENTRIES_STORAGE_KEY).length
  );
  const [letGoCount, setLetGoCount] = useState<number>(() =>
    readJsonArray<SimpleJournalEntry>(LETGO_ENTRIES_STORAGE_KEY).length
  );

  const [reflections, setReflections] = useState<SimpleJournalEntry[]>(() =>
    readJsonArray<SimpleJournalEntry>(REFLECTION_ENTRIES_STORAGE_KEY)
  );
  const [newReflection, setNewReflection] = useState('');

  const [hasSnapshot, setHasSnapshot] = useState<boolean>(() => Boolean(hasPreImportSnapshot()));
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    const refreshAll = () => {
      setReadingNotes(loadMergedReadingNotes(window.localStorage, INITIAL_USER_NOTES));
      setSavedVoicesCount(readJsonArray<SavedVoiceSummary>('lumiere_saved_voices').length);
      setGratitudeCount(readJsonArray<SimpleJournalEntry>(GRATITUDE_ENTRIES_STORAGE_KEY).length);
      setLetGoCount(readJsonArray<SimpleJournalEntry>(LETGO_ENTRIES_STORAGE_KEY).length);
      setReflections(readJsonArray<SimpleJournalEntry>(REFLECTION_ENTRIES_STORAGE_KEY));
      setHasSnapshot(Boolean(hasPreImportSnapshot()));
    };

    window.addEventListener(ABUNDANCE_NOTES_UPDATED_EVENT, refreshAll);
    return () => {
      window.removeEventListener(ABUNDANCE_NOTES_UPDATED_EVENT, refreshAll);
    };
  }, [wishes]);

  useEffect(() => {
    try {
      localStorage.setItem(REFLECTION_ENTRIES_STORAGE_KEY, JSON.stringify(reflections));
    } catch (e) {
      console.warn('Failed to save personal reflections:', e);
    }
  }, [reflections]);

  const handleAddReflection = (e: FormEvent) => {
    e.preventDefault();
    if (!newReflection.trim()) return;
    setReflections((prev) => [
      { id: `refl-${Date.now()}`, content: newReflection.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setNewReflection('');
  };

  const handleExportBackup = () => {
    const ok = downloadBackupFile(wishes, 'lumiere_manifest_local_backup');
    if (ok) {
      setBackupFeedback({
        type: 'success',
        message: isEn
          ? `Exported ${wishes.length} wishes & ${getReadingNotesCount()} reading notes.`
          : `已导出 ${wishes.length} 个愿望与 ${getReadingNotesCount()} 条读书笔记备份。`,
      });
    } else {
      setBackupFeedback({
        type: 'error',
        message: isEn ? 'Failed to export backup file.' : '导出失败，请重试。',
      });
    }
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = typeof event.target?.result === 'string' ? event.target.result : '';
      const result = importBackupFromJsonText(content, wishes, (imported) => {
        onImportWishes(imported);
      });
      if ('errorZh' in result) {
        setBackupFeedback({
          type: 'error',
          message: isEn ? result.errorEn : result.errorZh,
        });
      } else {
        setReadingNotes(loadMergedReadingNotes(window.localStorage, INITIAL_USER_NOTES));
        setHasSnapshot(Boolean(hasPreImportSnapshot()));
        setBackupFeedback({
          type: 'success',
          message: isEn
            ? `Imported ${result.wishesCount} wishes${result.notesImported ? ` & ${result.notesCount} notes` : ''}. Pre-import snapshot saved.`
            : `已成功导入 ${result.wishesCount} 个愿望${result.notesImported ? `与 ${result.notesCount} 条读书笔记` : ''}（已留存导入前快照）。`,
        });
      }
      inputEl.value = '';
    };
    reader.readAsText(file);
  };

  const handleRestoreSnapshot = () => {
    const res = restorePreImportSnapshot((restored) => {
      onImportWishes(restored);
    });
    if ('errorZh' in res) {
      setBackupFeedback({
        type: 'error',
        message: isEn ? res.errorEn : res.errorZh,
      });
    } else {
      setReadingNotes(loadMergedReadingNotes(window.localStorage, INITIAL_USER_NOTES));
      setBackupFeedback({
        type: 'success',
        message: isEn
          ? `Restored snapshot (${res.wishesCount} wishes).`
          : `已恢复至导入前快照（${res.wishesCount} 个愿望与原笔记）。`,
      });
    }
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-fadeIn" id="myspace-page">
      {/* A. My Overview */}
      <section className="amnd-surface p-6 md:p-8 text-left space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--amnd-border)] pb-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
              <HardDrive className="w-3.5 h-3.5 text-[var(--amnd-success)]" />
              <span>{isEn ? 'My Space · Modern Personal Journal' : '我的空间 · 私人成长与记录档案'}</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[var(--amnd-text-primary)] tracking-tight">
              My Space · {isEn ? 'Your Private Record' : '我的成长记录'}
            </h2>
            <p className="text-sm text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'A warm, quiet personal archive connecting your wishes, 《Abundance》 reading notes, personal reflections, and local JSON backups. No login or cloud account required.'
                : '将你的愿望列表、《丰盛》读书笔记、个人感悟与本地备份集中安放在此。无需登录或云端同步，所有记录均私密保存在你的设备中。'}
            </p>
          </div>
          <p className="text-xs text-[var(--amnd-text-muted)] shrink-0">
            {isEn ? '100% Local Storage · Private' : '100% 本地私密保存 · 免注册'}
          </p>
        </div>

        {/* Real Live Counts (Never fabricated) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => onNavigate('manifestation')}
            className="p-4 amnd-surface-stone text-left hover:border-[var(--amnd-wood)] transition-colors cursor-pointer"
          >
            <span className="text-xs text-[var(--amnd-text-muted)] block">
              {isEn ? 'Saved Wishes' : '已记录心愿'}
            </span>
            <span className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)] tabular-nums mt-1 block">
              {wishes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('wisdom')}
            className="p-4 amnd-surface-stone text-left hover:border-[var(--amnd-wood)] transition-colors cursor-pointer"
          >
            <span className="text-xs text-[var(--amnd-text-muted)] block">
              {isEn ? 'Reading Notes' : '丰盛读书笔记'}
            </span>
            <span className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)] tabular-nums mt-1 block">
              {readingNotes.length}
            </span>
          </button>

          <div className="p-4 amnd-surface-stone text-left">
            <span className="text-xs text-[var(--amnd-text-muted)] block">
              {isEn ? 'Reflections & Gratitude' : '感悟 / 感恩与放下'}
            </span>
            <span className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)] tabular-nums mt-1 block">
              {reflections.length + gratitudeCount + letGoCount}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('stillness')}
            className="p-4 amnd-surface-stone text-left hover:border-[var(--amnd-wood)] transition-colors cursor-pointer"
          >
            <span className="text-xs text-[var(--amnd-text-muted)] block">
              {isEn ? 'Voice Recordings' : '个人声音录制'}
            </span>
            <span className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)] tabular-nums mt-1 block">
              {savedVoicesCount}
            </span>
          </button>
        </div>
      </section>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: B. My Wishes + C. My Reading Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* B. My Wishes */}
          <section className="amnd-surface p-6 space-y-4 text-left" id="myspace-wishes-section">
            <div className="flex items-center justify-between border-b border-[var(--amnd-border)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--amnd-gold)]" />
                <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
                  {isEn ? 'My Wishes' : '我的愿望档案'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('manifestation')}
                className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isEn ? 'Manage in Manifestation' : '前往编辑与新增'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {wishes.length === 0 ? (
              <p className="text-xs text-[var(--amnd-text-muted)] py-4">
                {isEn ? 'No wishes created yet.' : '当前尚未创建心愿，可前往「显化」空间写下第一条愿望。'}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {wishes.map((wish) => (
                  <div
                    key={wish.id}
                    className="p-4 rounded-xl bg-[var(--amnd-bg-primary)] border border-[var(--amnd-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-serif text-sm font-semibold text-[var(--amnd-text-primary)] truncate">
                        {wish.title}
                      </p>
                      <p className="text-xs text-[var(--amnd-text-secondary)] line-clamp-2 leading-relaxed">
                        {wish.details}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartMeditationForWish(wish)}
                      className="px-3.5 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Wind className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                      <span>{isEn ? 'Meditate' : '伴随静坐'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* C. My Reading Notes */}
          <section className="amnd-surface p-6 space-y-4 text-left" id="myspace-notes-section">
            <div className="flex items-center justify-between border-b border-[var(--amnd-border)] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--amnd-wood)]" />
                <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
                  {isEn ? 'My Reading Notes' : '我的阅读笔记'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('wisdom')}
                className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isEn ? 'Open in Wisdom' : '前往智慧空间记录'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {readingNotes.length === 0 ? (
              <p className="text-xs text-[var(--amnd-text-muted)] py-4">
                {isEn ? 'No reading notes yet.' : '暂无阅读笔记。'}
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {readingNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-[var(--amnd-bg-primary)] border border-[var(--amnd-border)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--amnd-text-muted)]">
                      <span className="truncate font-medium text-[var(--amnd-wood)]">
                        {note.chapterTitle || (isEn ? '《Abundance》 Note' : '《丰盛》读书笔记')}
                      </span>
                      <span className="tabular-nums shrink-0">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-serif text-sm font-semibold text-[var(--amnd-text-primary)]">
                      {note.quoteOrTitle}
                    </p>
                    {note.reflection && (
                      <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed line-clamp-3">
                        {note.reflection}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: D. My Reflections + E. My Practice + F. Data & Backup */}
        <div className="lg:col-span-5 space-y-6">
          {/* D. My Reflections */}
          <section className="amnd-surface p-6 space-y-4 text-left" id="myspace-reflections-section">
            <div className="space-y-1 border-b border-[var(--amnd-border)] pb-3">
              <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
                <Feather className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                <span>{isEn ? 'Personal Reflections' : '个人感悟记录'}</span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'My Reflections' : '我的感悟随笔'}
              </h3>
            </div>

            <form onSubmit={handleAddReflection} className="space-y-2.5">
              <textarea
                rows={3}
                value={newReflection}
                onChange={(e) => setNewReflection(e.target.value)}
                placeholder={
                  isEn
                    ? 'Capture an honest reflection from reading, stillness, or everyday life...'
                    : '写下阅读、静坐或日常生活中真实的内在体会...'
                }
                className="w-full text-xs sm:text-sm p-3 amnd-input resize-none"
                id="myspace-reflection-input"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  id="myspace-reflection-submit"
                  className="px-4 py-2 amnd-btn-primary text-xs font-medium cursor-pointer"
                >
                  {isEn ? 'Save Note' : '保存感悟'}
                </button>
              </div>
            </form>

            {reflections.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                {reflections.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-[var(--amnd-bg-primary)] border border-[var(--amnd-border)] flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-[var(--amnd-text-primary)] leading-relaxed break-words">
                        {entry.content}
                      </p>
                      <span className="text-[10px] text-[var(--amnd-text-muted)] tabular-nums">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReflections((prev) => prev.filter((r) => r.id !== entry.id))}
                      className="p-1 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-danger)] cursor-pointer shrink-0"
                      aria-label={isEn ? 'Delete reflection' : '删除感悟'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--amnd-text-muted)]">
                {isEn
                  ? 'No reflection notes recorded yet.'
                  : '暂无个人感悟记录，写下第一段想法即可在此沉淀。'}
              </p>
            )}
          </section>

          {/* E. My Practice (Honest status + V3 note, no fabricated history) */}
          <section className="amnd-surface-stone p-6 space-y-3 text-left" id="myspace-practice-section">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'My Practice' : '静心与声音练习状态'}
              </h3>
              <span className="text-[11px] text-[var(--amnd-text-muted)]">
                {isEn ? 'Timeline in V3' : 'V3 规划时间线'}
              </span>
            </div>
            <div className="space-y-2 text-xs text-[var(--amnd-text-secondary)]">
              <div className="flex items-center justify-between py-2 border-b border-[var(--amnd-border)]">
                <span className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                  <span>{isEn ? 'Saved Voice Mantras' : '已录制声波肯定句'}</span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--amnd-text-primary)]">
                  {savedVoicesCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--amnd-border)]">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                  <span>{isEn ? 'Gratitude & Let Go Entries' : '感恩与放下记录'}</span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--amnd-text-primary)]">
                  {gratitudeCount + letGoCount}
                </span>
              </div>
              <p className="text-[11px] text-[var(--amnd-text-muted)] leading-relaxed pt-1">
                {isEn
                  ? 'Full meditation history tracking and a personal growth timeline are reserved for V3; we never display fabricated sitting records.'
                  : '系统暂不记录虚假的静坐打卡数据；完整的静坐历史统计与个人成长时间线将在 V3 版本上线。'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('stillness')}
              className="w-full py-2.5 px-4 amnd-btn-secondary text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isEn ? 'Go to Stillness Space' : '前往静心空间练习'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
            </button>
          </section>

          {/* F. Data & Backup (Direct reuse of backupService.ts, 100% schema compatible) */}
          <section className="amnd-surface p-6 space-y-4 text-left" id="myspace-backup-section">
            <div className="space-y-1 border-b border-[var(--amnd-border)] pb-3">
              <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'Data & JSON Backup' : '数据备份与恢复'}
              </h3>
              <p className="text-xs text-[var(--amnd-text-muted)] leading-relaxed">
                {isEn
                  ? 'Export or restore all wishes and 《Abundance》 reading notes in the original JSON backup format with pre-import snapshot safety.'
                  : '使用原有 JSON 备份协议一键导出、导入全部愿望与《丰盛》读书笔记，导入前自动保留安全快照。'}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                id="myspace-export-backup-btn"
                className="w-full py-2.5 px-4 amnd-btn-primary text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isEn ? 'Export JSON Backup' : '导出本地备份 (.json)'}</span>
              </button>

              <label className="w-full py-2.5 px-4 amnd-btn-secondary text-xs font-medium flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                <span>{isEn ? 'Import / Restore JSON' : '导入 / 还原 JSON 备份'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                  id="myspace-import-backup-input"
                />
              </label>

              {hasSnapshot && (
                <button
                  type="button"
                  onClick={handleRestoreSnapshot}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] border border-[var(--amnd-border)] text-xs font-medium text-[var(--amnd-text-secondary)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                  <span>{isEn ? 'Restore Pre-Import Snapshot' : '撤销导入（恢复导入前快照）'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenShareModal}
                className="w-full py-2 px-3 rounded-xl border border-[var(--amnd-border)] text-xs font-medium text-[var(--amnd-wood)] hover:bg-[var(--amnd-bg-secondary)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Open Share & Backup Center' : '打开分享与同步弹窗'}</span>
              </button>
            </div>

            {backupFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  backupFeedback.type === 'error'
                    ? 'bg-[var(--amnd-danger-soft)] text-[var(--amnd-danger)] border border-[var(--amnd-danger)]/20'
                    : 'bg-[var(--amnd-success-soft)] text-[var(--amnd-success)] border border-[var(--amnd-success)]/20'
                }`}
              >
                {backupFeedback.message}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
