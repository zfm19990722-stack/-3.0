import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Heart, Trash2 } from 'lucide-react';

export const TEMPLE_PRAYERS_STORAGE_KEY = 'amnd_temple_prayers_v1';

export interface TempleIntention {
  id: string;
  type: 'wish' | 'gratitude' | 'release';
  content: string;
  createdAt: string;
}

interface TemplePrayerSanctuaryProps {
  language: 'zh' | 'en';
  onOpenManifestation?: () => void;
}

export default function TemplePrayerSanctuary({
  language,
  onOpenManifestation,
}: TemplePrayerSanctuaryProps) {
  const isEn = language === 'en';
  const [intentionType, setIntentionType] = useState<'wish' | 'gratitude' | 'release'>('wish');
  const [intentionText, setIntentionText] = useState('');
  const [entries, setEntries] = useState<TempleIntention[]>(() => {
    try {
      const raw = localStorage.getItem(TEMPLE_PRAYERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load temple contemplation entries:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLE_PRAYERS_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to persist temple contemplation entries:', e);
    }
  }, [entries]);

  const handleSaveEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!intentionText.trim()) return;
    const item: TempleIntention = {
      id: `temple-note-${Date.now()}`,
      type: intentionType,
      content: intentionText.trim(),
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [item, ...prev]);
    setIntentionText('');
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const typeLabels: Record<TempleIntention['type'], string> = {
    wish: isEn ? 'Intention / Prayer' : '祈愿 · Intention',
    gratitude: isEn ? 'Gratitude' : '感恩 · Gratitude',
    release: isEn ? 'Let Go' : '放下 · Let Go',
  };

  return (
    <section
      className="amnd-surface p-6 space-y-5 text-left"
      id="temple-prayer-sanctuary"
    >
      <div className="space-y-1.5 border-b border-[var(--amnd-border)] pb-3">
        <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
          <Heart className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
          <span>{isEn ? 'Prayer, Gratitude & Release' : '祈愿、感恩与放下'}</span>
        </div>
        <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
          {isEn ? 'Quiet Intention Notes' : '在安静中安放一句愿望、感恩或放下'}
        </h3>
        <p className="text-xs text-[var(--amnd-text-secondary)]">
          {isEn
            ? 'Saved privately on your device as an honest reflection.'
            : '所有记录仅作为自我觉察私密保存在本地设备中。'}
        </p>
      </div>

      <form onSubmit={handleSaveEntry} className="space-y-3">
        <div className="flex flex-wrap gap-1.5 bg-[var(--amnd-bg-secondary)] p-1 rounded-xl border border-[var(--amnd-border)]">
          {(['wish', 'gratitude', 'release'] as const).map((typeKey) => (
            <button
              key={typeKey}
              type="button"
              onClick={() => setIntentionType(typeKey)}
              className={`flex-1 min-w-[96px] py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                intentionType === typeKey
                  ? 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] border border-[var(--amnd-border)] font-semibold'
                  : 'text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)]'
              }`}
            >
              {typeLabels[typeKey]}
            </button>
          ))}
        </div>

        <textarea
          value={intentionText}
          onChange={(e) => setIntentionText(e.target.value)}
          rows={3}
          placeholder={
            intentionType === 'wish'
              ? isEn
                ? 'Write a sincere intention or wish for clarity and kindness...'
                : '写下一句清净真诚的心愿或对生活方向的期许...'
              : intentionType === 'gratitude'
                ? isEn
                  ? 'Note someone or a quiet moment you feel grateful for today...'
                  : '记录一件今天心中由衷感恩的人、事或安宁片刻...'
                : isEn
                  ? 'Name a worry or tension you wish to gently set down...'
                  : '写下此刻愿意轻轻放下的担忧、执念或内在紧绷...'
          }
          className="w-full text-xs sm:text-sm p-3.5 amnd-input resize-none"
          id="temple-contemplation-input"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {onOpenManifestation ? (
            <button
              type="button"
              onClick={onOpenManifestation}
              className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isEn ? 'Open Full Wishboard in Manifestation' : '前往显化空间管理完整心愿'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            id="temple-save-intention-btn"
            className="px-5 py-2.5 amnd-btn-primary text-xs font-medium cursor-pointer whitespace-nowrap min-h-[40px]"
          >
            {isEn ? 'Place Quietly' : '安放此念'}
          </button>
        </div>
      </form>

      {entries.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-[var(--amnd-border)]">
          <p className="text-xs text-[var(--amnd-text-muted)]">
            {isEn ? `Local Contemplation Notes (${entries.length})` : `已安放的静观记录（${entries.length} 条）`}
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-xl bg-[var(--amnd-bg-primary)] border border-[var(--amnd-border)] flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--amnd-text-muted)]">
                    <span className="font-medium text-[var(--amnd-wood)]">{typeLabels[entry.type]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--amnd-text-primary)] leading-relaxed break-words">
                    {entry.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-1.5 rounded-lg text-[var(--amnd-text-muted)] hover:text-[var(--amnd-danger)] hover:bg-[var(--amnd-danger-soft)] transition-colors cursor-pointer shrink-0"
                  aria-label={isEn ? 'Remove note' : '删除此条记录'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
