import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  Feather,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  ABUNDANCE_CHAPTERS_DATA,
  INITIAL_USER_NOTES,
  UserBookNote,
} from '../data/abundanceBookStructure';
import {
  ABUNDANCE_NOTES_UPDATED_EVENT,
  READING_NOTES_STORAGE_KEY,
  loadMergedReadingNotes,
} from '../services/backupService';

export interface EditorialThemeLabel {
  id: string;
  titleZh: string;
  titleEn: string;
  defaultCategory: UserBookNote['category'];
}

export const WISDOM_THEME_LABELS: Record<string, EditorialThemeLabel> = {
  'ch-1': {
    id: 'ch-1',
    titleZh: '内在的圆满，不需要向外证明',
    titleEn: 'Wholeness Does Not Need Proof',
    defaultCategory: 'worth',
  },
  'ch-2': {
    id: 'ch-2',
    titleZh: '看清比较与焦虑背后的预设',
    titleEn: 'Seeing Past Comparison and Scarcity',
    defaultCategory: 'general',
  },
  'ch-3': {
    id: 'ch-3',
    titleZh: '松开紧抓，允许事情自然展开',
    titleEn: 'Letting Go of Control',
    defaultCategory: 'surrender',
  },
  'ch-4': {
    id: 'ch-4',
    titleZh: '无条件的感谢，是最直接的安定',
    titleEn: 'Unconditional Gratitude as Steadiness',
    defaultCategory: 'gratitude',
  },
  'ch-5': {
    id: 'ch-5',
    titleZh: '回到此时此地，退出时间的拉扯',
    titleEn: 'Returning to the Present Moment',
    defaultCategory: 'now',
  },
  'ch-6': {
    id: 'ch-6',
    titleZh: '放下“不配得”，接纳原本的自己',
    titleEn: 'Releasing Unworthiness',
    defaultCategory: 'worth',
  },
  'ch-7': {
    id: 'ch-7',
    titleZh: '理解金钱与物质的顺流',
    titleEn: 'Understanding the Flow of Resources',
    defaultCategory: 'wealth',
  },
  'ch-8': {
    id: 'ch-8',
    titleZh: '宽恕与放下过去的重量',
    titleEn: 'Forgiveness and Releasing the Past',
    defaultCategory: 'surrender',
  },
};

export interface NoteDraftTrigger {
  chapterId?: string;
  quote?: string;
  category?: UserBookNote['category'];
  nonce: number;
}

interface AbundanceChapterNotesProps {
  language?: 'zh' | 'en';
  onSpeak?: (text: string) => Promise<void>;
  onAddCustomWish?: (
    title: string,
    details: string,
    category: 'wealth' | 'love' | 'beauty' | 'career' | 'lifestyle'
  ) => void;
  externalDraft?: NoteDraftTrigger | null;
  onNotesCountChange?: (count: number) => void;
}

function getCleanThemeDisplay(
  note: UserBookNote,
  isEn: boolean
): string | undefined {
  if (note.chapterId && WISDOM_THEME_LABELS[note.chapterId]) {
    return isEn
      ? WISDOM_THEME_LABELS[note.chapterId].titleEn
      : WISDOM_THEME_LABELS[note.chapterId].titleZh;
  }
  if (!note.chapterTitle) return undefined;
  return note.chapterTitle
    .replace(/^第[一二三四五六七八九十\d]+章[：:\s]*/u, '')
    .replace(/^Chapter\s+\d+[：:\s]*/i, '')
    .trim();
}

