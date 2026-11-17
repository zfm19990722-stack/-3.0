import { useState, useEffect, FormEvent } from 'react';
import { ArrowRight, Feather, Heart, Moon, Plus, Trash2 } from 'lucide-react';
import EditorialImage from '../EditorialImage';
import Wishlist from '../Wishlist';
import AffirmationCard from '../AffirmationCard';
import { Wish } from '../../types';
import type { PrimaryViewId } from './HomePage';
import celestialImg from '../../assets/images/manifestation_celestial_horizon_1794884030293.jpg';

export const GRATITUDE_ENTRIES_STORAGE_KEY = 'amnd_gratitude_entries_v1';
export const LETGO_ENTRIES_STORAGE_KEY = 'amnd_letgo_entries_v1';
export const REFLECTION_ENTRIES_STORAGE_KEY = 'amnd_reflections_v1';

export interface SimpleJournalEntry {
  id: string;
  content: string;
  createdAt: string;
}

interface ManifestationPageProps {
  language: 'zh' | 'en';
  wishes: Wish[];
  onAddWish: (wish: Omit<Wish, 'id' | 'createdAt' | 'isManifested'>) => void;
  onDeleteWish: (id: string) => void;
  onGenerateDetails: (id: string, mode?: 'overwrite' | 'append', refinePrompt?: string) => Promise<void>;
  onStartSession: (wish: Wish) => void;
  isGeneratingMap: Record<string, boolean>;
  onUpdateWish: (id: string, updatedFields: Partial<Wish>) => void;
  onSpeak: (text: string) => Promise<void>;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  onNavigate: (view: PrimaryViewId) => void;
}

function loadEntries(key: string): SimpleJournalEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`Failed to load entries for ${key}:`, e);
  }
  return [];
}

