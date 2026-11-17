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
    <div className="space-y-8 animate-fadeIn pb-8" id="wisdom-page">
      {/* Clean Editorial Masthead */}
      <header className="max-w-3xl mx-auto pt-2 text-left space-y-2">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[var(--amnd-text-primary)] tracking-tight">
          Wisdom
        </h2>
        <p className="text-sm font-medium text-[var(--amnd-wood)] tracking-wide">
          Learn. Reflect. Understand.
        </p>
        <p className="text-sm md:text-[15px] text-[var(--amnd-text-secondary)] leading-relaxed pt-1">
          {isEn
            ? 'Read and reflect here, letting insight gradually become your own understanding.'
            : '在这里阅读、思考，让知识慢慢成为自己的理解。'}
        </p>
      </header>

      {/* Continuous Editorial Reading Space + Collapsible Thinking Companion + Notes */}
      <AbundanceWisdomSpace
        language={language}
        onSpeak={onSpeak}
        onAddCustomWish={onAddCustomWish}
        onNavigate={onNavigate}
        onBack={() => {
          onNavigate('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
