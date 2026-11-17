import React, { useState, useCallback } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Feather,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Volume2,
  Wind,
} from 'lucide-react';
import { ABUNDANCE_CHAPTERS_DATA } from '../data/abundanceBookStructure';
import AbundanceChapterNotes, {
  NoteDraftTrigger,
  WISDOM_THEME_LABELS,
} from './AbundanceChapterNotes';
import type { PrimaryViewId } from './pages/HomePage';

interface AbundanceWisdomSpaceProps {
  language?: 'zh' | 'en';
  onSpeak?: (text: string) => Promise<void>;
  onAddCustomWish?: (
    title: string,
    details: string,
    category: 'wealth' | 'love' | 'beauty' | 'career' | 'lifestyle'
  ) => void;
  onNavigate?: (view: PrimaryViewId) => void;
  onBack?: () => void;
}

interface PerspectiveShift {
  scarcityZh: string;
  scarcityEn: string;
  clarityZh: string;
  clarityEn: string;
}

const THEME_PERSPECTIVE_SHIFTS: Record<string, PerspectiveShift> = {
  'ch-1': {
    scarcityZh: '总觉得还得再多拥有一点，才算真正站稳。',
    scarcityEn: 'Feeling I must gather more before I can feel whole.',
    clarityZh:
      '外在的积累只是体验，不是价值的凭证；把注意力收回来，人会安静得多。',
    clarityEn:
      'Outer accumulation is an experience, not proof of worth; returning inward brings quiet steadiness.',
  },
  'ch-2': {
    scarcityZh: '行业和生活机会有限，别人往前走了一步，我就少了一分可能。',
    scarcityEn:
      'Opportunities are scarce; someone else’s progress leaves less room for me.',
    clarityZh:
      '比较往往让人忽略自己的节奏。每个人都有独特的花期，别人的绽放不会拿走属于你的那一份。',
    clarityEn:
      'Comparison hides your own rhythm. Another person’s growth never subtracts from what is meant for you.',
  },
  'ch-3': {
    scarcityZh: '如果我不紧盯着每一个细节和结果，事情就会失控。',
    scarcityEn:
      'If I do not tightly control every outcome, things will fall apart.',
    clarityZh:
      '松手不是放弃努力，而是不再用焦虑去对抗尚未发生的事，给更好的转机留出空间。',
    clarityEn:
      'Letting go is not giving up; it is stopping the anxious fight so better solutions have room to arrive.',
  },
  'ch-4': {
    scarcityZh: '只有事情如我所愿时，才值得说一声谢谢。',
    scarcityEn: 'Gratitude only makes sense after things go my way.',
    clarityZh:
      '不附带条件的感谢，能把心从“还差一点”的焦躁里拉出来，让人更快回到平和。',
    clarityEn:
      'Unconditional gratitude gently pulls the mind out of lack and brings back an immediate sense of calm.',
  },
  'ch-5': {
    scarcityZh: '时间总是不够，一想到未来的不确定就停不下来。',
    scarcityEn:
      'There is never enough time, and tomorrow feels endlessly urgent.',
    clarityZh:
      '过去只是记忆，明天还未到来。人唯一真正能安放精力、做出回应的，永远只有眼前这一刻。',
    clarityEn:
      'The past is memory and tomorrow is projection. The only place life actually happens is right now.',
  },
  'ch-6': {
    scarcityZh: '我还有很多不够完美的地方，好像还不配拥有轻盈和美好。',
    scarcityEn:
      'With all my flaws, I do not yet deserve ease, warmth, or beauty.',
    clarityZh:
      '接纳自己的不完美，并不是降低标准，而是停止用苛刻作为爱自己的前置条件。',
    clarityEn:
      'Accepting imperfection does not lower your standard; it ends the habit of conditioning your worth on perfection.',
  },
  'ch-7': {
    scarcityZh: '每一次支出都让人紧绷，总担心资源流出去就不会再回来。',
    scarcityEn: 'Every expense feels tight, as if resources will never return.',
    clarityZh:
      '金钱与资源本质上是一种流动。当你带着信任与价值去交换，循环反而会变得更顺畅。',
    clarityEn:
      'Resources move in circulation. Meeting exchange with calm trust rather than fear restores ease to the flow.',
  },
  'ch-8': {
    scarcityZh: '过去受过的委屈和遗憾，总在心里反复回放，放不下也不甘心。',
    scarcityEn:
      'Old grievances keep replaying, making it hard to truly move forward.',
    clarityZh:
      '原谅不是替过去辩护，而是决定不再让旧的情绪继续消耗今天的心力。',
    clarityEn:
      'Forgiveness does not excuse what happened; it decides that old weight no longer owns today.',
  },
};

