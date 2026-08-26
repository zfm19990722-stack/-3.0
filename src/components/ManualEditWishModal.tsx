import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Heart, DollarSign, Sparkle, Briefcase, Sofa, Check, Eye, Ear, Flower2, HeartHandshake, Gem, RefreshCw } from 'lucide-react';
import { Wish } from '../types';

interface ManualEditWishModalProps {
  isOpen: boolean;
  onClose: () => void;
  wish: Wish;
  language?: 'zh' | 'en';
  onSave: (wishId: string, updatedFields: Partial<Wish>) => void;
}

export default function ManualEditWishModal({
  isOpen,
  onClose,
  wish,
  language = 'zh',
  onSave,
}: ManualEditWishModalProps) {
  const [title, setTitle] = useState(wish.title);
  const [category, setCategory] = useState<Wish['category']>(wish.category);
  const [details, setDetails] = useState(wish.details || '');
  const [visualizationDetails, setVisualizationDetails] = useState(wish.visualizationDetails || '');
  const [visualizationDetailsEn, setVisualizationDetailsEn] = useState(wish.visualizationDetailsEn || '');
  
  const [activeLangTab, setActiveLangTab] = useState<'zh' | 'en'>('zh');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setTitle(wish.title);
    setCategory(wish.category);
    setDetails(wish.details || '');
    setVisualizationDetails(wish.visualizationDetails || '');
    setVisualizationDetailsEn(wish.visualizationDetailsEn || '');
    setSavedSuccess(false);
  }, [wish, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(wish.id, {
      title: title.trim() || wish.title,
      category,
      details: details.trim(),
      visualizationDetails: visualizationDetails.trim(),
      visualizationDetailsEn: visualizationDetailsEn.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const insertTagToVisualization = (tag: string, placeholder: string) => {
    const snippet = `\n\n【${tag}】\n${placeholder}`;
    if (activeLangTab === 'zh') {
      setVisualizationDetails(prev => (prev ? prev.trim() + snippet : `【${tag}】\n${placeholder}`));
    } else {
      setVisualizationDetailsEn(prev => (prev ? prev.trim() + snippet : `【${tag}】\n${placeholder}`));
    }
  };

  const categoryOptions: { id: Wish['category']; labelZh: string; labelEn: string; icon: any }[] = [
    { id: 'love', labelZh: '浪漫情缘', labelEn: 'Love & Harmony', icon: Heart },
    { id: 'wealth', labelZh: '丰盛财富', labelEn: 'Abundance & Wealth', icon: DollarSign },
    { id: 'beauty', labelZh: '健康焕颜', labelEn: 'Beauty & Glow', icon: Sparkle },
    { id: 'career', labelZh: '优雅事业', labelEn: 'Graceful Career', icon: Briefcase },
    { id: 'lifestyle', labelZh: '理想生活', labelEn: 'Royal Lifestyle', icon: Sofa },
  ];

  const SENSORY_SNIPPETS_ZH = [
    { tag: '我期望显化的终极状态', text: '在此刻的实相中，我全然拥有了最丰盛、从容且被爱意包裹的圆满体验。' },
    { tag: '视觉光影景象', text: '温暖的晨光透过落地窗洒在柔软丝缎上，周围一尘不染，折射出如珍珠般的圣洁光芒。' },
    { tag: '声场律动回响', text: '微风拂过窗外的花树，耳畔传来舒缓若有若无的大提琴琴音与清脆鸟鸣，身心彻底放松。' },
    { tag: '香气温度感知', text: '空气中弥漫着新鲜初绽白玫瑰与大吉岭红茶的温润香气，每一次呼吸都是纯然的滋养。' },
    { tag: '触觉体感能量', text: '肌肤触碰着细腻温暖的羊绒，心轮处升起温热充盈的金色光芒，所有紧绷感烟消云散。' },
    { tag: '高配得感誓言', text: '我天生配得拥有宇宙最高维度的丰盛与宠溺，我与一切至美从容同频。' },
  ];

  const SENSORY_SNIPPETS_EN = [
    { tag: 'My Ultimate Manifestation State', text: 'I am effortlessly living my most radiant, peaceful, and fulfilled reality.' },
    { tag: 'Visual Scene & Atmosphere', text: 'Soft golden morning light cascades across velvet carpets and fresh flowers with divine elegance.' },
    { tag: 'Acoustic Resonance', text: 'Gentle breeze whisper and distant tranquil harp melodies soothe every cell into serene bliss.' },
    { tag: 'Aroma & Micro-climate', text: 'The delicate fragrance of fresh roses and warm vanilla tea fills the air with profound comfort.' },
    { tag: 'Somatic Tactile & Peace', text: 'Warm cashmere gently touches the skin as a radiant glow of golden energy warms the heart center.' },
    { tag: 'Affirmation of Worthiness', text: 'I am intrinsically worthy of boundless luxury, love, and effortless miracles.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#fffcfb] via-[#fff5f6] to-[#fcf2f4] rounded-[32px] border border-white/80 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-[#4a3a3a] animate-scaleUp">
        
        {/* Header */}
        <div className="p-5 sm:px-8 border-b border-[#8e6d72]/15 flex items-center justify-between bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f8d7dc] to-[#e4b5be] flex items-center justify-center text-[#8e6d72] shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#8e6d72] flex items-center gap-2">
                <span>{language === 'en' ? '✍️ Manual Edit & Record Wish Details' : '✍️ 手动修改与记录心愿细节'}</span>
              </h2>
              <p className="text-[11px] text-[#b49196] font-medium">
                {language === 'en' 
                  ? 'Freely modify title, description, and multi-sensory manifestation canvas by hand.' 
                  : '支持自由手动输入、修改及记录愿望标题、初始描绘与五感显化画卷。'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#8e6d72]/10 text-gray-400 hover:text-[#8e6d72] transition-colors cursor-pointer"
            id="close-manual-edit-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* Section 1: Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#8e6d72] block uppercase tracking-wider">
                {language === 'en' ? '🕊️ Wish Title' : '🕊️ 心愿主题标题'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={language === 'en' ? 'e.g. English Afternoon Tea in Rose Garden' : '例如：在白玫瑰环绕的花园露台享用英式下午茶'}
                className="w-full text-xs font-bold p-3 rounded-2xl border border-white/60 bg-white/80 text-[#4a3a3a] placeholder-[#b49196]/50 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8e6d72] block uppercase tracking-wider">
                {language === 'en' ? '🎨 Category' : '🎨 心愿分类'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Wish['category'])}
                className="w-full text-xs font-bold p-3 rounded-2xl border border-white/60 bg-white/80 text-[#8e6d72] focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none cursor-pointer"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {language === 'en' ? opt.labelEn : opt.labelZh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Initial Core Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#8e6d72] block uppercase tracking-wider">
                {language === 'en' ? '📝 Initial Description / Desired Feelings' : '📝 心愿初衷描绘 / 期望的心境感受'}
              </label>
              <span className="text-[10px] text-[#b49196]">
                {details.length} {language === 'en' ? 'characters' : '字'}
              </span>
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={language === 'en' ? 'Describe what you want to experience and feel...' : '描述你期望体验到的感受、状态与细节...'}
              rows={3}
              className="w-full text-xs p-3.5 rounded-2xl border border-white/60 bg-white/80 text-[#4a3a3a] placeholder-[#b49196]/50 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none font-sans resize-none"
            />
          </div>

          {/* Section 3: Multi-Sensory Visualization Canvas (Chinese & English) */}
          <div className="space-y-3 pt-2 border-t border-[#8e6d72]/15">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-[#8e6d72] flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'en' ? '🌌 Manifestation Sensory Canvas (Multi-Sensory Details)' : '🌌 显化五感画卷细节 (可手动自由撰写或修改)'}</span>
              </label>

              {/* Language Switcher for Canvas */}
              <div className="flex items-center gap-1 bg-white/60 p-1 rounded-xl border border-[#8e6d72]/20">
                <button
                  type="button"
                  onClick={() => setActiveLangTab('zh')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeLangTab === 'zh'
                      ? 'bg-[#8e6d72] text-white shadow-xs'
                      : 'text-[#8e6d72] hover:bg-white'
                  }`}
                >
                  🇨🇳 中文画卷
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('en')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeLangTab === 'en'
                      ? 'bg-[#8e6d72] text-white shadow-xs'
                      : 'text-[#8e6d72] hover:bg-white'
                  }`}
                >
                  🇬🇧 English Canvas
                </button>
              </div>
            </div>

            {/* Quick Insertion Helpers for 5D Sensory Blocks */}
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-bold text-[#b49196] block">
                {language === 'en' ? '⚡ Click snippet to append 5D sensory template:' : '⚡ 点击快速插入五感模板段落：'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeLangTab === 'zh' ? SENSORY_SNIPPETS_ZH : SENSORY_SNIPPETS_EN).map((snip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertTagToVisualization(snip.tag, snip.text)}
                    className="px-2.5 py-1 rounded-lg text-[10px] bg-white/70 hover:bg-[#8e6d72]/15 text-[#8e6d72] border border-[#8e6d72]/20 transition-all hover:scale-105 active:scale-95 shadow-2xs font-semibold cursor-pointer"
                  >
                    +【{snip.tag}】
                  </button>
                ))}
              </div>
            </div>

            {/* Chinese Canvas Editor */}
            {activeLangTab === 'zh' && (
              <div className="space-y-1">
                <textarea
                  value={visualizationDetails}
                  onChange={(e) => setVisualizationDetails(e.target.value)}
                  placeholder="【我期望显化的终极状态】&#10;在此输入期望显化的终极状态...&#10;&#10;【令我身临其境的感官画面】&#10;在此手动输入视觉、声场、香气、触觉等细节...&#10;&#10;【我的高配得感誓言】&#10;在此输入高配得宣言..."
                  rows={8}
                  className="w-full text-xs p-4 rounded-2xl border border-white/60 bg-white/90 text-[#4a3a3a] placeholder-[#b49196]/40 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none font-sans leading-relaxed custom-scrollbar"
                />
              </div>
            )}

            {/* English Canvas Editor */}
            {activeLangTab === 'en' && (
              <div className="space-y-1">
                <textarea
                  value={visualizationDetailsEn}
                  onChange={(e) => setVisualizationDetailsEn(e.target.value)}
                  placeholder="[My Ultimate Manifestation State]&#10;Describe the ultimate state...&#10;&#10;[Immersive Sensory Imagery]&#10;Describe visual, sound, aroma, and touch details...&#10;&#10;[Affirmation of Absolute Worthiness]&#10;Affirmation..."
                  rows={8}
                  className="w-full text-xs p-4 rounded-2xl border border-white/60 bg-white/90 text-[#4a3a3a] placeholder-[#b49196]/40 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none font-sans leading-relaxed custom-scrollbar"
                />
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-8 border-t border-[#8e6d72]/15 flex items-center justify-between bg-white/50 backdrop-blur-md">
          <div>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fadeIn flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'en' ? '✨ Saved & Recorded Successfully!' : '✨ 心愿细节已手动保存记录！'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-white transition-all cursor-pointer"
            >
              {language === 'en' ? 'Cancel' : '取消'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-[#b49196] to-[#8e6d72] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-pink-900/15 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              id="confirm-manual-save-btn"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{language === 'en' ? '💾 Save & Record Changes' : '💾 保存修改并记录'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