export default function AbundanceChapterNotes({
  language = 'zh',
  onSpeak,
  onAddCustomWish,
  externalDraft,
  onNotesCountChange,
}: AbundanceChapterNotesProps) {
  const isEn = language === 'en';

  const [notes, setNotes] = useState<UserBookNote[]>(() => {
    try {
      return loadMergedReadingNotes(window.localStorage, INITIAL_USER_NOTES);
    } catch (e) {
      console.error('Failed to load user notes from storage', e);
    }
    return INITIAL_USER_NOTES;
  });

  useEffect(() => {
    onNotesCountChange?.(notes.length);
  }, [notes.length, onNotesCountChange]);

  useEffect(() => {
    try {
      localStorage.setItem(READING_NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to persist user notes', e);
    }
  }, [notes]);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(READING_NOTES_STORAGE_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setNotes(parsed);
            return;
          }
        }
        setNotes(
          loadMergedReadingNotes(window.localStorage, INITIAL_USER_NOTES)
        );
      } catch (e) {
        console.error('Failed to refresh notes after backup event:', e);
      }
    };

    window.addEventListener(ABUNDANCE_NOTES_UPDATED_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener(
        ABUNDANCE_NOTES_UPDATED_EVENT,
        syncFromStorage
      );
    };
  }, []);

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formChapterId, setFormChapterId] = useState<string>('ch-1');
  const [formQuote, setFormQuote] = useState<string>('');
  const [formReflection, setFormReflection] = useState<string>('');
  const [formCategory, setFormCategory] =
    useState<UserBookNote['category']>('worth');
  const [formTags, setFormTags] = useState<string>('');

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  // Feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedWishId, setAddedWishId] = useState<string | null>(null);

  const handleOpenAddNote = (
    prefillChapterId?: string,
    prefillQuote?: string,
    prefillCategory?: UserBookNote['category']
  ) => {
    const targetChapterId = prefillChapterId || 'ch-1';
    const mappedTheme = WISDOM_THEME_LABELS[targetChapterId];
    setEditingNoteId(null);
    setFormChapterId(targetChapterId);
    setFormQuote(prefillQuote || '');
    setFormReflection('');
    setFormCategory(
      prefillCategory || mappedTheme?.defaultCategory || 'worth'
    );
    setFormTags('');
    setIsEditorOpen(true);
  };

  useEffect(() => {
    if (!externalDraft) return;
    handleOpenAddNote(
      externalDraft.chapterId,
      externalDraft.quote,
      externalDraft.category
    );
  }, [externalDraft]);

  const handleOpenEditNote = (note: UserBookNote) => {
    setEditingNoteId(note.id);
    setFormChapterId(note.chapterId || 'ch-1');
    setFormQuote(note.quoteOrTitle);
    setFormReflection(note.reflection);
    setFormCategory(note.category);
    setFormTags(note.tags.join(', '));
    setIsEditorOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuote.trim() && !formReflection.trim()) return;

    const themeMeta = WISDOM_THEME_LABELS[formChapterId];
    const themeTitleStr = themeMeta
      ? isEn
        ? themeMeta.titleEn
        : themeMeta.titleZh
      : undefined;

    const tagsArr = formTags
      .split(/[,，#\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingNoteId) {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id === editingNoteId) {
            return {
              ...n,
              chapterId: formChapterId,
              chapterTitle: themeTitleStr ?? n.chapterTitle,
              quoteOrTitle: formQuote.trim(),
              reflection: formReflection.trim(),
              category: formCategory,
              tags:
                tagsArr.length > 0
                  ? tagsArr
                  : [isEn ? 'Reflection' : '思考笔记'],
              updatedAt: new Date().toISOString(),
            };
          }
          return n;
        })
      );
    } else {
      const newNote: UserBookNote = {
        id: `note-${Date.now()}`,
        chapterId: formChapterId,
        chapterTitle: themeTitleStr,
        quoteOrTitle:
          formQuote.trim() ||
          (isEn ? 'Personal Reflection' : '阅读时刻的体会'),
        reflection: formReflection.trim(),
        category: formCategory,
        tags:
          tagsArr.length > 0 ? tagsArr : [isEn ? 'Reflection' : '思考笔记'],
        isFavorite: false,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
    }

    setIsEditorOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    if (
      window.confirm(
        isEn ? 'Delete this reading note?' : '确定要删除这条阅读笔记吗？'
      )
    ) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleToggleFavorite = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n))
    );
  };

  const handleCopyNote = (note: UserBookNote) => {
    const themeLabel = getCleanThemeDisplay(note, isEn);
    const lines = [
      `「${note.quoteOrTitle}」`,
      themeLabel ? `主题：${themeLabel}` : '',
      note.reflection ? `感悟：${note.reflection}` : '',
      note.tags.length > 0
        ? `标签：${note.tags.map((t) => `#${t}`).join(' ')}`
        : '',
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyNoteToWish = (note: UserBookNote) => {
    if (!onAddCustomWish) return;
    const catMap: Record<
      string,
      'wealth' | 'love' | 'beauty' | 'career' | 'lifestyle'
    > = {
      wealth: 'wealth',
      worth: 'lifestyle',
      surrender: 'lifestyle',
      gratitude: 'love',
      now: 'lifestyle',
      general: 'lifestyle',
    };
    const targetCat = catMap[note.category] || 'lifestyle';
    const title =
      note.quoteOrTitle.length > 25
        ? `${note.quoteOrTitle.slice(0, 25)}...`
        : note.quoteOrTitle;
    const details = note.reflection
      ? `${note.quoteOrTitle}\n${note.reflection}`
      : note.quoteOrTitle;

    onAddCustomWish(title, details, targetCat);
    setAddedWishId(note.id);
    setTimeout(() => setAddedWishId(null), 2500);
  };

  const handleExportAllNotes = () => {
    const content =
      `# ${isEn ? 'Personal Wisdom Notes' : '个人阅读笔记与思考摘录'}\n\n${
        isEn ? 'Exported' : '导出时间'
      }：${new Date().toLocaleString()}\n${
        isEn ? 'Total' : '总条数'
      }：${notes.length}\n\n---\n\n` +
      notes
        .map((n, i) => {
          const themeLabel = getCleanThemeDisplay(n, isEn) || '随笔';
          return `## ${i + 1}. ${n.quoteOrTitle}\n\n- **主题**：${themeLabel}\n- **记录时间**：${new Date(
            n.createdAt
          ).toLocaleDateString()}${
            n.tags.length > 0
              ? `\n- **标签**：${n.tags.map((t) => `#${t}`).join(' ')}`
              : ''
          }\n\n${n.reflection ? `> ${n.reflection.replace(/\n/g, '\n> ')}\n` : ''}\n---`;
        })
        .join('\n\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wisdom_notes_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter((note) => {
    if (onlyFavorites && !note.isFavorite) return false;
    if (filterCategory !== 'all' && note.category !== filterCategory)
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQuote = note.quoteOrTitle.toLowerCase().includes(q);
      const matchReflection = note.reflection.toLowerCase().includes(q);
      const matchTags = note.tags.some((t) => t.toLowerCase().includes(q));
      const matchTheme = getCleanThemeDisplay(note, isEn)
        ?.toLowerCase()
        .includes(q);
      return matchQuote || matchReflection || matchTags || matchTheme;
    }
    return true;
  });

  return (
    <section
      className="space-y-6 text-left"
      id="wisdom-reading-notes"
      aria-labelledby="wisdom-notes-heading"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--amnd-border)]">
        <div className="space-y-1.5">
          <h2
            id="wisdom-notes-heading"
            className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)] tracking-tight"
          >
            {isEn ? 'Personal Notes & Reflections' : '阅读笔记与思考摘录'}
          </h2>
          <p className="text-sm text-[var(--amnd-text-secondary)]">
            {isEn
              ? 'Save passages that resonate with your own reflections. Everything stays synced with My Space.'
              : '随时记下触发你的句子和想法，所有记录会自动同步到「我的空间」。'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAddNote()}
          className="px-4 py-2.5 amnd-btn-primary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap min-h-[40px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isEn ? 'Write a Note' : '记录一条笔记'}</span>
        </button>
      </div>

      {/* Filter & Utility Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--amnd-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? 'Search saved notes, quotes, or tags...'
                : '搜索笔记内容、摘录或标签...'
            }
            className="w-full pl-10 pr-3 py-2 amnd-input text-xs min-h-[40px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label={isEn ? 'Filter by topic' : '按主题筛选'}
            className="px-3 py-2 amnd-input text-xs text-[var(--amnd-text-primary)] min-h-[40px]"
          >
            <option value="all">{isEn ? 'All Topics' : '全部主题'}</option>
            <option value="worth">{isEn ? 'Self-Worth' : '内在价值'}</option>
            <option value="wealth">{isEn ? 'Flow & Resources' : '财富与顺流'}</option>
            <option value="surrender">{isEn ? 'Letting Go' : '松手与接纳'}</option>
            <option value="gratitude">{isEn ? 'Gratitude' : '感谢'}</option>
            <option value="now">{isEn ? 'Presence' : '回到当下'}</option>
            <option value="general">{isEn ? 'General' : '随笔'}</option>
          </select>

          <button
            type="button"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer min-h-[40px] border ${
              onlyFavorites
                ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)] border-transparent'
                : 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-secondary)] border-[var(--amnd-border-strong)] hover:border-[var(--amnd-wood)]'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                onlyFavorites ? 'fill-current' : 'text-[var(--amnd-gold)]'
              }`}
            />
            <span>{isEn ? 'Starred' : '只看收藏'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAllNotes}
            className="px-3 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            title={
              isEn ? 'Export notes as Markdown' : '导出所有笔记为 Markdown'
            }
          >
            <Download className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
            <span>{isEn ? 'Export' : '导出'}</span>
          </button>
        </div>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="p-10 text-center amnd-surface-stone space-y-3">
          <Feather className="w-5 h-5 text-[var(--amnd-wood)] mx-auto" />
          <h3 className="font-serif text-base font-medium text-[var(--amnd-text-primary)]">
            {isEn ? 'No matching notes yet' : '暂时没有符合条件的笔记'}
          </h3>
          <p className="text-xs text-[var(--amnd-text-secondary)] max-w-sm mx-auto leading-relaxed">
            {isEn
              ? 'Save a thought while reading above, or create a new note here.'
              : '可以在上方阅读时顺手记下一句话，或直接写下此刻的想法。'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddNote()}
            className="inline-flex items-center gap-1.5 px-4 py-2 amnd-btn-primary text-xs font-medium cursor-pointer min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? 'Write First Note' : '写下第一条笔记'}</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[var(--amnd-border)] border-t border-b border-[var(--amnd-border)]">
          {filteredNotes.map((note) => {
            const cleanTheme = getCleanThemeDisplay(note, isEn);
            return (
              <article
                key={note.id}
                className="py-6 space-y-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
                    {cleanTheme && (
                      <>
                        <span className="text-[var(--amnd-wood)] font-medium">
                          {cleanTheme}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="tabular-nums">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    {note.tags && note.tags.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{note.tags.map((t) => `#${t}`).join(' ')}</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(note.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--amnd-bg-secondary)] transition-colors cursor-pointer shrink-0"
                    aria-label={
                      note.isFavorite
                        ? isEn
                          ? 'Unstar note'
                          : '取消收藏'
                        : isEn
                          ? 'Star note'
                          : '收藏笔记'
                    }
                  >
                    <Star
                      className={`w-4 h-4 ${
                        note.isFavorite
                          ? 'fill-[var(--amnd-gold)] text-[var(--amnd-gold)]'
                          : 'text-[var(--amnd-text-muted)]'
                      }`}
                    />
                  </button>
                </div>

                <h3 className="font-serif text-base md:text-lg font-medium text-[var(--amnd-text-primary)] leading-snug">
                  “{note.quoteOrTitle}”
                </h3>

                {note.reflection && (
                  <p className="text-sm text-[var(--amnd-text-secondary)] leading-relaxed whitespace-pre-line">
                    {note.reflection}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    {onSpeak && (
                      <button
                        type="button"
                        onClick={() =>
                          onSpeak(
                            `${note.quoteOrTitle}。${note.reflection || ''}`
                          )
                        }
                        className="inline-flex items-center gap-1 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Listen' : '朗读'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyNote(note)}
                      className="inline-flex items-center gap-1 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
                    >
                      {copiedId === note.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[var(--amnd-success)]" />
                          <span className="text-[var(--amnd-success)]">
                            {isEn ? 'Copied' : '已复制'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Copy' : '复制'}</span>
                        </>
                      )}
                    </button>

                    {onAddCustomWish && (
                      <button
                        type="button"
                        onClick={() => handleApplyNoteToWish(note)}
                        className="inline-flex items-center gap-1 text-[var(--amnd-wood)] hover:underline transition-colors cursor-pointer font-medium"
                      >
                        {addedWishId === note.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[var(--amnd-success)]" />
                            <span className="text-[var(--amnd-success)]">
                              {isEn ? 'Saved to Wishes' : '已存入心愿'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                            <span>{isEn ? 'Save as Wish' : '转为心愿'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenEditNote(note)}
                      className="inline-flex items-center gap-1 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Edit' : '编辑'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="inline-flex items-center gap-1 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-danger)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Delete' : '删除'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Note Creator / Editor Modal */}
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#262320]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-editor-title"
        >
          <div className="amnd-surface p-6 md:p-7 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--amnd-border)]">
              <div className="flex items-center gap-2">
                <Feather className="w-4 h-4 text-[var(--amnd-wood)]" />
                <h3
                  id="note-editor-title"
                  className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)]"
                >
                  {editingNoteId
                    ? isEn
                      ? 'Edit Note'
                      : '编辑阅读笔记'
                    : isEn
                      ? 'Write a Note'
                      : '记录阅读感悟'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-lg text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-bg-secondary)] transition-colors cursor-pointer"
                aria-label={isEn ? 'Close' : '关闭'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-[var(--amnd-text-secondary)] mb-1.5">
                  {isEn ? 'Related Theme' : '关联阅读主题'}
                </label>
                <select
                  value={formChapterId}
                  onChange={(e) => setFormChapterId(e.target.value)}
                  className="w-full px-3 py-2.5 amnd-input text-xs text-[var(--amnd-text-primary)]"
                >
                  {ABUNDANCE_CHAPTERS_DATA.map((ch) => {
                    const theme = WISDOM_THEME_LABELS[ch.id];
                    return (
                      <option key={ch.id} value={ch.id}>
                        {theme
                          ? isEn
                            ? theme.titleEn
                            : theme.titleZh
                          : isEn
                            ? ch.titleEn
                            : ch.titleZh}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--amnd-text-secondary)] mb-1.5">
                  {isEn
                    ? 'Passage or Summary Title *'
                    : '触动你的句子或笔记标题 *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={formQuote}
                  onChange={(e) => setFormQuote(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Write a sentence or headline you want to keep...'
                      : '记下一句打动你的话，或概括此刻想记录的主题...'
                  }
                  className="w-full p-3 amnd-input text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--amnd-text-secondary)] mb-1.5">
                  {isEn ? 'Your Reflection' : '我的体会与理解'}
                </label>
                <textarea
                  rows={4}
                  value={formReflection}
                  onChange={(e) => setFormReflection(e.target.value)}
                  placeholder={
                    isEn
                      ? 'How does this relate to what you are noticing in daily life?'
                      : '写下你的思考、生活中的真实体会，或打算怎么回应它...'
                  }
                  className="w-full p-3 amnd-input text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--amnd-text-secondary)] mb-1.5">
                    {isEn ? 'Category' : '分类'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as UserBookNote['category'])
                    }
                    className="w-full px-3 py-2.5 amnd-input text-xs text-[var(--amnd-text-primary)]"
                  >
                    <option value="worth">
                      {isEn ? 'Self-Worth' : '内在价值'}
                    </option>
                    <option value="wealth">
                      {isEn ? 'Flow & Resources' : '财富与顺流'}
                    </option>
                    <option value="surrender">
                      {isEn ? 'Letting Go' : '松手与接纳'}
                    </option>
                    <option value="gratitude">
                      {isEn ? 'Gratitude' : '感谢'}
                    </option>
                    <option value="now">
                      {isEn ? 'Presence' : '回到当下'}
                    </option>
                    <option value="general">
                      {isEn ? 'General' : '随笔'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--amnd-text-secondary)] mb-1.5">
                    {isEn ? 'Tags' : '标签（空格或逗号隔开）'}
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder={
                      isEn ? 'e.g. clarity, letting-go' : '例如：接纳 顺流 安住'
                    }
                    className="w-full px-3 py-2.5 amnd-input text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--amnd-border)]">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 amnd-btn-secondary text-xs font-medium cursor-pointer min-h-[40px]"
                >
                  {isEn ? 'Cancel' : '取消'}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 amnd-btn-primary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Save Note' : '保存笔记'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