function sanitizeReadingText(text: string): string {
  return text
    .replace(/但杨定一博士揭示，/gu, '其实，')
    .replace(/杨定一博士在《[^》]+》(?:《[^》]+》)*中指出：/gu, '')
    .replace(/杨定一博士指出：/gu, '')
    .replace(/But Dr\. Jan reveals /gi, 'Yet ')
    .replace(/\s*——[^。\n]*$/u, '')
    .trim();
}

export default function AbundanceWisdomSpace({
  language = 'zh',
  onSpeak,
  onAddCustomWish,
  onNavigate,
}: AbundanceWisdomSpaceProps) {
  const isEn = language === 'en';

  // Collapsible AI Thinking Companion
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [customLimitingThought, setCustomLimitingThought] = useState('');
  const [isAlchemizingAI, setIsAlchemizingAI] = useState(false);
  const [customAlchemyResult, setCustomAlchemyResult] = useState<{
    scarcityFilter: string;
    surrenderRelease: string;
    abundanceReality: string;
    mantra: string;
    quote: string;
  } | null>(null);
  const [savedAlchemyWish, setSavedAlchemyWish] = useState(false);

  // Reading notes sync & inline wish feedback
  const [notesCount, setNotesCount] = useState<number>(0);
  const [noteDraft, setNoteDraft] = useState<NoteDraftTrigger | null>(null);
  const [addedWishKey, setAddedWishKey] = useState<string | null>(null);

  const handleNotesCountChange = useCallback((count: number) => {
    setNotesCount(count);
  }, []);

  const triggerAddNoteFromSection = (
    chapterId: string,
    quote?: string,
    category?: 'wealth' | 'worth' | 'surrender' | 'gratitude' | 'now' | 'general'
  ) => {
    setNoteDraft({
      chapterId,
      quote,
      category,
      nonce: Date.now(),
    });
  };

  const handleCustomAlchemy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customLimitingThought.trim() || isAlchemizingAI) return;

    setIsAlchemizingAI(true);
    setSavedAlchemyWish(false);

    try {
      const response = await fetch('/api/wisdom/alchemize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limitingThought: customLimitingThought }),
      });

      if (!response.ok) {
        throw new Error('Alchemy server returned error');
      }

      const data = await response.json();
      setCustomAlchemyResult({
        scarcityFilter: sanitizeReadingText(data.scarcityFilter || ''),
        surrenderRelease: sanitizeReadingText(data.surrenderRelease || ''),
        abundanceReality: sanitizeReadingText(data.abundanceReality || ''),
        mantra: sanitizeReadingText(data.mantra || ''),
        quote: sanitizeReadingText(data.quote || ''),
      });
    } catch (err) {
      console.warn('Thinking companion offline fallback:', err);
      setCustomAlchemyResult({
        scarcityFilter: isEn
          ? 'The mind is treating a temporary limitation as a permanent verdict about your worth or future.'
          : '头脑把眼前的暂时局限当成了全部事实，于是生出了“我还不够”或“事情会失控”的紧绷感。',
        surrenderRelease: isEn
          ? 'Pause for one quiet breath and soften the urge to force an immediate answer. Let the tightness loosen first.'
          : '先停下来缓一口气，承认自己此刻的不安，不再强迫自己立刻想出所有答案，把肩膀放下来。',
        abundanceReality: isEn
          ? 'Your value does not depend on constant striving. When the mind settles, clearer choices and steady support become easier to notice.'
          : '你的价值从不取决于焦虑地证明什么。当心稍微静下来，原本就有、却被忽视的资源与出口会更容易被看见。',
        mantra: isEn
          ? 'I loosen my grip, allow space, and trust what unfolds.'
          : '我先松开一点，允许事情慢慢展开。',
        quote: isEn
          ? 'True steadiness begins when we stop fighting the moment we are in.'
          : '真正的安心，往往从停止和当下较劲开始。',
      });
    } finally {
      setIsAlchemizingAI(false);
    }
  };

  const quickThoughtPrompts = isEn
    ? [
        'I worry my savings are not enough for upcoming expenses.',
        'Everyone around me seems ahead, and I feel like I am falling behind.',
        'I keep feeling I have too many flaws to deserve an effortless life.',
        'When things do not follow my plan, I immediately become anxious.',
      ]
    : [
        '担心存款不够，对接下来的开销感到紧绷',
        '看到身边的人走得很快，担心自己被落下',
        '总觉得自己还不够好，还不配拥有轻松自在的生活',
        '事情一旦脱离原本的计划，心里就会不安',
      ];

  const handleOpenCompanionWithPrompt = (thought: string) => {
    setCustomLimitingThought(thought);
    setIsCompanionOpen(true);
    const el = document.getElementById('wisdom-thinking-companion');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div
      className="max-w-3xl mx-auto space-y-12 text-left"
      id="abundance-wisdom-space"
    >
      {/* Compact Secondary Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-[var(--amnd-border)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCompanionOpen((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap min-h-[40px] border ${
              isCompanionOpen
                ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)] border-transparent'
                : 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] border-[var(--amnd-border-strong)] hover:border-[var(--amnd-wood)]'
            }`}
            aria-expanded={isCompanionOpen}
            id="toggle-thinking-companion-btn"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>
              {isEn ? 'Thinking Companion' : 'AI 思维梳理'}
            </span>
            {isCompanionOpen ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const target = document.getElementById('wisdom-reading-notes');
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="px-3.5 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
          >
            <Feather className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
            <span className="tabular-nums">
              {isEn
                ? `Reading Notes (${notesCount})`
                : `阅读笔记 (${notesCount})`}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => triggerAddNoteFromSection('ch-1')}
          className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap py-2"
        >
          <Feather className="w-3.5 h-3.5" />
          <span>{isEn ? 'Jot down a thought' : '随手记一条笔记'}</span>
        </button>
      </div>

      {/* Collapsible Secondary AI Thinking Companion */}
      {isCompanionOpen && (
        <section
          id="wisdom-thinking-companion"
          className="amnd-surface p-5 md:p-7 space-y-5 animate-fadeIn"
          aria-label={
            isEn ? 'Thought Reflection Companion' : 'AI 思维梳理助手'
          }
        >
          <div className="space-y-1.5">
            <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
              {isEn ? 'Thinking Companion' : '思维梳理与转念练习'}
            </h3>
            <p className="text-xs md:text-sm text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'Write down a recurring worry or tight thought while reading. We will gently untangle the assumption behind it into a clearer perspective.'
                : '如果读到某个地方心里正好卡着一个念头，可以把它写在这里，帮你理清背后的预设，换成更松弛的角度来看待。'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickThoughtPrompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCustomLimitingThought(promptText)}
                className="px-3 py-1.5 rounded-lg bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)] text-xs transition-colors cursor-pointer text-left border border-[var(--amnd-border)]"
              >
                {promptText}
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomAlchemy} className="space-y-3">
            <div className="relative">
              <textarea
                value={customLimitingThought}
                onChange={(e) => setCustomLimitingThought(e.target.value)}
                placeholder={
                  isEn
                    ? 'Write the thought you want to untangle...'
                    : '写下此刻困扰你的念头或担忧...'
                }
                rows={3}
                className="w-full p-3.5 amnd-input text-sm resize-none"
              />
              {isAlchemizingAI && (
                <div className="absolute inset-0 bg-[var(--amnd-bg-elevated)]/85 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-[var(--amnd-wood)]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {isEn ? 'Organizing perspective...' : '正在整理思路...'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={isAlchemizingAI || !customLimitingThought.trim()}
                className="px-5 py-2.5 amnd-btn-primary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
                id="submit-ai-alchemy-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEn ? 'Reflect on This' : '帮我理一理'}</span>
              </button>
            </div>
          </form>

          {customAlchemyResult && (
            <div className="pt-5 border-t border-[var(--amnd-border)] space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--amnd-wood)]">
                  {isEn ? 'A Clearer Perspective' : '换个角度看这件事'}
                </span>
                {onSpeak && (
                  <button
                    type="button"
                    onClick={() =>
                      onSpeak(
                        `${customAlchemyResult.abundanceReality}。${customAlchemyResult.mantra}`
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Listen' : '朗读'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-[13px]">
                <div className="p-4 amnd-surface-stone space-y-1.5">
                  <span className="text-xs font-medium text-[var(--amnd-text-muted)] block">
                    {isEn ? '1. The Hidden Assumption' : '1. 背后的念头预设'}
                  </span>
                  <p className="text-[var(--amnd-text-secondary)] leading-relaxed">
                    {customAlchemyResult.scarcityFilter}
                  </p>
                </div>

                <div className="p-4 amnd-surface-stone space-y-1.5">
                  <span className="text-xs font-medium text-[var(--amnd-text-muted)] block">
                    {isEn ? '2. Where to Loosen' : '2. 可以松开的地方'}
                  </span>
                  <p className="text-[var(--amnd-text-secondary)] leading-relaxed">
                    {customAlchemyResult.surrenderRelease}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--amnd-bg-primary)] border border-[var(--amnd-border-strong)] space-y-1.5">
                  <span className="text-xs font-medium text-[var(--amnd-wood)] block">
                    {isEn ? '3. Grounded View' : '3. 更宽广的理解'}
                  </span>
                  <p className="text-[var(--amnd-text-primary)] leading-relaxed">
                    {customAlchemyResult.abundanceReality}
                  </p>
                </div>
              </div>

              <div className="py-4 border-y border-[var(--amnd-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="font-serif text-base text-[var(--amnd-text-primary)]">
                  “{customAlchemyResult.mantra}”
                </p>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      triggerAddNoteFromSection(
                        'ch-1',
                        customAlchemyResult.mantra,
                        'general'
                      )
                    }
                    className="text-xs text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Feather className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Save Note' : '记入笔记'}</span>
                  </button>

                  {onAddCustomWish && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddCustomWish(
                          customAlchemyResult.mantra.slice(0, 18),
                          `${customAlchemyResult.abundanceReality}\n${customAlchemyResult.mantra}`,
                          'lifestyle'
                        );
                        setSavedAlchemyWish(true);
                      }}
                      className="px-3.5 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {savedAlchemyWish ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[var(--amnd-success)]" />
                          <span className="text-[var(--amnd-success)]">
                            {isEn ? 'Saved to Wishes' : '已存入心愿'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                          <span>{isEn ? 'Save as Wish' : '存为心愿'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          SINGLE CONTINUOUS LONG-FORM EDITORIAL READING FLOW
      ======================================================== */}
      <article className="space-y-16" id="wisdom-continuous-reading">
        {ABUNDANCE_CHAPTERS_DATA.map((section, idx) => {
          const themeMeta = WISDOM_THEME_LABELS[section.id];
          const sectionTitle = themeMeta
            ? isEn
              ? themeMeta.titleEn
              : themeMeta.titleZh
            : isEn
              ? section.titleEn
              : section.titleZh;
          const sectionNumber = String(idx + 1).padStart(2, '0');
          const primaryQuote = section.goldenMantras[0];
          const secondaryQuote = section.goldenMantras[1];
          const perspective = THEME_PERSPECTIVE_SHIFTS[section.id];
          const coreText = sanitizeReadingText(
            isEn ? section.corePhilosophyEn : section.corePhilosophyZh
          );
          const essenceText = sanitizeReadingText(
            isEn ? section.awakeningEssenceEn : section.awakeningEssenceZh
          );
          const lifeNoteText = sanitizeReadingText(
            isEn ? section.practiceKeyEn : section.practiceKeyZh
          );

          return (
            <section
              key={section.id}
              id={`wisdom-section-${section.id}`}
              className={
                idx > 0 ? 'pt-14 border-t border-[var(--amnd-border)] space-y-6' : 'space-y-6'
              }
            >
              {/* Clean Editorial Heading (No book names, no academic subtitles, no pills) */}
              <header className="space-y-2">
                <span className="text-xs font-mono tabular-nums text-[var(--amnd-gold)] tracking-wider block">
                  {sectionNumber}
                </span>
                <h2 className="font-serif text-2xl md:text-[28px] font-semibold text-[var(--amnd-text-primary)] leading-snug">
                  {sectionTitle}
                </h2>
              </header>

              {/* Continuous Editorial Prose */}
              <div className="space-y-4 text-[15px] md:text-base text-[var(--amnd-text-secondary)] leading-[1.85]">
                <p>{coreText}</p>
                <p>{essenceText}</p>
                <p className="text-[var(--amnd-text-primary)]">{lifeNoteText}</p>
              </div>

              {/* Subtle Perspective Shift Block (Distilled from Mindset Insights, no 3D card wall) */}
              {perspective && (
                <div className="py-4 px-5 rounded-xl bg-[var(--amnd-bg-secondary)]/70 border border-[var(--amnd-border)] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-[13px] leading-relaxed">
                  <div className="space-y-1">
                    <span className="text-[var(--amnd-text-muted)] block">
                      {isEn ? 'Common Habit of Mind' : '常见的紧绷视角'}
                    </span>
                    <p className="text-[var(--amnd-text-secondary)]">
                      {isEn ? perspective.scarcityEn : perspective.scarcityZh}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[var(--amnd-wood)] font-medium block">
                      {isEn ? 'Another Way to See It' : '松开之后的视角'}
                    </span>
                    <p className="text-[var(--amnd-text-primary)]">
                      {isEn ? perspective.clarityEn : perspective.clarityZh}
                    </p>
                  </div>
                </div>
              )}

              {/* Pull Quote */}
              {primaryQuote && (
                <figure className="py-5 border-y border-[var(--amnd-border)] space-y-2">
                  <blockquote className="font-serif text-lg md:text-xl text-[var(--amnd-text-primary)] leading-relaxed">
                    “{isEn ? primaryQuote.textEn : primaryQuote.textZh}”
                  </blockquote>
                  {!isEn && primaryQuote.insightZh && (
                    <figcaption className="text-xs text-[var(--amnd-text-muted)] leading-relaxed">
                      {primaryQuote.insightZh}
                    </figcaption>
                  )}
                  {secondaryQuote && (
                    <p className="text-xs md:text-[13px] text-[var(--amnd-text-secondary)] pt-1">
                      “{isEn ? secondaryQuote.textEn : secondaryQuote.textZh}”
                    </p>
                  )}
                </figure>
              )}

              {/* Gentle Self-Inquiry Questions */}
              {section.reflectionPrompts.length > 0 && (
                <div className="space-y-1.5 text-xs md:text-[13px] text-[var(--amnd-text-secondary)]">
                  <span className="text-xs font-medium text-[var(--amnd-text-muted)] block">
                    {isEn ? 'Questions to sit with' : '读到这里，可以问问自己'}
                  </span>
                  <ul className="space-y-1.5">
                    {section.reflectionPrompts.map((prompt, pIdx) => (
                      <li key={pIdx} className="leading-relaxed">
                        {prompt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quiet Inline Section Actions */}
              <div className="flex flex-wrap items-center gap-5 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    triggerAddNoteFromSection(
                      section.id,
                      isEn ? primaryQuote?.textEn : primaryQuote?.textZh,
                      themeMeta?.defaultCategory
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-[var(--amnd-wood)] hover:underline font-medium cursor-pointer"
                >
                  <Feather className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Write a Note' : '记下此刻感悟'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenCompanionWithPrompt(
                      perspective
                        ? isEn
                          ? perspective.scarcityEn
                          : perspective.scarcityZh
                        : sectionTitle
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Untangle with AI' : '用思维助手理一理'}</span>
                </button>

                {onSpeak && primaryQuote && (
                  <button
                    type="button"
                    onClick={() =>
                      onSpeak(
                        `${sectionTitle}。${coreText} ${
                          isEn ? primaryQuote.textEn : primaryQuote.textZh
                        }`
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Listen' : '朗读这段'}</span>
                  </button>
                )}

                {onAddCustomWish && primaryQuote && (
                  <button
                    type="button"
                    onClick={() => {
                      const qText = isEn
                        ? primaryQuote.textEn
                        : primaryQuote.textZh;
                      onAddCustomWish(
                        qText.length > 20 ? `${qText.slice(0, 20)}...` : qText,
                        `${qText}\n${primaryQuote.insightZh || ''}`,
                        themeMeta?.defaultCategory === 'wealth'
                          ? 'wealth'
                          : 'lifestyle'
                      );
                      setAddedWishKey(section.id);
                      setTimeout(() => setAddedWishKey(null), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
                  >
                    {addedWishKey === section.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--amnd-success)]" />
                        <span className="text-[var(--amnd-success)]">
                          {isEn ? 'Added to Wishes' : '已存为心愿'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                        <span>{isEn ? 'Save as Wish' : '存为心愿'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </article>

      {/* ========================================================
          PERSONAL READING NOTES (SYNCED WITH MY SPACE)
      ======================================================== */}
      <div className="pt-8 border-t border-[var(--amnd-border-strong)]">
        <AbundanceChapterNotes
          language={language}
          onSpeak={onSpeak}
          onAddCustomWish={onAddCustomWish}
          externalDraft={noteDraft}
          onNotesCountChange={handleNotesCountChange}
        />
      </div>

      {/* ========================================================
          NATURAL TRANSITION TO STILLNESS (静心)
      ======================================================== */}
      <section
        className="amnd-surface-stone p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        aria-label={isEn ? 'Next step: Stillness' : '下一步：进入静心'}
      >
        <div className="space-y-1.5 max-w-lg">
          <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)]">
            {isEn
              ? 'Let Understanding Settle into Stillness'
              : '让阅读慢慢沉淀到呼吸与安静里'}
          </h3>
          <p className="text-xs md:text-sm text-[var(--amnd-text-secondary)] leading-relaxed">
            {isEn
              ? 'When you are ready to step away from words, continue into Stillness for quiet sitting, breath rhythm, and ambient sound.'
              : '读完文字之后，如果想把注意力带回身体和呼吸，可以进入「静心」空间做一段安静的停留。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onNavigate && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('stillness')}
                className="px-5 py-2.5 amnd-btn-primary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[42px]"
                id="wisdom-enter-stillness-btn"
              >
                <Wind className="w-3.5 h-3.5" />
                <span>{isEn ? 'Enter Stillness' : '进入静心'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('myspace')}
                className="px-4 py-2.5 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[42px]"
              >
                <span>{isEn ? 'My Space' : '查看我的空间'}</span>
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
