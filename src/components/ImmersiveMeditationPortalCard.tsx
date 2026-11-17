import React from 'react';
import { ArrowRight, Wind } from 'lucide-react';

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
      className="p-6 md:p-7 amnd-surface text-left transition-colors duration-200 hover:border-[var(--amnd-border-strong)] group"
      id="immersive-meditation-portal-card"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
            <Wind className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
            <span>{isEn ? 'Stillness Sanctuary · Open Anytime' : '静心空间 · 随时安住当下'}</span>
          </div>

          <h3 className="font-serif text-xl md:text-2xl text-[var(--amnd-text-primary)] font-semibold">
            {isEn ? 'Immersive Stillness & Breath Space' : '沉浸冥想空间 · 呼吸、脉轮与频率同频'}
          </h3>

          <p className="text-xs md:text-[13px] text-[var(--amnd-text-secondary)] leading-relaxed">
            {isEn
              ? 'Enter the quiet meditative realm directly without a preset wish. Includes Universal Abundance guidance, So-Hum & Box breathing rhythms, 7-Chakra alignment, Solfeggio frequencies, and calm voice narration.'
              : '无需预设愿望，一键进入安静的静坐冥想空间：内置宇宙纯净丰盛引导、So-Hum 谐振与方盒呼吸光环、七脉轮交互对齐、396~963Hz 音频共振与舒缓语音朗读。'}
          </p>

          <p className="text-xs text-[var(--amnd-text-muted)] pt-0.5">
            {isEn
              ? '5 Breathing Modes · 7-Chakra Alignment · Solfeggio Frequencies · Sentence Audio Sync'
              : '5 种呼吸节律 · 七脉轮对齐 · Solfeggio 频率 · 逐句点播朗读'}
          </p>
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="w-full md:w-auto px-6 py-3 amnd-btn-primary text-xs md:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
          id="enter-meditation-portal-btn"
        >
          <span>{isEn ? 'Enter Stillness Space' : '进入沉浸冥想'}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
