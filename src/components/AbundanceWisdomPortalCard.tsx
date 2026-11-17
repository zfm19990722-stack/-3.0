import React from 'react';
import { Compass, ArrowRight } from 'lucide-react';

interface AbundanceWisdomPortalCardProps {
  language?: 'zh' | 'en';
  onEnter: () => void;
}

export default function AbundanceWisdomPortalCard({
  language = 'zh',
  onEnter
}: AbundanceWisdomPortalCardProps) {
  const isEn = language === 'en';

  return (
    <div
      className="p-6 md:p-7 amnd-surface-stone text-left transition-colors duration-200 hover:border-[var(--amnd-border-strong)] group"
      id="abundance-wisdom-portal-card"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
            <Compass className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
            <span>{isEn ? "Wisdom Space · Dr. Yang Ding-I's《Abundance》" : '智慧空间 · 杨定一博士《全部生命系列》'}</span>
          </div>

          <h3 className="font-serif text-xl md:text-2xl text-[var(--amnd-text-primary)] font-semibold">
            {isEn ? 'Abundance Wisdom & Mindful Notes' : '丰盛智慧觉醒空间 · 阅读与觉察笔记'}
          </h3>

          <p className="text-xs md:text-[13px] text-[var(--amnd-text-secondary)] leading-relaxed">
            {isEn
              ? 'Step into the dedicated sanctuary featuring core book chapters and reading notes, AI-powered mindset alchemy, sensory grounding, singing bowl resonance, and quiet surrender practices.'
              : '进入独立智慧阅读与觉察空间：收录《丰盛》《唯识》《活在当下》核心篇章要义与个人读书笔记、转念练习、一分钟身体着陆、颂钵感恩共振与臣服练习。'}
          </p>

          <p className="text-xs text-[var(--amnd-text-muted)] pt-0.5">
            {isEn
              ? 'Chapter Reading & Notes · Mindset Alchemy · Grounding · Gratitude Resonance'
              : '原书篇章与笔记 · 唯识转念 · 身体着陆 · 颂钵感恩 · 臣服练习'}
          </p>
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="w-full md:w-auto px-6 py-3 amnd-btn-secondary text-xs md:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
          id="enter-wisdom-space-btn"
        >
          <span>{isEn ? 'Enter Wisdom Space' : '进入丰盛智慧空间'}</span>
          <ArrowRight className="w-4 h-4 text-[var(--amnd-wood)] transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
