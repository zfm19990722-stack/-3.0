import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, Volume2, Wand2, Eye, Ear, Flower2, HeartHandshake, Gem, Check, Copy, RefreshCw, X, Radio, ArrowRight } from 'lucide-react';
import { Wish } from '../types';

interface AiSensoryChannelingModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishTitle: string;
  category: 'love' | 'wealth' | 'beauty' | 'career' | 'lifestyle';
  initialText?: string;
  language?: 'zh' | 'en';
  onApplyDetails: (detailsText: string, visualizationText?: string, visualizationTextEn?: string) => void;
}

export type VibeTone = 'princess_royal' | 'nature_zen' | 'modern_luxury' | 'cosmic_ethereal';

export default function AiSensoryChannelingModal({
  isOpen,
  onClose,
  wishTitle,
  category,
  initialText = '',
  language = 'zh',
  onApplyDetails,
}: AiSensoryChannelingModalProps) {
  const [activeTab, setActiveTab] = useState<'channeling' | 'voice_scribe'>('channeling');
  const [vibeTone, setVibeTone] = useState<VibeTone>('princess_royal');
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([
    'visual', 'acoustic', 'aroma', 'tactile', 'worthiness'
  ]);
  const [currentPrompt, setCurrentPrompt] = useState<string>(initialText);
  const [isChanneling, setIsChanneling] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Result states
  const [sensoryResults, setSensoryResults] = useState<{
    visual?: string;
    acoustic?: string;
    aroma?: string;
    tactile?: string;
    worthiness?: string;
  }>({});
  const [autoNarrativeZh, setAutoNarrativeZh] = useState<string>('');
  const [autoNarrativeEn, setAutoNarrativeEn] = useState<string>('');

  // Voice Recording / Dictation states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceInterim, setVoiceInterim] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Quick Inspiration Presets
  const INSPIRATION_PRESETS = language === 'en' ? [
    { title: '✨ Morning Rose Terrace', text: 'Morning sun filtering through rose petals, fine bone china, gentle birdsong' },
    { title: '🌊 Azure Ocean Breeze', text: 'Gentle waves on white sands, crisp warm linen, sea mist and utter peace' },
    { title: '💰 Velvet Fireplace Abundance', text: 'Mahogany study, crackling fireplace amber, steady wealth flowing with dignity' },
    { title: '🕊️ Soulmate Embrace', text: 'Unconditional love, warm eye contact, soft cashmere, profound security' },
    { title: '🌸 Radiant Celestial Glow', text: 'Crystal clear water, youthful rosy vitality, effortlessly luminous posture' },
    { title: '🍵 Chateau Afternoon Tea', text: 'Darjeeling tea aroma, silver teaware, quiet castle balcony overlooking blue lake' },
  ] : [
    { title: '✨ 晨曦白玫瑰露台', text: '晨光穿透晨雾白玫瑰花瓣，描金骨瓷红茶，温柔鸟鸣与安宁' },
    { title: '🌊 蔚蓝海风与白亚麻', text: '海浪轻拍白沙滩，纯白亚麻长裙，清爽海风与彻底的松弛' },
    { title: '💰 奢华壁炉沉香金库', text: '红木书房，壁炉温暖木香，账户数字稳步跃升，从容丰足' },
    { title: '🕊️ 灵魂深层相拥', text: '无条件的深爱与偏爱，深情对视，温暖羊绒，极致安全感' },
    { title: '🌸 水润晶莹神圣焕颜', text: '剔透水晶泉水，水润通透胶原蛋白，优雅挺拔的神圣体态' },
    { title: '🍵 古堡法式悠闲下午茶', text: '大吉岭红茶暖香，精美银器，远眺蓝宝石湖泊，毫无世俗压力' },
  ];

  // Initialize Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'en' ? 'en-US' : 'zh-CN';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalChunk) {
          setVoiceTranscript(prev => (prev ? prev + '，' + finalChunk : finalChunk));
        }
        setVoiceInterim(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg(language === 'en' ? 'Microphone permission denied. Please allow mic access.' : '麦克风权限被拒绝，请在浏览器中允许录音权限。');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setVoiceInterim('');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [language]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setErrorMsg(language === 'en' ? 'Speech recognition is not supported in this browser. Please use Chrome/Safari.' : '当前浏览器暂不支持语音识别接口，推荐使用 Chrome 或 Safari 浏览器。');
      return;
    }

    setErrorMsg(null);
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.lang = language === 'en' ? 'en-US' : 'zh-CN';
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err: any) {
        console.error(err);
        setIsRecording(false);
      }
    }
  };

  const handleChannelDetails = async () => {
    setIsChanneling(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/wish/sense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: wishTitle,
          category,
          currentText: (currentPrompt + ' ' + voiceTranscript).trim(),
          sensoryDimensions: selectedDimensions,
          vibeTone,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(language === 'en' ? 'Sensory channeling request failed' : '感官感应请求失败，请稍后重试');
      }

      const data = await response.json();
      if (data.sensoryChanneling) {
        setSensoryResults(data.sensoryChanneling);
      }
      if (data.autoWrittenNarrative) {
        setAutoNarrativeZh(data.autoWrittenNarrative);
      }
      if (data.autoWrittenNarrativeEn) {
        setAutoNarrativeEn(data.autoWrittenNarrativeEn);
      }
      setSuccessToast(language === 'en' ? '✨ Multi-sensory details intuitively channeled!' : '✨ 五感全息细节已成功感应并自动书写！');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || (language === 'en' ? 'Failed to channel sensory details' : '细节感应失败，请检查网络后重试'));
    } finally {
      setIsChanneling(false);
    }
  };

  const toggleDimension = (dim: string) => {
    if (selectedDimensions.includes(dim)) {
      if (selectedDimensions.length === 1) return; // keep at least one
      setSelectedDimensions(selectedDimensions.filter(d => d !== dim));
    } else {
      setSelectedDimensions([...selectedDimensions, dim]);
    }
  };

  const handleApplyFullNarrative = () => {
    if (!autoNarrativeZh) return;
    onApplyDetails(autoNarrativeZh, autoNarrativeZh, autoNarrativeEn);
    onClose();
  };

  const handleApplySelectedSensory = () => {
    const parts: string[] = [];
    if (sensoryResults.visual) parts.push(`【视觉景象】\n${sensoryResults.visual}`);
    if (sensoryResults.acoustic) parts.push(`【声场律动】\n${sensoryResults.acoustic}`);
    if (sensoryResults.aroma) parts.push(`【香气温度】\n${sensoryResults.aroma}`);
    if (sensoryResults.tactile) parts.push(`【触觉体感】\n${sensoryResults.tactile}`);
    if (sensoryResults.worthiness) parts.push(`【高配得感誓言】\n${sensoryResults.worthiness}`);

    const combined = parts.join('\n\n');
    onApplyDetails(combined, autoNarrativeZh || combined, autoNarrativeEn);
    onClose();
  };

  const handleApplyVoiceToPrompt = () => {
    if (voiceTranscript) {
      setCurrentPrompt(prev => (prev ? prev + '\n' + voiceTranscript : voiceTranscript));
      setVoiceTranscript('');
      setActiveTab('channeling');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#fffcfb] via-[#fff5f6] to-[#fcf2f4] rounded-[32px] border border-white/80 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-[#4a3a3a] animate-scaleUp">
        
        {/* Header */}
        <div className="p-5 sm:px-8 border-b border-[#8e6d72]/15 flex items-center justify-between bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f8d7dc] to-[#e4b5be] flex items-center justify-center text-[#8e6d72] shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#8e6d72] flex items-center gap-2">
                <span>{language === 'en' ? 'AI Sensory Channeling & Auto-Scribe' : 'AI 五感全息感应与自动书写工坊'}</span>
              </h2>
              <p className="text-[11px] text-[#b49196] font-medium">
                {language === 'en' 
                  ? `Intuitively channeling multi-dimensional details for: "${wishTitle || 'My Wish'}"` 
                  : `正在为愿望「${wishTitle || '我的愿望'}」感应五感细节与潜意识显化代码`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#8e6d72]/10 text-gray-400 hover:text-[#8e6d72] transition-colors cursor-pointer"
            id="close-sensory-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 sm:px-8 pt-3 border-b border-[#8e6d72]/10 flex items-center gap-3 bg-white/30">
          <button
            onClick={() => setActiveTab('channeling')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'channeling'
                ? 'border-[#8e6d72] text-[#8e6d72] font-extrabold'
                : 'border-transparent text-[#b49196] hover:text-[#8e6d72]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{language === 'en' ? '🔮 AI Sensory Channeling' : '🔮 AI 五感全息感应'}</span>
          </button>

          <button
            onClick={() => setActiveTab('voice_scribe')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'voice_scribe'
                ? 'border-[#8e6d72] text-[#8e6d72] font-extrabold'
                : 'border-transparent text-[#b49196] hover:text-[#8e6d72]'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
            <span>{language === 'en' ? '🎙️ Voice Auto-Scribe (Mind Flow)' : '🎙️ 语音自动书写 / 灵感流'}</span>
          </button>

          <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{language === 'en' ? 'Auto-Record Enabled' : '实时自动书写记录已开启'}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* Tab 1: Sensory Channeling */}
          {activeTab === 'channeling' && (
            <div className="space-y-6">
              
              {/* Step 1: Vibe Tone Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8e6d72] flex items-center gap-1.5 uppercase tracking-wider">
                  <span>🎨 1. {language === 'en' ? 'Select Atmosphere Resonance Vibe' : '选择感应的显化意境基调'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'princess_royal', label: language === 'en' ? 'Princess Royal' : '👑 高贵公主庄园', desc: language === 'en' ? 'Silk, crystal, rose aroma' : '丝缎、剔透水晶、玫瑰暖茶' },
                    { id: 'nature_zen', label: language === 'en' ? 'Nature Zen' : '🌿 自然静心空灵', desc: language === 'en' ? 'Forest mist, clear spring, breeze' : '山林晨雾、清泉微风、阳光' },
                    { id: 'modern_luxury', label: language === 'en' ? 'Modern Luxury' : '🏙️ 现代轻奢摩登', desc: language === 'en' ? 'Penthouse view, warm amber' : '全景大平层、高定沉香木' },
                    { id: 'cosmic_ethereal', label: language === 'en' ? 'Cosmic Ethereal' : '✨ 高维宇宙光能', desc: language === 'en' ? 'Golden celestial, wholeness' : '金粉色光芒、本自具足' },
                  ].map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVibeTone(v.id as VibeTone)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        vibeTone === v.id
                          ? 'bg-white border-[#8e6d72] shadow-md shadow-pink-900/5 scale-[1.02]'
                          : 'bg-white/40 border-white/60 hover:bg-white/70 text-[#6d5b5e]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#8e6d72]">{v.label}</div>
                      <div className="text-[10px] text-[#b49196] mt-1 leading-snug">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Sensory Dimensions to Channel */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8e6d72] flex items-center gap-1.5 uppercase tracking-wider">
                  <span>⚡ 2. {language === 'en' ? 'Sensory Resonance Channels' : '勾选需要 AI 重点感应的五感维度'}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'visual', label: language === 'en' ? '👁️ Visual Scene' : '👁️ 视觉光影景象', icon: Eye },
                    { id: 'acoustic', label: language === 'en' ? '👂 Acoustic Field' : '👂 声场律动回响', icon: Ear },
                    { id: 'aroma', label: language === 'en' ? '👃 Aroma & Temp' : '👃 香气与温度', icon: Flower2 },
                    { id: 'tactile', label: language === 'en' ? '🤲 Somatic Tactile' : '🤲 触觉与体感放松', icon: HeartHandshake },
                    { id: 'worthiness', label: language === 'en' ? '💎 High Worthiness' : '💎 潜意识配得誓言', icon: Gem },
                  ].map(d => {
                    const isSelected = selectedDimensions.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDimension(d.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isSelected
                            ? 'bg-[#8e6d72] text-white border-[#8e6d72] shadow-sm scale-105'
                            : 'bg-white/50 text-[#8e6d72] border-[#8e6d72]/20 hover:bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Quick Inspiration Resonance Chips */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#b49196] block uppercase tracking-wider">
                  {language === 'en' ? '💡 Click Inspiration Bubble to Infuse Clues:' : '💡 点击灵感气泡快速注入感官线索：'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {INSPIRATION_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCurrentPrompt(prev => prev ? `${prev}，${p.text}` : p.text);
                      }}
                      className="px-3 py-1.5 rounded-full text-[11px] bg-white/60 hover:bg-[#8e6d72]/10 text-[#8e6d72] border border-[#8e6d72]/20 transition-all hover:scale-105 active:scale-95 shadow-xs font-medium cursor-pointer"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Sensory Input Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8e6d72] block">
                    {language === 'en' ? '🕊️ Heart Intent / Clue Keywords:' : '🕊️ 愿望心念 / 灵感线索（即使只写几个字，AI 也会自动全息具象化）：'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('voice_scribe')}
                    className="text-[10px] text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Mic className="w-3 h-3" />
                    <span>{language === 'en' ? 'Switch to Voice Dictation' : '切换至语音倾诉'}</span>
                  </button>
                </div>
                <textarea
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. drinking hot tea on a sunlit balcony, receiving 100,000 effortlessly...' : '例如：在洒满阳光的阳台喝热红茶，金钱与礼物轻松涌入，心情无比安适轻松...'}
                  rows={3}
                  className="w-full text-xs p-3.5 rounded-2xl border border-white/60 bg-white/70 text-[#4a3a3a] placeholder-[#b49196]/50 focus:ring-2 focus:ring-[#8e6d72]/30 focus:outline-none resize-none font-sans"
                />
              </div>

              {/* Action: Trigger AI Sensory Channeling */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleChannelDetails}
                  disabled={isChanneling}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#b49196] via-[#8e6d72] to-[#6d5055] text-white text-xs font-bold shadow-lg shadow-pink-900/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  id="trigger-ai-channel-btn"
                >
                  <Wand2 className={`w-4 h-4 ${isChanneling ? 'animate-spin' : 'animate-bounce'}`} />
                  <span>
                    {isChanneling 
                      ? (language === 'en' ? 'AI Channeling 5D Sensory Details...' : '✨ AI 全息五感感应与自动书写中...')
                      : (language === 'en' ? '✨ Channel Sensory Details with AI' : '✨ 启动 AI 全息五感感应与自动书写')}
                  </span>
                </button>
                
                {successToast && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fadeIn">
                    {successToast}
                  </span>
                )}
                {errorMsg && (
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 animate-pulse">
                    {errorMsg}
                  </span>
                )}
              </div>

              {/* Result Area: Channeled Sensory Details */}
              {(sensoryResults.visual || autoNarrativeZh) && (
                <div className="space-y-4 pt-4 border-t border-[#8e6d72]/15 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-sm text-[#8e6d72] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{language === 'en' ? 'Channeled Sensory Dimensions:' : '🌌 AI 感应出的五维画卷细节：'}</span>
                    </h3>
                    <span className="text-[10px] text-[#b49196] font-medium">
                      {language === 'en' ? 'Click below to apply to your wish' : '可直接保存并应用到愿望'}
                    </span>
                  </div>

                  {/* 5 Dimensional Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sensoryResults.visual && (
                      <div className="p-3.5 rounded-2xl bg-white/70 border border-white/60 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8e6d72]">
                          <Eye className="w-3.5 h-3.5 text-amber-500" />
                          <span>{language === 'en' ? 'Visual Scenery & Light' : '👁️ 视觉光影景象'}</span>
                        </div>
                        <p className="text-xs text-[#6d5b5e] leading-relaxed italic">{sensoryResults.visual}</p>
                      </div>
                    )}

                    {sensoryResults.acoustic && (
                      <div className="p-3.5 rounded-2xl bg-white/70 border border-white/60 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8e6d72]">
                          <Ear className="w-3.5 h-3.5 text-purple-500" />
                          <span>{language === 'en' ? 'Acoustic Resonance' : '👂 声场律动回响'}</span>
                        </div>
                        <p className="text-xs text-[#6d5b5e] leading-relaxed italic">{sensoryResults.acoustic}</p>
                      </div>
                    )}

                    {sensoryResults.aroma && (
                      <div className="p-3.5 rounded-2xl bg-white/70 border border-white/60 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8e6d72]">
                          <Flower2 className="w-3.5 h-3.5 text-pink-500" />
                          <span>{language === 'en' ? 'Aroma & Micro-climate' : '👃 香气与温度感知'}</span>
                        </div>
                        <p className="text-xs text-[#6d5b5e] leading-relaxed italic">{sensoryResults.aroma}</p>
                      </div>
                    )}

                    {sensoryResults.tactile && (
                      <div className="p-3.5 rounded-2xl bg-white/70 border border-white/60 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8e6d72]">
                          <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                          <span>{language === 'en' ? 'Somatic Tactile & Relaxation' : '🤲 触觉与身心放松'}</span>
                        </div>
                        <p className="text-xs text-[#6d5b5e] leading-relaxed italic">{sensoryResults.tactile}</p>
                      </div>
                    )}

                    {sensoryResults.worthiness && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-amber-300/40 shadow-xs space-y-1 col-span-1 md:col-span-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                          <Gem className="w-3.5 h-3.5 text-amber-600" />
                          <span>{language === 'en' ? 'Divine Affirmation of Worthiness' : '💎 潜意识高配得感誓言'}</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed font-bold italic">{sensoryResults.worthiness}</p>
                      </div>
                    )}
                  </div>

                  {/* Auto-Written Full Narrative Preview */}
                  {autoNarrativeZh && (
                    <div className="p-4 rounded-2xl bg-white/80 border border-[#8e6d72]/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#8e6d72]">
                          {language === 'en' ? '📜 Auto-Written Manifestation Script:' : '📜 一键自动书写显化画卷文本：'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(autoNarrativeZh);
                            setSuccessToast(language === 'en' ? 'Copied to clipboard' : '已复制到剪贴板');
                            setTimeout(() => setSuccessToast(null), 2500);
                          }}
                          className="text-[10px] font-bold text-[#8e6d72] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{language === 'en' ? 'Copy Text' : '复制文本'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-[#4a3a3a] leading-relaxed font-sans whitespace-pre-line bg-white/60 p-3 rounded-xl border border-white/60 max-h-48 overflow-y-auto custom-scrollbar">
                        {autoNarrativeZh}
                      </div>
                    </div>
                  )}

                  {/* Apply Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleApplySelectedSensory}
                      className="px-4.5 py-2 rounded-full border border-[#8e6d72]/30 text-[#8e6d72] text-xs font-semibold hover:bg-white/60 transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Insert 5D Sensory Cards' : '分段填入感官细节卡'}
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyFullNarrative}
                      className="px-6 py-2 rounded-full bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white text-xs font-bold shadow-md shadow-pink-900/10 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{language === 'en' ? '✨ Save & Auto-Write to Wish' : '✨ 一键注入愿望并自动保存记录'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Voice Auto-Scribe */}
          {activeTab === 'voice_scribe' && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <div className="inline-flex p-4 rounded-full bg-pink-100/50 text-[#8e6d72] border border-pink-200 shadow-inner">
                  <Mic className={`w-8 h-8 ${isRecording ? 'text-rose-600 animate-ping' : 'text-[#8e6d72]'}`} />
                </div>
                <h3 className="font-serif font-bold text-base text-[#8e6d72]">
                  {language === 'en' ? '🎙️ Voice Auto-Scribing & Heart Stream' : '🎙️ 语音自动书写 / 意识流倾诉'}
                </h3>
                <p className="text-xs text-[#6d5b5e] leading-relaxed">
                  {language === 'en' 
                    ? 'Speak freely about how you want to feel, what you want to experience, and the sounds or sights you imagine. The AI will transcribe and auto-record your words in real time.'
                    : '无需拘泥格式，请像和最懂你的闺蜜/宇宙倾诉一样，自由说出你渴望实现的场景、温度、心情与细节，系统将实时转写并自动记录保存。'}
                </p>
              </div>

              {/* Record Button & Status */}
              <div className="flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-8 py-3.5 rounded-full font-bold text-xs flex items-center gap-2.5 transition-all shadow-lg cursor-pointer ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse shadow-rose-900/20 scale-105'
                      : 'bg-[#8e6d72] text-white hover:bg-[#8e6d72]/90 hover:scale-105 active:scale-95 shadow-pink-900/15'
                  }`}
                  id="toggle-voice-recording-btn"
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>
                    {isRecording 
                      ? (language === 'en' ? 'Stop Listening & Finalize' : '⏹️ 停止录音并整理') 
                      : (language === 'en' ? '🎙️ Start Speaking (Auto-Scribe)' : '🎙️ 开始倾诉录音 (自动书写)')}
                  </span>
                </button>

                {isRecording && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{language === 'en' ? 'Listening closely to your heart...' : '正在倾听您的心声，实时转写中...'}</span>
                  </div>
                )}
              </div>

              {/* Live Transcript Display */}
              <div className="p-4 rounded-2xl bg-white/80 border border-white/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#8e6d72]">
                  <span>{language === 'en' ? '📝 Real-time Auto-Recorded Script:' : '📝 实时自动记录的文字内容：'}</span>
                  {voiceTranscript && (
                    <button
                      type="button"
                      onClick={() => setVoiceTranscript('')}
                      className="text-[10px] text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      {language === 'en' ? 'Clear' : '清空'}
                    </button>
                  )}
                </div>
                <div className="min-h-[100px] max-h-[160px] p-3 rounded-xl bg-white/70 border border-gray-100 text-xs text-[#4a3a3a] leading-relaxed overflow-y-auto custom-scrollbar">
                  {voiceTranscript || voiceInterim ? (
                    <div>
                      <span>{voiceTranscript}</span>
                      {voiceInterim && <span className="text-pink-500 italic ml-1"> {voiceInterim}...</span>}
                    </div>
                  ) : (
                    <span className="text-[#b49196]/50 italic">
                      {language === 'en' 
                        ? 'Click the button above and speak... Your voice will be transcribed into text right here.' 
                        : '点击上方录音按钮，自由倾诉你的愿望... 语音将在此处实时自动转写为文字。'}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleApplyVoiceToPrompt}
                  disabled={!voiceTranscript}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#b49196] to-[#8e6d72] text-white text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Infuse into AI Sensory Channeling' : '填入并让 AI 进行五感升华'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-8 border-t border-[#8e6d72]/15 flex items-center justify-between bg-white/40 backdrop-blur-md">
          <div className="text-[10px] text-[#b49196] font-medium flex items-center gap-1">
            <span>✨</span>
            <span>{language === 'en' ? 'Powered by Gemini AI Multi-Sensory Resonance Engine' : '由 Gemini AI 五感全息共振引擎驱动'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-white transition-all cursor-pointer"
          >
            {language === 'en' ? 'Close' : '关闭'}
          </button>
        </div>

      </div>
    </div>
  );
}
