import { useState, ReactNode } from 'react';
import { ArrowRight, Clock, Play, Sparkles, Wind } from 'lucide-react';
import EditorialImage from '../EditorialImage';
import { Wish } from '../../types';
import type { PrimaryViewId } from './HomePage';
import stillnessImg from '../../assets/images/stillness_minimal_space_1794884031297.jpg';

interface BreathingPatternSummary {
  id: string;
  name: string;
  code: string;
  desc: string;
}

interface StillnessPageProps {
  language: 'zh' | 'en';
  wishes: Wish[];
  defaultUniversalWish: Wish;
  timerDuration: number;
  onSelectDurationMinutes: (mins: number) => void;
  breathingPatterns: BreathingPatternSummary[];
  selectedPatternId: string;
  onSelectPatternId: (id: string) => void;
  onStartMeditation: (wish: Wish) => void;
  audioPlayerSlot: ReactNode;
  onNavigate: (view: PrimaryViewId) => void;
}

export default function StillnessPage({
  language,
  wishes,
  defaultUniversalWish,
  timerDuration,
  onSelectDurationMinutes,
  breathingPatterns,
  selectedPatternId,
  onSelectPatternId,
  onStartMeditation,
  audioPlayerSlot,
  onNavigate,
}: StillnessPageProps) {
  const isEn = language === 'en';
  const [selectedWishId, setSelectedWishId] = useState<string>(defaultUniversalWish.id);

  const chosenWish =
    selectedWishId === defaultUniversalWish.id
      ? defaultUniversalWish
      : wishes.find((w) => w.id === selectedWishId) || defaultUniversalWish;

  const activePattern =
    breathingPatterns.find((p) => p.id === selectedPatternId) || breathingPatterns[0];

  return (
    <div className="space-y-8 md:space-y-10 animate-fadeIn" id="stillness-page">
      {/* A. Minimal Wellness Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch amnd-surface p-5 md:p-8">
        <div className="lg:col-span-7 flex flex-col justify-between text-left space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
              <Wind className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'Stillness · Modern Minimal Wellness' : '静心 · 呼吸、静坐与声音空间'}</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[var(--amnd-text-primary)] tracking-tight">
              Stillness · {isEn ? 'Breathe & Reconnect' : '静心'}
            </h2>
            <p className="text-sm text-[var(--amnd-text-primary)] font-medium">
              Take a moment to pause, breathe and reconnect.
            </p>
            <p className="text-xs md:text-[13px] text-[var(--amnd-text-secondary)] leading-relaxed max-w-xl">
              {isEn
                ? 'Choose a calm sitting duration, pair it with SoHum or Box breathing rhythms, chakra alignment visualization, and gentle natural soundscapes without visual noise.'
                : '选择适合当下的静坐时长，搭配 SoHum 或方盒呼吸节律、脉轮居中视觉与自然声景，在低干扰的界面中安心静坐。'}
            </p>
          </div>

          {/* Duration Selector (5 / 10 / 15 min) + Start CTA */}
          <div className="space-y-4 pt-2 border-t border-[var(--amnd-border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--amnd-text-primary)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                  <span>{isEn ? 'Session Duration' : '静坐时长选择'}</span>
                </span>
                <p className="text-[11px] text-[var(--amnd-text-muted)]">
                  {isEn ? '20 & 30 minute durations planned for V3' : '20 分钟与 30 分钟长时静坐将在后续 V3 版本提供'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[var(--amnd-bg-secondary)] p-1 rounded-xl border border-[var(--amnd-border)]">
                {[5, 10, 15].map((mins) => {
                  const isActive = timerDuration === mins * 60;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onSelectDurationMinutes(mins)}
                      id={`stillness-duration-${mins}`}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium tabular-nums transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
                        isActive
                          ? 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] border border-[var(--amnd-border)] font-semibold'
                          : 'text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)]'
                      }`}
                    >
                      {isEn ? `${mins} min` : `${mins} 分钟`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onStartMeditation(chosenWish)}
                id="stillness-launch-fullscreen-btn"
                className="flex-1 py-3 px-5 amnd-btn-primary text-xs sm:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {isEn
                    ? `Begin ${Math.round(timerDuration / 60)}-Min Immersive Stillness`
                    : `开启 ${Math.round(timerDuration / 60)} 分钟沉浸静坐`}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex">
          <EditorialImage
            src={stillnessImg}
            alt={isEn ? 'Minimalist sunlit meditation cushion and oak floor' : '晨光中的极简亚麻坐垫与静心角落'}
            aspectClassName="aspect-[4/3] lg:aspect-auto lg:h-full min-h-[220px]"
            fallbackTitle={isEn ? 'Stillness · Quiet Space' : 'Stillness · 静心空间'}
            fallbackSubtitle="Take a moment to pause, breathe and reconnect."
          />
        </div>
      </section>

      {/* B. Breath Rhythm + Audio & Soundscape Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Breathing Rhythm, Focus Topic & Post-Sit Prompt */}
        <div className="lg:col-span-6 space-y-6">
          <div className="amnd-surface p-6 space-y-5 text-left">
            <div className="space-y-1 border-b border-[var(--amnd-border)] pb-3">
              <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'Breathing & Focus Setup' : '呼吸节律与静坐焦点'}
              </h3>
              <p className="text-xs text-[var(--amnd-text-muted)]">
                {isEn
                  ? 'Select breath cadence and intention before entering the fullscreen breathing visualizer & Chakra guide.'
                  : '在进入全屏呼吸光环与 ChakraVisualizer 脉轮引导前，预设呼吸模式与观想主题。'}
              </p>
            </div>

            {/* Breathing Modes */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium text-[var(--amnd-text-primary)] block">
                {isEn ? 'Breathing Pattern (5 Modes)' : '呼吸律动模式（5 种已有节奏）'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {breathingPatterns.map((pat) => {
                  const selected = selectedPatternId === pat.id;
                  return (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => onSelectPatternId(pat.id)}
                      id={`stillness-pattern-${pat.id}`}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[var(--amnd-wood-soft)] border-[var(--amnd-wood)] text-[var(--amnd-text-primary)]'
                          : 'bg-[var(--amnd-bg-primary)] border-[var(--amnd-border)] text-[var(--amnd-text-secondary)] hover:bg-[var(--amnd-bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{pat.name}</span>
                        <span className="text-[11px] font-mono text-[var(--amnd-text-muted)] shrink-0">
                          {pat.code}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {activePattern && (
                <p className="text-xs text-[var(--amnd-text-secondary)] bg-[var(--amnd-bg-secondary)] p-3 rounded-xl border border-[var(--amnd-border)] leading-relaxed">
                  {activePattern.desc}
                </p>
              )}
            </div>

            {/* Focus Topic Selection */}
            <div className="space-y-2">
              <label
                htmlFor="stillness-wish-select"
                className="text-xs font-medium text-[var(--amnd-text-primary)] block"
              >
                {isEn ? 'Focus Topic (Optional Intention)' : '静坐主题（可选全宇宙通用或个人心愿）'}
              </label>
              <select
                id="stillness-wish-select"
                value={selectedWishId}
                onChange={(e) => setSelectedWishId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 amnd-input"
              >
                <option value={defaultUniversalWish.id}>
                  {isEn ? 'Universal Cosmic Abundance (Default)' : '宇宙源头纯净丰盛冥想（默认通用）'}
                </option>
                {wishes.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => onStartMeditation(chosenWish)}
              className="w-full py-3 px-4 amnd-btn-primary text-xs sm:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>
                {isEn
                  ? 'Enter Fullscreen Breathing, Chakra & Voice Session'
                  : '进入全屏静心空间（呼吸动画 · 脉轮 · 语音引导）'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Post-Session Reflection Link (Honest, no fabricated history) */}
          <div className="amnd-surface-stone p-5 text-left space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
              <span>{isEn ? 'After Your Practice' : '静坐结束后'}</span>
            </div>
            <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'When you finish sitting, take a quiet moment to write down how you feel or what became clear in My Space.'
                : '静坐结束后，欢迎前往「我的空间」或「显化空间」记录当下的感受与清明的想法。'}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('myspace')}
                className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isEn ? 'Record Present Feelings' : '去我的空间记录当下感受'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('manifestation')}
                className="text-xs font-medium text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isEn ? 'Note Gratitude' : '前往记录感恩'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Existing AudioPlayer (Music, Nature Soundscapes, Solfeggio Composer, Voice Studio) */}
        <div className="lg:col-span-6">
          {audioPlayerSlot}
        </div>
      </section>
    </div>
  );
}
