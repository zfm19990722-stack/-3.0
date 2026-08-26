import React from 'react';
import { Compass, Sparkles, ArrowRight, BookOpen, Flame, Heart, Feather, ShieldCheck } from 'lucide-react';

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
      className="p-6 md:p-8 rounded-[32px] bg-gradient-to-r from-amber-50/80 via-white/90 to-rose-50/80 backdrop-blur-2xl border border-amber-200/70 shadow-xl shadow-pink-100/10 relative overflow-hidden text-left transition-all duration-500 hover:shadow-2xl hover:border-amber-300/90 group"
      id="abundance-wisdom-portal-card"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-200/35 via-pink-200/25 to-transparent pointer-events-none rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gradient-to-tr from-rose-200/30 to-transparent pointer-events-none rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shadow-xs border border-amber-200/50">
              <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>{isEn ? "Dr. Jan's Wisdom Sanctuary" : "杨定一博士《全部生命系列》"}</span>
            </span>
            <span className="text-[10px] text-[#8e6d72] font-semibold bg-white/90 px-2.5 py-0.5 rounded-full border border-amber-200/40 shadow-xs">
              {isEn ? "Dedicated Portal" : "独立沉浸空间"}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl md:text-2xl text-[#8e6d72] font-bold flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-amber-500 animate-spin shrink-0" style={{ animationDuration: '16s' }} />
            <span>{isEn ? 'The Abundance Sanctuary & Wei-Shi Space' : '丰盛智慧觉醒空间 · 唯识真如殿堂'}</span>
          </h3>

          {/* Description */}
          <p className="text-xs text-[#6d5b5e] leading-relaxed">
            {isEn
              ? "Step into the standalone sanctuary featuring Dr. Jan's 6 core book chapters & notes, AI-powered Wei-Shi mindset alchemy, sensory grounding, Tibetan singing bowl resonance, and radical surrender practices."
              : "点击进入专属独立觉醒空间：收纳《丰盛》《唯识》《活在当下》全书6大篇章要义与读书笔记、AI唯识转念炼金术、1分钟身体着陆、西藏颂钵感恩共振与全然臣服练习。"}
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-amber-200/50 flex items-center gap-1 shadow-2xs">
              <BookOpen className="w-3 h-3 text-amber-600" />
              <span>{isEn ? '6 Book Chapters' : '6大篇章笔记'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-amber-200/50 flex items-center gap-1 shadow-2xs">
              <Flame className="w-3 h-3 text-rose-500" />
              <span>{isEn ? 'Mindset Alchemy' : '唯识转念炼金'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-amber-200/50 flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{isEn ? 'Here & Now Grounding' : '当下身体着陆'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-amber-200/50 flex items-center gap-1 shadow-2xs">
              <Heart className="w-3 h-3 text-pink-500" />
              <span>{isEn ? 'Gratitude Resonance' : '颂钵感恩共振'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-amber-200/50 flex items-center gap-1 shadow-2xs">
              <Feather className="w-3 h-3 text-teal-600" />
              <span>{isEn ? 'Radical Surrender' : '全然臣服练习'}</span>
            </span>
          </div>
        </div>

        {/* Enter Sanctuary Button */}
        <button
          type="button"
          onClick={onEnter}
          className="w-full md:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-[#8e6d72] to-[#7e5d62] hover:from-amber-700 hover:to-[#6d4e53] text-white text-xs md:text-sm font-bold font-sans transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2.5 group-hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          id="enter-wisdom-space-btn"
        >
          <span>{isEn ? 'Enter Dedicated Sanctuary' : '点击进入独立空间'}</span>
          <ArrowRight className="w-4 h-4 text-amber-200 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
