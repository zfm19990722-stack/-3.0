import { useState, useEffect, FormEvent, lazy, Suspense } from 'react';
import { ArrowRight, Box, Compass, Flame, Heart, Moon, Sparkles, Sun, Trash2, Wind } from 'lucide-react';
import EditorialImage from '../EditorialImage';
import type { PrimaryViewId } from './HomePage';
import templeHallImg from '../../assets/images/temple_modern_hall_1794884029399.jpg';
import templeSculptureImg from '../../assets/images/temple_sculpture_contemplation_1794884029521.jpg';
import {
  TempleLightingPreference,
  useTempleLightingMode,
} from '../temple/templeLightingTime';

const Temple3DExperience = lazy(() => import('../temple/Temple3DExperience'));

const TEMPLE_PRAYERS_STORAGE_KEY = 'amnd_temple_prayers_v1';

interface TempleIntention {
  id: string;
  type: 'wish' | 'gratitude' | 'release';
  content: string;
  createdAt: string;
}

interface TemplePageProps {
  language: 'zh' | 'en';
  onNavigate: (view: PrimaryViewId) => void;
  onEnterStillness: () => void;
}

export default function TemplePage({
  language,
  onNavigate,
  onEnterStillness,
}: TemplePageProps) {
  const isEn = language === 'en';
  const [is3DHallOpen, setIs3DHallOpen] = useState(false);
  const {
    preference: lightingPreference,
    setPreference: setLightingPreference,
    resolvedMode: resolvedEnvironment,
    beijingTimeLabel,
  } = useTempleLightingMode();
  const isNightEnv = resolvedEnvironment === 'night';
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

  // Lock page scroll while full-viewport 3D Sanctuary is open
  useEffect(() => {
    if (!is3DHallOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [is3DHallOpen]);

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
    <div className="space-y-10 md:space-y-12 animate-fadeIn" id="temple-page">
      {/* A. Temple Home Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch amnd-surface p-5 md:p-8">
        <div className="lg:col-span-5 flex flex-col justify-between text-left space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
              <Compass className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
              <span>{isEn ? 'AMND Manifestation · Spiritual Sanctuary' : 'AMND Manifestation · 精神栖息空间'}</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[var(--amnd-text-primary)] tracking-tight">
              {isEn ? 'Yixiu Little Temple' : '一休小庙'}
            </h2>
            <p className="text-sm text-[var(--amnd-text-primary)] font-medium">
              {isEn
                ? 'Welcome to Yixiu Little Temple · A little place to pause and return to yourself.'
                : '欢迎来到一休小庙 · 累了，就回来歇一歇。'}
            </p>
            <p className="text-xs md:text-[13px] text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'Designed with modern architectural calm—natural light, limestone stillness, and respectful contemplation of Buddhist spiritual heritage without commercial vows or ornamental excess.'
                : '以当代极简建筑美学承载佛教文化与精神传统：透过自然光影、静观陈设与内在省思，提供一处安静、克制且值得反复回访的当代精神空间。'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIs3DHallOpen(true)}
              id="temple-enter-3d-hall-btn"
              className="px-5 py-3 amnd-btn-primary text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <Box className="w-4 h-4" />
              <span>{isEn ? 'Enter Yixiu Little Temple (3D)' : '进入一休小庙 3D 大殿'}</span>
            </button>
            <button
              type="button"
              onClick={onEnterStillness}
              id="temple-enter-stillness-btn"
              className="px-5 py-3 amnd-btn-secondary text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <Wind className="w-4 h-4 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'Enter Quiet Sitting' : '进入静坐冥想'}</span>
            </button>
            <a
              href="#temple-prayer-sanctuary"
              className="px-4 py-3 text-xs sm:text-sm font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px]"
            >
              <span>{isEn ? 'Contemplation & Vows' : '安放祈愿与放下'}</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-7 flex">
          <div className="relative w-full flex rounded-2xl overflow-hidden">
            <EditorialImage
              src={templeHallImg}
              alt={isEn ? 'Yixiu Little Temple main sanctuary hall bathed in daylight' : '自然天光映照的一休小庙静观殿堂'}
              aspectClassName="aspect-[16/9] lg:aspect-auto lg:h-full min-h-[240px]"
              className={`transition-all duration-700 ${isNightEnv ? 'brightness-[0.65] contrast-[1.06]' : 'brightness-100'}`}
              fallbackTitle={isEn ? 'Yixiu Little Temple' : '一休小庙'}
              fallbackSubtitle={isEn ? 'A little place to pause and return to yourself.' : '累了，就回来歇一歇。'}
            />
            <div
              aria-hidden="true"
              className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${isNightEnv ? 'opacity-100' : 'opacity-0'}`}
              style={{
                background:
                  'radial-gradient(circle at 50% 52%, rgba(242, 186, 98, 0.20) 0%, rgba(28, 22, 17, 0.36) 56%, rgba(18, 15, 12, 0.62) 100%)',
              }}
            />
          </div>
        </div>
      </section>

      {/* B. Buddha Hall & Statue Contemplation Exhibition Area */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch" id="temple-hall-section">
        <div className="lg:col-span-5 flex">
          <div className="relative w-full flex rounded-2xl overflow-hidden">
            <EditorialImage
              src={templeSculptureImg}
              alt={isEn ? 'Minimalist meditative stone sculpture in natural gallery light' : '自然天光下安静庄重的冥想石雕艺术展陈'}
              aspectClassName="aspect-[3/4] max-h-[480px] lg:max-h-none"
              className={`transition-all duration-700 ${isNightEnv ? 'brightness-[0.70] contrast-[1.05]' : 'brightness-100'}`}
              fallbackTitle={isEn ? 'Main Hall · Contemplation Space' : '佛殿主室 · 静观展陈区域'}
              fallbackSubtitle={isEn ? 'Quiet sculptural presence in diffused daylight' : '自然柔和天光下的静态沉思展陈'}
            />
            <div
              aria-hidden="true"
              className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${isNightEnv ? 'opacity-100' : 'opacity-0'}`}
              style={{
                background:
                  'radial-gradient(circle at 50% 42%, rgba(240, 184, 96, 0.16) 0%, rgba(24, 20, 16, 0.42) 64%, rgba(16, 13, 10, 0.66) 100%)',
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-7 amnd-surface p-6 md:p-8 flex flex-col justify-between text-left space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[var(--amnd-text-muted)] border-b border-[var(--amnd-border)] pb-3">
              <span>{isEn ? '01 · Main Hall Architecture & Exhibition' : '01 · 佛殿结构与造像静观区'}</span>
              <span>{isEn ? 'V1 Cultural Foundation' : 'V1 基础展陈结构'}</span>
            </div>

            <h3 className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)]">
              {isEn ? 'Hall of Quiet Presence' : '静观佛殿 · 造像与文化展陈入口'}
            </h3>

            <p className="text-sm text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'In modern museum and sanctuary design, empty space and diffused natural light allow the observer to slow down and meet stillness directly. This V1 hall establishes the calm exhibition framework for future curated Buddhist iconography and verified cultural commentary.'
                : '借鉴现代美术馆与静观空间的展陈语言，以克制的石材比例与自然天光引导访客放缓节奏。本 V1 佛殿先建立起安静的主视觉与展陈框架，以庄重、尊重的方式预留佛像文化资料位置。'}
            </p>

            <div className="p-4 amnd-surface-stone space-y-2 text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              <p className="font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'Curatorial Note (Cultural Accuracy Commitment)' : '文化整理说明（敬重与克制原则）'}
              </p>
              <p>
                {isEn
                  ? 'Specific historical Buddha statue catalogs, lineages, and art-historical citations will be added in V2 once verified cultural source materials are finalized—we do not invent or embellish historical lore.'
                  : '在完整的佛像年代、造像仪轨与权威文化资料核校完成前，本页面保持克制留白，不自行编造历史典故或夸大功效；精确的多尊佛像图录与文化导览将在 V2 逐步收录。'}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {/* Day / Night Environment Selector (Beijing Time Auto + Manual Override) */}
            <div className="p-3.5 rounded-xl border border-[var(--amnd-border)] bg-[var(--amnd-bg-secondary)]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 text-left">
                <p className="text-xs font-semibold text-[var(--amnd-text-primary)] flex items-center gap-1.5">
                  {isNightEnv ? (
                    <Moon className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                  )}
                  <span>
                    {isNightEnv
                      ? isEn
                        ? 'Hall Atmosphere · Evening Lamps'
                        : '大殿光影 · 夜间供灯'
                      : isEn
                        ? 'Hall Atmosphere · Daylight'
                        : '大殿光影 · 日间自然光'}
                  </span>
                </p>
                <p className="text-[11px] text-[var(--amnd-text-muted)] tabular-nums">
                  {isEn
                    ? `Beijing Time ${beijingTimeLabel} · Auto (06:00 Day / 19:00 Night)`
                    : `北京时间 ${beijingTimeLabel} · 06:00 切换白天 / 19:00 切换夜晚`}
                </p>
              </div>

              <div
                className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] w-full sm:w-auto"
                role="group"
                aria-label={isEn ? 'Hall Lighting Mode' : '大殿昼夜光影切换'}
              >
                {(
                  [
                    { id: 'auto', label: 'Auto', icon: Compass },
                    { id: 'day', label: isEn ? 'Day' : '白天', icon: Sun },
                    { id: 'night', label: isEn ? 'Night' : '夜晚', icon: Moon },
                  ] as { id: TempleLightingPreference; label: string; icon: typeof Compass }[]
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = lightingPreference === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      id={`temple-page-lighting-${opt.id}`}
                      onClick={() => setLightingPreference(opt.id)}
                      aria-pressed={active}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                        active
                          ? 'bg-[var(--amnd-wood)] text-[#fffdf9]'
                          : 'text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-bg-secondary)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIs3DHallOpen(true)}
              id="temple-hall-open-3d-btn"
              className="w-full p-4 rounded-xl border border-[var(--amnd-wood)] bg-[var(--amnd-bg-primary)] hover:bg-[var(--amnd-bg-secondary)] text-left transition-colors cursor-pointer group flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-[var(--amnd-text-primary)] flex items-center gap-2">
                  <Box className="w-4 h-4 text-[var(--amnd-gold)]" />
                  <span>{isEn ? 'Explore Yixiu Little Temple in 3D' : '步入一休小庙 3D 立体空间'}</span>
                </p>
                <p className="text-xs text-[var(--amnd-text-secondary)]">
                  {isEn
                    ? 'Inspect the limestone hall, altar lamps, floral vessels, and smooth Beijing-time day & night lighting.'
                    : '在三维建筑空间中环顾大殿纵深、供台明灯与北京时间昼夜流转，支持移动端触摸与静态降级。'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--amnd-wood)] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('stillness')}
              className="p-4 rounded-xl border border-[var(--amnd-border)] bg-[var(--amnd-bg-primary)] hover:border-[var(--amnd-wood)] text-left transition-colors cursor-pointer group"
            >
              <p className="text-xs font-semibold text-[var(--amnd-text-primary)] flex items-center justify-between">
                <span>{isEn ? 'Practice in Stillness' : '前往静坐呼吸练习'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--amnd-wood)] transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="text-xs text-[var(--amnd-text-muted)] mt-1">
                {isEn ? 'Open 5 / 10 / 15 min guided sitting' : '进入 5 / 10 / 15 分钟呼吸与声景静坐'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('wisdom')}
              className="p-4 rounded-xl border border-[var(--amnd-border)] bg-[var(--amnd-bg-primary)] hover:border-[var(--amnd-wood)] text-left transition-colors cursor-pointer group"
            >
              <p className="text-xs font-semibold text-[var(--amnd-text-primary)] flex items-center justify-between">
                <span>{isEn ? 'Read Contemplative Texts' : '前往智慧阅读空间'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--amnd-wood)] transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="text-xs text-[var(--amnd-text-muted)] mt-1">
                {isEn ? 'Explore 《Abundance》 chapters & quotes' : '阅读《丰盛》要义与经典静心语录'}
              </p>
            </button>
            </div>
          </div>
        </div>
      </section>

      {/* C. Prayer / Intention / Gratitude / Let Go Structure + D. V2 Reverence & Lamp Preview */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="temple-prayer-sanctuary">
        <div className="lg:col-span-7 amnd-surface p-6 md:p-7 space-y-5 text-left">
          <div className="space-y-1.5 border-b border-[var(--amnd-border)] pb-3">
            <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
              <Heart className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
              <span>{isEn ? '02 · Contemplative Prayer & Release' : '02 · 祈愿、感恩与放下记录'}</span>
            </div>
            <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
              {isEn ? 'Quiet Intention Sanctuary' : '在安静中安放一句愿望、感恩或放下'}
            </h3>
            <p className="text-xs text-[var(--amnd-text-secondary)]">
              {isEn
                ? 'Saved privately on your device as an honest reflection—no paid blessings or supernatural claims.'
                : '所有内容仅作为自我觉察私密保存在本地设备，不涉及任何商业付费或功德绑定。'}
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
              <button
                type="button"
                onClick={() => onNavigate('manifestation')}
                className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isEn ? 'Open Full Wishboard in Manifestation' : '前往显化空间管理完整心愿'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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
        </div>

        {/* D. Future V2 Structure: Respectful Bowing & Lamp Contemplation */}
        <div className="lg:col-span-5 space-y-4 text-left">
          <div className="amnd-surface-stone p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-[var(--amnd-text-muted)]">
              <span>{isEn ? '03 · Future Cultural Rituals' : '03 · 礼佛与供灯体验结构'}</span>
              <span>{isEn ? 'Planned for V2' : 'V2 预留篇章'}</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--amnd-text-primary)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                  <span>{isEn ? 'Symbolic Reverence (Bowing Practice)' : '静观合十与礼敬仪轨'}</span>
                </div>
                <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
                  {isEn
                    ? 'A quiet gesture of humility and mindfulness reserved for V2—designed without scores, rankings, or gamified streaks.'
                    : '将在 V2 提供克制、安定的合十静观引导；不设积分榜或游戏化竞争。'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--amnd-text-primary)]">
                  <Flame className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                  <span>{isEn ? 'Symbolic Light Offering (Contemplation Lamp)' : '象征性供灯静观（非消费向）'}</span>
                </div>
                <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
                  {isEn
                    ? 'Planned as a gentle visual symbol of clarity and remembrance—never tied to payments, coins, or commercial transactions.'
                    : '作为清明与觉知的光影象征预留结构，绝不与付费祈福或金钱交易绑定。'}
                </p>
              </div>
            </div>
          </div>

          <div className="amnd-surface p-6 space-y-3">
            <h4 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)]">
              {isEn ? 'Ready for Quiet Sitting?' : '从空间走入呼吸'}
            </h4>
            <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'Pair your visit with a 5, 10, or 15 minute stillness practice featuring breath guidance and natural soundscapes.'
                : '即刻开启 5、10 或 15 分钟静坐体验，让思绪随自然呼吸慢慢沉淀。'}
            </p>
            <button
              type="button"
              onClick={onEnterStillness}
              className="w-full py-2.5 px-4 amnd-btn-secondary text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isEn ? 'Open Immersive Stillness' : '开启沉浸静坐'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
            </button>
          </div>
        </div>
      </section>

      {/* Lazy-Loaded 3D Temple Sanctuary Modal (Releases WebGL completely on exit) */}
      {is3DHallOpen && (
        <Suspense
          fallback={
            <div
              className={`fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 text-center px-6 ${
                isNightEnv
                  ? 'bg-[#26201a] text-[#f5efe6]'
                  : 'bg-[#ede6da] text-[#262320]'
              }`}
              role="status"
            >
              <Compass
                className="w-6 h-6 text-[var(--amnd-gold)] animate-spin"
                style={{ animationDuration: '6s' }}
              />
              <p className="font-serif text-base font-medium">
                {isEn ? 'Loading Yixiu Little Temple…' : '正在加载一休小庙 3D 空间…'}
              </p>
            </div>
          }
        >
          <Temple3DExperience
            language={language}
            onClose={() => setIs3DHallOpen(false)}
            lightingPreference={lightingPreference}
            onChangeLightingPreference={setLightingPreference}
            resolvedEnvironment={resolvedEnvironment}
            beijingTimeLabel={beijingTimeLabel}
          />
        </Suspense>
      )}
    </div>
  );
}
