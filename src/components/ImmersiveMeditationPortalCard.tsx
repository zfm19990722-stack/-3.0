import React from 'react';
import { Sparkles, ArrowRight, Wind, Disc3, Radio, SlidersHorizontal, HeartHandshake, Eye } from 'lucide-react';

interface ImmersiveMeditationPortalCardProps {
  language?: 'zh' | 'en';
  onEnter: () => void;
}

export default function ImmersiveMeditationPortalCard({
  language = 'zh',
  onEnter
}: ImmersiveMeditationPortalCardProps) {
  const isEn = language === 'en';

  return (
    <div
      className="p-6 md:p-8 rounded-[32px] bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-purple-50/80 backdrop-blur-2xl border border-pink-200/70 shadow-xl shadow-pink-100/10 relative overflow-hidden text-left transition-all duration-500 hover:shadow-2xl hover:border-pink-300/90 group"
      id="immersive-meditation-portal-card"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-200/40 via-purple-200/25 to-transparent pointer-events-none rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gradient-to-tr from-rose-200/35 to-transparent pointer-events-none rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10.5px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shadow-xs border border-pink-200/50">
              <Sparkles className="w-3 h-3 text-pink-600 animate-pulse" />
              <span>{isEn ? "Open Anytime • No Wish Needed" : "随时安住 · 无需专有愿望"}</span>
            </span>
            <span className="text-[10px] text-[#8e6d72] font-semibold bg-white/90 px-2.5 py-0.5 rounded-full border border-pink-200/40 shadow-xs">
              {isEn ? "Immersive Sanctuary" : "沉浸显化冥想空间"}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl md:text-2xl text-[#8e6d72] font-bold flex items-center gap-2.5">
            <span className="text-2xl">🧘</span>
            <span>{isEn ? 'Universal Immersive Meditation Space' : '沉浸显化冥想空间 · 宇宙纯净同频'}</span>
          </h3>

          {/* Description */}
          <p className="text-xs text-[#6d5b5e] leading-relaxed">
            {isEn
              ? "Enter the deep meditative realm instantly without requiring a specific wish. Pre-loaded with Universal Cosmic Abundance guidance, So-Hum staged resonance & Box breathing, 7-Chakra interactive alignment, Solfeggio frequencies, and customizable AI narration."
              : "无需填写或选择特定愿望，一键直接进入深度沉浸式冥想殿堂：内置【宇宙源头纯净丰盛】引导心法、So-Hum 阶段谐振/方盒呼吸光环、七脉轮能量同频共振、索尔菲吉奥 396~963Hz 频率发生器与 4 种皇室治愈配音。"}
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-pink-200/50 flex items-center gap-1 shadow-2xs">
              <Wind className="w-3 h-3 text-pink-500" />
              <span>{isEn ? '5 Breathing Modes' : '5大呼吸法'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-pink-200/50 flex items-center gap-1 shadow-2xs">
              <Eye className="w-3 h-3 text-purple-500" />
              <span>{isEn ? '7-Chakra Alignment' : '七脉轮交互对齐'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-pink-200/50 flex items-center gap-1 shadow-2xs">
              <Radio className="w-3 h-3 text-amber-500" />
              <span>{isEn ? 'Solfeggio Hz Generator' : '396~963Hz 频率'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-pink-200/50 flex items-center gap-1 shadow-2xs">
              <Disc3 className="w-3 h-3 text-rose-500" />
              <span>{isEn ? 'Sentence Audio Sync' : '点击句子逐句点播'}</span>
            </span>
            <span className="text-[11px] font-medium text-[#8e6d72] bg-white/80 px-2.5 py-1 rounded-xl border border-pink-200/50 flex items-center gap-1 shadow-2xs">
              <HeartHandshake className="w-3 h-3 text-teal-600" />
              <span>{isEn ? 'Universal Guidance' : '宇宙纯净丰盛引导'}</span>
            </span>
          </div>
        </div>

        {/* Enter Meditation Button */}
        <button
          type="button"
          onClick={onEnter}
          className="w-full md:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-[#8e6d72] via-[#a37980] to-rose-700 hover:from-[#7d5d62] hover:to-rose-800 text-white text-xs md:text-sm font-bold font-sans transition-all shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2.5 group-hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          id="enter-meditation-portal-btn"
        >
          <span>{isEn ? 'Enter Meditation Sanctuary' : '直接进入沉浸冥想'}</span>
          <ArrowRight className="w-4 h-4 text-pink-200 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
