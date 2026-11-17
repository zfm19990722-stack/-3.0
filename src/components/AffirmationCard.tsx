import { useState, useMemo } from 'react';
import { ABUNDANCE_BOOK_QUOTES, AbundanceQuote } from '../data/abundanceQuotes';
import {
  Sparkles,
  Volume2,
  RefreshCw,
  VolumeX,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Copy,
  Check,
  Search,
  X,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AffirmationCardProps {
  onSpeak: (text: string) => Promise<void>;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  language?: 'zh' | 'en';
}

export default function AffirmationCard({
  onSpeak,
  isSpeaking,
  onStopSpeaking,
  language = 'zh',
}: AffirmationCardProps) {
  const isEn = language === 'en';

  // Deterministic daily quote index based on day of year
  const defaultDailyIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % ABUNDANCE_BOOK_QUOTES.length;
  }, []);

  const [currentIndex, setCurrentIndex] = useState(defaultDailyIndex);
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [speakProgress, setSpeakProgress] = useState(false);

  // Available themes for filtering
  const themes = useMemo(() => {
    const set = new Set<string>();
    ABUNDANCE_BOOK_QUOTES.forEach((q) => set.add(isEn ? q.themeEn : q.themeZh));
    return ['all', ...Array.from(set)];
  }, [isEn]);

  // Filtered quotes based on selected theme
  const filteredQuotes = useMemo(() => {
    if (selectedTheme === 'all') return ABUNDANCE_BOOK_QUOTES;
    return ABUNDANCE_BOOK_QUOTES.filter((q) =>
      isEn ? q.themeEn === selectedTheme : q.themeZh === selectedTheme
    );
  }, [selectedTheme, isEn]);

  // Ensure currentIndex stays within bounds if filtered
  const currentQuote: AbundanceQuote = ABUNDANCE_BOOK_QUOTES[currentIndex] || ABUNDANCE_BOOK_QUOTES[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % ABUNDANCE_BOOK_QUOTES.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + ABUNDANCE_BOOK_QUOTES.length) % ABUNDANCE_BOOK_QUOTES.length);
  };

  const handleRandom = () => {
    let next = currentIndex;
    while (next === currentIndex && ABUNDANCE_BOOK_QUOTES.length > 1) {
      next = Math.floor(Math.random() * ABUNDANCE_BOOK_QUOTES.length);
    }
    setCurrentIndex(next);
  };

  const handleSpeakToggle = async () => {
    if (isSpeaking || speakProgress) {
      onStopSpeaking();
      return;
    }

    setSpeakProgress(true);
    try {
      const textToSpeak = isEn ? currentQuote.translation : currentQuote.text;
      await onSpeak(textToSpeak);
    } catch (err) {
      console.error('TTS play error:', err);
    } finally {
      setSpeakProgress(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = isEn
      ? `"${currentQuote.translation}" — Dr. Yang Ding-I, 《Abundance》`
      : `“${currentQuote.text}” —— 杨定一博士《丰盛》`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  // Search filtered quotes in the Library Modal
  const modalFilteredQuotes = useMemo(() => {
    return ABUNDANCE_BOOK_QUOTES.filter((q) => {
      const matchesSearch =
        q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.translation && q.translation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.themeZh && q.themeZh.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.bookChapter && q.bookChapter.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [searchQuery]);

  return (
    <>
      <div
        className="p-6 md:p-7 amnd-surface relative overflow-hidden flex flex-col justify-between"
        id="daily-affirmation-card"
      >
        {/* Header with Title and Tools */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[var(--amnd-gold)] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-[var(--amnd-text-primary)] block">
                  {isEn ? 'Daily Affirmation · Abundance' : '每日静心语录 ·《丰盛》精选'}
                </span>
                <span className="text-[11px] text-[var(--amnd-text-muted)] tabular-nums">
                  {isEn
                    ? `Quote ${currentIndex + 1} of ${ABUNDANCE_BOOK_QUOTES.length}`
                    : `第 ${currentIndex + 1} / ${ABUNDANCE_BOOK_QUOTES.length} 句 · 杨定一博士`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsLibraryOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] border border-[var(--amnd-border)] text-[var(--amnd-text-primary)] text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
                title={isEn ? 'Browse all 55+ quotes' : '浏览全部 55 句原书金句'}
                id="open-abundance-library-btn"
              >
                <BookOpen className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                <span className="hidden sm:inline">{isEn ? '55 Quotes' : '典藏书库 (55句)'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-secondary)] transition-colors cursor-pointer"
                title={isEn ? 'Copy quote text' : '复制金句'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--amnd-success)]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleRandom}
                className="p-1.5 rounded-lg hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-secondary)] transition-colors cursor-pointer"
                title={isEn ? 'Random Affirmation' : '随机换一句'}
                id="rotate-affirmation-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Unboxed Theme & Book Chapter Metadata */}
          <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)] mb-3">
            <span className="font-medium text-[var(--amnd-wood)]">
              {isEn ? currentQuote.themeEn : currentQuote.themeZh}
            </span>
            {currentQuote.bookChapter && (
              <>
                <span aria-hidden="true">·</span>
                <span>{isEn ? currentQuote.bookChapter : `篇章：${currentQuote.bookChapter}`}</span>
              </>
            )}
          </div>
        </div>

        {/* Main Quote Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuote.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="my-3 flex flex-col justify-center text-center px-1 md:px-2"
          >
            <blockquote className="font-serif text-base md:text-lg text-[var(--amnd-text-primary)] leading-relaxed font-medium">
              “ {isEn ? currentQuote.translation : currentQuote.text} ”
            </blockquote>

            {/* Translation */}
            <p className="text-xs text-[var(--amnd-text-muted)] mt-3 font-sans leading-relaxed">
              {isEn ? currentQuote.text : currentQuote.translation}
            </p>

            {/* Spiritual Insight Note */}
            {(currentQuote.insight || currentQuote.insightEn) && (
              <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border)] text-xs text-[var(--amnd-text-secondary)] leading-relaxed text-left">
                <span className="text-[var(--amnd-wood)] font-semibold">
                  {isEn ? 'Insight: ' : '觉察指引：'}
                </span>
                {isEn ? currentQuote.insightEn : currentQuote.insight}
              </div>
            )}

            {/* Source Attribution */}
            <div className="mt-3.5 flex items-center justify-center gap-2.5">
              <span className="h-px w-5 bg-[var(--amnd-border-strong)]" />
              <span className="text-[11px] text-[var(--amnd-text-muted)] font-serif">
                {isEn ? `Dr. Yang Ding-I · ${currentQuote.source}` : `杨定一博士 · ${currentQuote.source}`}
              </span>
              <span className="h-px w-5 bg-[var(--amnd-border-strong)]" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom Switcher & Audio Read-Aloud */}
        <div className="mt-4 pt-4 border-t border-[var(--amnd-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-secondary)] transition-colors cursor-pointer"
              title={isEn ? 'Previous Quote' : '上一句'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[var(--amnd-text-muted)] font-mono tabular-nums px-1">
              {currentIndex + 1} / {ABUNDANCE_BOOK_QUOTES.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-secondary)] transition-colors cursor-pointer"
              title={isEn ? 'Next Quote' : '下一句'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Audio TTS Speech Button */}
          <button
            type="button"
            onClick={handleSpeakToggle}
            disabled={speakProgress}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-sans text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isSpeaking
                ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)]'
                : 'amnd-btn-secondary'
            }`}
            id="affirmation-speech-btn"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>{isEn ? 'Stop' : '停止朗读'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                <span>{speakProgress ? (isEn ? 'Connecting...' : '准备朗读中...') : (isEn ? 'Listen' : '语音朗读')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full 55+ Quotes Library Modal */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--amnd-bg-elevated)] rounded-2xl p-6 md:p-8 shadow-[var(--amnd-shadow-md)] border border-[var(--amnd-border-strong)] overflow-hidden flex flex-col text-[var(--amnd-text-primary)]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--amnd-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border)] flex items-center justify-center text-[var(--amnd-wood)]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)]">
                    {isEn ? '《Abundance》 55 Golden Quotes Library' : '《丰盛》全书 55 句原书金句典藏'}
                  </h3>
                  <p className="text-xs text-[var(--amnd-text-muted)]">
                    {isEn
                      ? 'Select any quote to apply directly to your daily affirmation card'
                      : '杨定一博士著作精选 · 点击任意金句可直接切换至卡片与朗读'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLibraryOpen(false)}
                className="p-2 text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-bg-secondary)] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="my-4 relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[var(--amnd-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search keywords, chapters, or themes...' : '搜索金句内容、篇章或主题（如：感恩、放手、配得感）...'}
                className="w-full text-xs pl-10 pr-4 py-2.5 amnd-input"
              />
            </div>

            {/* Scrollable Quotes List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {modalFilteredQuotes.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--amnd-text-muted)]">
                  {isEn ? 'No quotes matching your search.' : '未找到匹配的金句'}
                </div>
              ) : (
                modalFilteredQuotes.map((quote) => {
                  const originalIndex = ABUNDANCE_BOOK_QUOTES.findIndex((q) => q.id === quote.id);
                  const isSelected = originalIndex === currentIndex;

                  return (
                    <div
                      key={quote.id}
                      onClick={() => {
                        setCurrentIndex(originalIndex);
                        setIsLibraryOpen(false);
                      }}
                      className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--amnd-wood-soft)] border-[var(--amnd-wood)]'
                          : 'bg-[var(--amnd-bg-primary)] hover:bg-[var(--amnd-bg-secondary)] border-[var(--amnd-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <div className="flex items-center gap-2 text-[var(--amnd-text-muted)]">
                          <span className="font-semibold text-[var(--amnd-wood)] tabular-nums">
                            #{originalIndex + 1} {isEn ? quote.themeEn : quote.themeZh}
                          </span>
                          {quote.bookChapter && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{quote.bookChapter}</span>
                            </>
                          )}
                        </div>

                        {isSelected && (
                          <span className="text-[11px] font-medium text-[var(--amnd-success)] flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {isEn ? 'Active' : '当前展示中'}
                          </span>
                        )}
                      </div>

                      <blockquote className="font-serif text-sm text-[var(--amnd-text-primary)] leading-relaxed mb-1">
                        “ {quote.text} ”
                      </blockquote>
                      {quote.translation && (
                        <p className="text-xs text-[var(--amnd-text-muted)] font-sans">
                          {quote.translation}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 mt-2 border-t border-[var(--amnd-border)] flex items-center justify-between text-xs text-[var(--amnd-text-muted)]">
              <span className="tabular-nums">
                {isEn
                  ? `Showing ${modalFilteredQuotes.length} of ${ABUNDANCE_BOOK_QUOTES.length} quotes`
                  : `共收录 ${ABUNDANCE_BOOK_QUOTES.length} 句《丰盛》原书经典金句`}
              </span>
              <button
                type="button"
                onClick={() => setIsLibraryOpen(false)}
                className="px-4 py-1.5 amnd-btn-primary text-xs font-medium cursor-pointer"
              >
                {isEn ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
