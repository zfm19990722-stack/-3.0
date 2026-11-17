import { ArrowRight, BookOpen } from 'lucide-react';
import AbundanceWisdomSpace from '../AbundanceWisdomSpace';
import type { PrimaryViewId } from './HomePage';

interface WisdomPageProps {
  language: 'zh' | 'en';
  onSpeak: (text: string) => Promise<void>;
  onAddCustomWish: (
    title: string,
    details: string,
    category: 'wealth' | 'love' | 'beauty' | 'career' | 'lifestyle'
  ) => void;
  onNavigate: (view: PrimaryViewId) => void;
}

export default function WisdomPage({
  language,
  onSpeak,
  onAddCustomWish,
  onNavigate,
}: WisdomPageProps) {
  const isEn = language === 'en';

  return (
    <div className="space-y-8 animate-fadeIn" id="wisdom-page">
      {/* Editorial Intro Header */}
      <section className="p-6 md:p-8 amnd-surface flex flex-col md:flex-row md:items-end justify-between gap-6 text-left">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
            <BookOpen className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
            <span>{isEn ? 'Wisdom · Contemporary Reading Space' : '智慧 · 当代阅读与学习空间'}</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[var(--amnd-text-primary)] tracking-tight">
            Wisdom · {isEn ? 'Learn. Reflect. Understand.' : '学习 · 反思 · 理解'}
          </h2>
          <p className="text-sm text-[var(--amnd-text-secondary)] leading-relaxed">
            {isEn
              ? 'Read the eight chapters of 《Abundance》 at an unhurried pace, capture personal reading notes, practice AI Mindset Alchemy as a gentle thinking companion, and turn insights into clear intentions.'
              : '在这里系统阅读《丰盛》八个核心章节，随手记录读书笔记与感悟，将「AI 思维炼金」作为梳理念头的辅助工具，并把启发沉淀为清晰的心愿。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('myspace')}
            className="px-4 py-2.5 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[42px]"
          >
            <span>{isEn ? 'My Reading Notes' : '查看个人笔记档案'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
          </button>
        </div>
      </section>

      {/* Core Existing Abundance Wisdom Sanctuary (Preserves Chapters, AI Alchemy, Grounding, Singing Bowl, Surrender & Notes) */}
      <div className="max-w-6xl mx-auto">
        <AbundanceWisdomSpace
          language={language}
          onSpeak={onSpeak}
          onAddCustomWish={onAddCustomWish}
          onBack={() => {
            onNavigate('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
}