export default function ManifestationPage({
  language,
  wishes,
  onAddWish,
  onDeleteWish,
  onGenerateDetails,
  onStartSession,
  isGeneratingMap,
  onUpdateWish,
  onSpeak,
  isSpeaking,
  onStopSpeaking,
  onNavigate,
}: ManifestationPageProps) {
  const isEn = language === 'en';

  // V1 Independent Gratitude, Let Go & Reflection entries (never alter existing wish/notes storage keys)
  const [gratitudeList, setGratitudeList] = useState<SimpleJournalEntry[]>(() =>
    loadEntries(GRATITUDE_ENTRIES_STORAGE_KEY)
  );
  const [gratitudeInput, setGratitudeInput] = useState('');

  const [letGoList, setLetGoList] = useState<SimpleJournalEntry[]>(() =>
    loadEntries(LETGO_ENTRIES_STORAGE_KEY)
  );
  const [letGoInput, setLetGoInput] = useState('');

  const [reflectionList, setReflectionList] = useState<SimpleJournalEntry[]>(() =>
    loadEntries(REFLECTION_ENTRIES_STORAGE_KEY)
  );
  const [reflectionInput, setReflectionInput] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(GRATITUDE_ENTRIES_STORAGE_KEY, JSON.stringify(gratitudeList));
    } catch (e) {
      console.warn('Failed to persist gratitude entries:', e);
    }
  }, [gratitudeList]);

  useEffect(() => {
    try {
      localStorage.setItem(LETGO_ENTRIES_STORAGE_KEY, JSON.stringify(letGoList));
    } catch (e) {
      console.warn('Failed to persist let go entries:', e);
    }
  }, [letGoList]);

  useEffect(() => {
    try {
      localStorage.setItem(REFLECTION_ENTRIES_STORAGE_KEY, JSON.stringify(reflectionList));
    } catch (e) {
      console.warn('Failed to persist reflection entries:', e);
    }
  }, [reflectionList]);

  const handleAddGratitude = (e: FormEvent) => {
    e.preventDefault();
    if (!gratitudeInput.trim()) return;
    setGratitudeList((prev) => [
      { id: `grat-${Date.now()}`, content: gratitudeInput.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setGratitudeInput('');
  };

  const handleAddLetGo = (e: FormEvent) => {
    e.preventDefault();
    if (!letGoInput.trim()) return;
    setLetGoList((prev) => [
      { id: `letgo-${Date.now()}`, content: letGoInput.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setLetGoInput('');
  };

  const handleAddReflection = (e: FormEvent) => {
    e.preventDefault();
    if (!reflectionInput.trim()) return;
    setReflectionList((prev) => [
      { id: `refl-${Date.now()}`, content: reflectionInput.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setReflectionInput('');
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-fadeIn" id="manifestation-page">
      {/* Modern Celestial x Soft Minimalism Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--amnd-border)] bg-[var(--amnd-text-primary)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-6 md:p-8 flex flex-col justify-between text-left text-[var(--amnd-bg-elevated)] space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--amnd-bg-subtle)]/80">
                <Moon className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                <span>{isEn ? 'Manifestation · Modern Celestial' : '显化 · 意图、感恩与现实行动'}</span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-balance">
                Manifestation · {isEn ? 'Intention & Action' : '显化'}
              </h2>
              <p className="text-sm text-[var(--amnd-bg-secondary)]/90 leading-relaxed max-w-lg">
                {isEn
                  ? 'Clarify your intentions, cultivate genuine gratitude, observe what you are ready to let go of, and turn inner clarity into calm everyday action.'
                  : '将清晰的认知转化为愿望记录、感官想像、日常感恩与脚踏实地的行动反思。我们不承诺超自然必成，而是陪伴你梳理方向与内在状态。'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('stillness')}
                className="px-4 py-2.5 rounded-xl bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-bg-secondary)] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                <span>{isEn ? 'Pair with Sound & Stillness' : '前往静心配合声景'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('myspace')}
                className="px-4 py-2.5 rounded-xl border border-[var(--amnd-bg-elevated)]/25 text-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-elevated)]/10 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                {isEn ? 'View Personal Archive' : '前往我的空间'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 min-h-[200px]">
            <EditorialImage
              src={celestialImg}
              alt={isEn ? 'Crescent moon above quiet twilight horizon over calm water' : '微茫暮色海平面与一弯新月的平静天际线'}
              aspectClassName="aspect-[16/9] lg:aspect-auto lg:h-full rounded-none border-0"
              fallbackTitle={isEn ? 'Manifestation · Clear Horizon' : 'Manifestation · 澄澈显化'}
              fallbackSubtitle={isEn ? 'Clarity, gratitude, release, and grounded steps.' : '清醒的意图、温和的感恩与持续行动。'}
            />
          </div>
        </div>
      </section>

      {/* Main Workspace Grid: Wishes + Affirmation / Gratitude / Let Go / Reflection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column A (My Wishes & Create a Wish) */}
        <div className="lg:col-span-7 space-y-6">
          <Wishlist
            language={language}
            wishes={wishes}
            onAddWish={onAddWish}
            onDeleteWish={onDeleteWish}
            onGenerateDetails={onGenerateDetails}
            onStartSession={onStartSession}
            isGeneratingMap={isGeneratingMap}
            onUpdateWish={onUpdateWish}
          />
        </div>

        {/* Column B (Daily Affirmation + V1 Gratitude, Let Go & Process Reflection) */}
        <div className="lg:col-span-5 space-y-6">
          {/* C/E: Daily Affirmation */}
          <AffirmationCard
            language={language}
            onSpeak={onSpeak}
            isSpeaking={isSpeaking}
            onStopSpeaking={onStopSpeaking}
          />

          {/* C: Gratitude Quick Journal (V1 Basic Local Capture) */}
          <section className="amnd-surface p-6 space-y-4 text-left" id="manifestation-gratitude-card">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--amnd-border)] pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--amnd-text-muted)]">
                  <Heart className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                  <span>{isEn ? 'Gratitude · V1 Log' : '感恩记录 · V1 基础记录'}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)] mt-0.5">
                  {isEn ? 'Today’s Gratitude' : '今日感恩时刻'}
                </h3>
              </div>
              <span className="text-[11px] text-[var(--amnd-text-muted)] tabular-nums">
                {gratitudeList.length}
              </span>
            </div>

            <form onSubmit={handleAddGratitude} className="flex gap-2">
              <input
                type="text"
                value={gratitudeInput}
                onChange={(e) => setGratitudeInput(e.target.value)}
                placeholder={isEn ? 'One thing you are grateful for today...' : '记下一件今天心怀感恩的小事...'}
                className="flex-1 text-xs px-3 py-2.5 amnd-input"
                id="gratitude-entry-input"
              />
              <button
                type="submit"
                id="gratitude-entry-submit"
                className="px-3.5 py-2.5 amnd-btn-primary text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'Save' : '记录'}</span>
              </button>
            </form>

            {gratitudeList.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {gratitudeList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[var(--amnd-bg-primary)] border border-[var(--amnd-border)] flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--amnd-text-primary)] leading-relaxed break-words">
                        {item.content}
                      </p>
                      <span className="text-[10px] text-[var(--amnd-text-muted)] tabular-nums">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGratitudeList((prev) => prev.filter((g) => g.id !== item.id))}
                      className="p-1 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-danger)] cursor-pointer shrink-0"
                      aria-label={isEn ? 'Delete gratitude' : '删除感恩记录'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--amnd-text-muted)]">
                {isEn
                  ? 'No gratitude notes yet. Full gratitude diary analytics are planned for V3.'
                  : '尚无感恩记录。完整感恩日记将在后续 V3 进一步扩展。'}
              </p>
            )}
          </section>

          {/* D: Let Go & Awareness */}
          <section className="amnd-surface-stone p-6 space-y-4 text-left" id="manifestation-letgo-card">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--amnd-border)] pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--amnd-text-muted)]">
                  <Feather className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                  <span>{isEn ? 'Let Go · Inner Observation' : '放下与觉察 · V1 基础记录'}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)] mt-0.5">
                  {isEn ? 'Set Down & Observe' : '放下担忧与自我观察'}
                </h3>
              </div>
              <span className="text-[11px] text-[var(--amnd-text-muted)] tabular-nums">
                {letGoList.length}
              </span>
            </div>

            <form onSubmit={handleAddLetGo} className="space-y-2">
              <textarea
                rows={2}
                value={letGoInput}
                onChange={(e) => setLetGoInput(e.target.value)}
                placeholder={
                  isEn
                    ? 'Write a current worry, something to let go, or an honest observation...'
                    : '写下当下的困扰、想放下的事情，或对自己的温和观察...'
                }
                className="w-full text-xs p-3 amnd-input resize-none"
                id="letgo-entry-input"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  id="letgo-entry-submit"
                  className="px-4 py-2 amnd-btn-secondary text-xs font-medium cursor-pointer"
                >
                  {isEn ? 'Record & Release' : '写下并安放'}
                </button>
              </div>
            </form>

            {letGoList.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {letGoList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] flex items-start justify-between gap-2"
                  >
                    <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed break-words">
                      {item.content}
                    </p>
                    <button
                      type="button"
                      onClick={() => setLetGoList((prev) => prev.filter((x) => x.id !== item.id))}
                      className="p-1 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-danger)] cursor-pointer shrink-0"
                      aria-label={isEn ? 'Delete entry' : '删除记录'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* F: Process & Action Reflection */}
          <section className="amnd-surface p-6 space-y-4 text-left" id="manifestation-reflection-card">
            <div className="space-y-1 border-b border-[var(--amnd-border)] pb-3">
              <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'Process & Action Reflection' : '显化反思 · 关注过程与行动'}
              </h3>
              <p className="text-xs text-[var(--amnd-text-muted)] leading-relaxed">
                {isEn
                  ? 'Intention grows through awareness and consistent steps—notice what small action or mindset shift helps today.'
                  : '不只关注结果，也观察自己当下的小步行动与状态变化。记录将同步显示在「我的空间」。'}
              </p>
            </div>

            <form onSubmit={handleAddReflection} className="space-y-2">
              <textarea
                rows={2}
                value={reflectionInput}
                onChange={(e) => setReflectionInput(e.target.value)}
                placeholder={
                  isEn
                    ? 'What small action or insight moved you forward today?'
                    : '今天为了这份愿望，我注意到了什么变化，或做了一件什么微小而真诚的行动？'
                }
                className="w-full text-xs p-3 amnd-input resize-none"
                id="manifestation-reflection-input"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('myspace')}
                  className="text-xs font-medium text-[var(--amnd-wood)] hover:underline cursor-pointer"
                >
                  {isEn ? `View All in My Space (${reflectionList.length})` : `在我的空间查看（${reflectionList.length}）`}
                </button>
                <button
                  type="submit"
                  id="manifestation-reflection-submit"
                  className="px-4 py-2 amnd-btn-primary text-xs font-medium cursor-pointer"
                >
                  {isEn ? 'Save Reflection' : '记录反思'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
