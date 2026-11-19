import { useState, useEffect, useRef } from 'react';
import UserSyncBar from './components/UserSyncBar';
import ShareAppModal from './components/ShareAppModal';
import { Wish, MusicTrack, VisualBackground, VisualBackgroundType } from './types';
import VisualizationBackground from './components/VisualizationBackground';
import AudioPlayer from './components/AudioPlayer';
import { ChakraVisualizer } from './components/ChakraVisualizer';
import { BreathingRingWithParticles } from './components/BreathingRingWithParticles';
import HomePage, { PrimaryViewId } from './components/pages/HomePage';
import WisdomPage from './components/pages/WisdomPage';
import TemplePage from './components/pages/TemplePage';
import StillnessPage from './components/pages/StillnessPage';
import ManifestationPage from './components/pages/ManifestationPage';
import MySpacePage from './components/pages/MySpacePage';
import {
  Home,
  BookOpen,
  Compass,
  Wind,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Play,
  Pause,
  SlidersHorizontal
} from 'lucide-react';

const BACKGROUNDS_THEMES: VisualBackground[] = [
  {
    id: 'sparkling-sky',
    name: '金色星空',
    nameEn: 'Golden Starlight',
    emoji: '✨',
    primaryColor: '#FFFDF9',
    secondaryColor: '#FFF5E6',
    textColor: 'text-amber-900',
    glowColor: 'amber-400'
  },
  {
    id: 'royal-garden',
    name: '玫瑰花海',
    nameEn: 'Rose Garden',
    emoji: '🌸',
    primaryColor: '#FFF5F5',
    secondaryColor: '#FFE3E3',
    textColor: 'text-rose-900',
    glowColor: 'pink-400'
  },
  {
    id: 'glowing-crystal',
    name: '梦幻冰晶',
    nameEn: 'Dreamy Crystals',
    emoji: '💎',
    primaryColor: '#F0F9FF',
    secondaryColor: '#E0F2FE',
    textColor: 'text-sky-900',
    glowColor: 'sky-400'
  },
  {
    id: 'dreamy-cloud',
    name: '落日晚霞',
    nameEn: 'Sunset Clouds',
    emoji: '🍑',
    primaryColor: '#FFF7ED',
    secondaryColor: '#FFE4E6',
    textColor: 'text-pink-950',
    glowColor: 'amber-300'
  },
];

const GRATITUDE_WHISPERS = [
  "感谢宇宙的指引，感谢当下深沉的静谧，万物已在我的呼吸中完美显现。",
  "感恩我的身心，感恩我拥有接纳爱与财富的无限容器，一切的美好均是应许之物。",
  "怀着深深的感恩，我将意图托付给浩瀚的宇宙。我深信，所有发生皆是最好的安排。",
  "谢谢每一个清晨与暮色，谢谢流淌在我生命中的爱，一切丰盛正以其最完美的方式绽放。",
  "感恩这一刻的全然放松，我以喜悦之心接纳生命给予的每一份精致礼物。"
];

const GRATITUDE_WHISPERS_EN = [
  "Thank you, universe, for your divine guidance and deep peace. All is perfectly manifesting in my breath.",
  "I am deeply grateful for my body and mind, an infinite vessel of love and abundance. All beauty belongs to me.",
  "With deep gratitude, I trust my intentions to the universe. Everything is unfolding in perfect order.",
  "Thank you for every morning and night, and the love flowing through me. Abundance blooms beautifully.",
  "Grateful for this moment of deep release. I receive every elegant gift of life with absolute joy."
];

export const DEFAULT_UNIVERSAL_WISH: Wish = {
  id: 'universal-cosmic-abundance-meditation',
  title: '✨ 宇宙源头纯净丰盛与内在真我同频冥想',
  category: 'lifestyle',
  details: '进入内在无限宁静的觉知殿堂，与宇宙源头的无穷丰盛、喜悦与平静融为一体。在此刻无需向外追寻，你本自具足。',
  visualizationDetails: '闭上双眼，将注意力轻轻带回温热的呼吸。感受一道温润柔和的金粉色宇宙源头光芒，从头顶百会穴如丝绸般倾泻而下，滋养着全身每一个细胞。在深沉绵长的呼吸中，释放掉过去所有的紧绷与匮乏念头。你就是无边无际的觉知本身，丰盛、健康、喜悦与无限可能，早已在此时此刻与你完全合一。',
  visualizationDetailsEn: 'Gently close your eyes and bring your gentle attention to the warmth of your breath. Feel a soft, luminous golden-rose celestial light descending like pure silk from the crown of your head, illuminating and soothing every cell within your body. With every effortless breath, release all striving and perceived lack into the infinite space. You are timeless consciousness itself—pure abundance, wholeness, peace, and boundless vitality are already here within you.',
  isManifested: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PREBUILT_MUSIC: MusicTrack[] = [
  { id: 'princess-synth', name: '✨ 圣洁公主琴音 (Web 实时合成)', nameEn: '✨ Sacred Princess Chords (Web Synth)', url: '' },
  { id: 'track-rose', name: '🎵 玫瑰古堡钢琴曲 (舒适冥想)', nameEn: '🎵 Rose Castle Piano (Comfort Meditation)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'track-ambient', name: '🎵 水晶风铃之歌 (空灵声场)', nameEn: '🎵 Crystal Chimes Symphony (Ethereal Sound)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

interface SentenceSegment {
  text: string;
  startIndex: number;
  fullTextFromHere: string;
}

const getSentenceSegments = (text: string): SentenceSegment[] => {
  if (!text) return [];
  // Split by sentence terminators (Chinese and English) or newlines, keeping the punctuation
  const rawSegments = text.split(/(?<=[。！？\n])|(?<=[.!?]\s+)/).filter(Boolean);
  
  let accumulatedIndex = 0;
  return rawSegments.map((segment) => {
    const startIndex = accumulatedIndex;
    accumulatedIndex += segment.length;
    return {
      text: segment,
      startIndex,
      fullTextFromHere: text.slice(startIndex)
    };
  });
};

export default function App() {
  const [currentView, setCurrentView] = useState<PrimaryViewId>('home');
  const [templeReturnView, setTempleReturnView] = useState<PrimaryViewId>('home');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isGeneratingMap, setIsGeneratingMap] = useState<Record<string, boolean>>({});
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(PREBUILT_MUSIC[0]);
  const [tracks, setTracks] = useState<MusicTrack[]>(PREBUILT_MUSIC);
  const [visualBg, setVisualBg] = useState<VisualBackgroundType>('royal-garden');

  // Background CSS Filter states
  const [bgSaturation, setBgSaturation] = useState<number>(100); // 0% to 200%
  const [bgBrightness, setBgBrightness] = useState<number>(100); // 50% to 150%
  const [bgBlur, setBgBlur] = useState<number>(0); // 0px to 15px
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [showMobileTools, setShowMobileTools] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Lifted AudioPlayer states
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);

  // Meditation Countdown Timer states
  const [timerDuration, setTimerDuration] = useState<number>(10 * 60); // Default 10 minutes in seconds
  const [timerRemaining, setTimerRemaining] = useState<number>(10 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showFinishedOverlay, setShowFinishedOverlay] = useState<boolean>(false);
  
  // Immersive active session wish
  const [activeWishSession, setActiveWishSession] = useState<Wish | null>(null);
  const [activeSessionLang, setActiveSessionLang] = useState<'zh' | 'en'>('zh');
  
  // Breathing presets
  const breathingPatterns = [
    { id: 'sohum', name: language === 'en' ? 'SoHum Resonance' : 'SoHum 谐振呼吸', code: '1分6次->1分5次', type: 'mantra', inhale: 5, holdIn: 0, exhale: 5, holdOut: 0, desc: language === 'en' ? 'Dr. Jan: 1 min 6 breaths (5s So / 5s Hum) -> 1 min 5 breaths (6s So / 6s Hum)' : '杨定一博士推荐：第1分钟6次(5s So吸/5s Hum呼)，第2分钟5次(6s So吸/6s Hum呼)，深层同频宇宙谐振' },
    { id: 'box-4-4-4-4', name: language === 'en' ? 'Box Breathing' : '方盒平衡呼吸', code: '4-4-4-4', type: 'box', inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, desc: language === 'en' ? 'Symmetrical clarity, calm racing thoughts' : '均衡清明，安定思绪' },
    { id: 'box-4-6-4-6', name: language === 'en' ? 'Deep Relaxation' : '方盒深层呼吸', code: '4-6-4-6', type: 'box', inhale: 4, holdIn: 6, exhale: 4, holdOut: 6, desc: language === 'en' ? 'Deep release, let go of pressure' : '深沉放松，放空压力' },
    { id: 'box-4-8-4-8', name: language === 'en' ? 'Transcendental Flow' : '方盒超频呼吸', code: '4-8-4-8', type: 'box', inhale: 4, holdIn: 8, exhale: 4, holdOut: 8, desc: language === 'en' ? 'Ignite potential, raise consciousness' : '激发潜能，意识升华' },
    { id: 'rebirthing', name: language === 'en' ? 'Rebirthing Breath' : '重生呼吸法', code: '2-0-2-0', type: 'circular', inhale: 2, holdIn: 0, exhale: 2, holdOut: 0, desc: language === 'en' ? 'Continuous circular flow, release subconscious blockages' : '连贯循环呼吸，不带停顿，释放深层创伤与潜意识束缚' },
  ];
  const [selectedPatternId, setSelectedPatternId] = useState<string>('sohum');
  const [breathingText, setBreathingText] = useState<string>('吸气...');
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');

  // SOHUM Advanced Staged Flow states (1分6次 -> 1分5次)
  const [sohumStageMode, setSohumStageMode] = useState<'auto' | 'stage1' | 'stage2'>('auto');
  const [sohumCurrentStage, setSohumCurrentStage] = useState<1 | 2>(1);
  const [sohumCycleCount, setSohumCycleCount] = useState<number>(1);
  const [sohumElapsedSeconds, setSohumElapsedSeconds] = useState<number>(0);

  const currentPattern = breathingPatterns.find(p => p.id === selectedPatternId) || breathingPatterns[0];

  // Speaking state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingLoading, setIsSpeakingLoading] = useState(false);
  const [speakingStartIndex, setSpeakingStartIndex] = useState<number | null>(null);
  const [voiceTone, setVoiceTone] = useState<'deep-female' | 'royal-lady' | 'magnetic-male' | 'grounding-male'>('deep-female');

  // Solfeggio continuous synth states
  const [meditationSoundType, setMeditationSoundType] = useState<'ambient' | 'solfeggio'>('ambient');
  const [solfeggioFrequency, setSolfeggioFrequency] = useState<number>(528);
  const [solfeggioVolume, setSolfeggioVolume] = useState<number>(0.3);
  const [isBackgroundAudioEnabled, setIsBackgroundAudioEnabled] = useState<boolean>(false);

  // Refs for continuous Solfeggio sound
  const solfeggioAudioCtxRef = useRef<AudioContext | null>(null);
  const breathingAudioCtxRef = useRef<AudioContext | null>(null);
  const solfeggioOscsRef = useRef<OscillatorNode[]>([]);
  const solfeggioGainRef = useRef<GainNode | null>(null);

  const activeAudioSourceRef = useRef<AudioContext | null>(null);
  const activeGainNodeRef = useRef<GainNode | null>(null);
  const currentSpeechSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Load wishes from Local Storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('princess_manifestation_wishes') || localStorage.getItem('lumiere_wishes_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWishes(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved wishes:', e);
      }
    }
    // Default seed wish
    const sampleWish: Wish = {
      id: 'sample-1',
      title: '在白玫瑰环绕的花园露台享用英式下午茶',
      category: 'lifestyle',
      details: '想要有一个阳光明媚的下午，周围开满了清香的白玫瑰。桌上有精美的描金瓷器，摆满司康和慕斯。微风轻拂裙摆，内心只有平静、高贵与深深的满足。',
      visualizationDetails: '晨曦如薄纱般温柔地披在你的天鹅绒睡裙上，空气里氤氲着栀子花与刚采摘的玫瑰清香。你轻轻落座于铺满繁复蕾丝的露台前，捧起描绘着细腻金边的大吉岭红茶。银器在暖阳下折射出优雅璀璨的华光。在这一刻，世俗的喧嚣与焦虑尽数消散，宇宙无限的宠爱与丰盛正如同这温暖的和风，毫无保留地涌入你的生命，你的身心已被彻底的尊贵、富足与深度安宁所包裹。',
      visualizationDetailsEn: '【Visual Scene】\nGentle morning light softly caresses your velvet dress as the air drifts with the scent of gardenias and freshly-picked white roses. You sit before the rose terrace, holding a fine-rimmed porcelain cup of Darjeeling tea as the silver tableware glimmers in the sun.\n\n【Acoustics & Aroma】\nThe gentle whisper of the breeze through the roses harmonizes with the soft chime of distant bells. The steam of tea rises with a tranquil rose aroma.\n\n【Body & Mind Energy】\nIn this sacred moment, all secular worries completely fade. You are surrounded by the deep, warm, and loving protective field of the universe, feeling infinitely cherished, secure, and profoundly rich.',
      isManifested: false,
      createdAt: new Date().toISOString(),
    };
    setWishes([sampleWish]);
    localStorage.setItem('princess_manifestation_wishes', JSON.stringify([sampleWish]));
  }, []);

  // Pure Local Storage persistence helper
  const saveWishesToStorage = (newWishes: Wish[]) => {
    setWishes(newWishes);
    try {
      localStorage.setItem('princess_manifestation_wishes', JSON.stringify(newWishes));
      localStorage.setItem('lumiere_wishes_v1', JSON.stringify(newWishes));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  const handleAddWish = async (newWish: Omit<Wish, 'id' | 'createdAt' | 'isManifested'>) => {
    const wish: Wish = {
      ...newWish,
      id: `wish-${Date.now()}`,
      isManifested: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [wish, ...wishes];
    saveWishesToStorage(updated);
  };

  const handleDeleteWish = async (id: string) => {
    const filtered = wishes.filter(w => w.id !== id);
    saveWishesToStorage(filtered);
    if (activeWishSession?.id === id) {
      handleExitManifestationSession();
    }
  };

  const handleAddCustomTrack = (track: MusicTrack) => {
    setTracks([...tracks, track]);
  };

  // Generate detailed visual scenario with Gemini API
  const handleGenerateDetails = async (id: string, mode: 'overwrite' | 'append' = 'overwrite', refinePrompt?: string) => {
    const targetWish = wishes.find(w => w.id === id);
    if (!targetWish) return;

    setIsGeneratingMap(prev => ({ ...prev, [id]: true }));

    try {
      const response = await fetch('/api/affirmations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetWish.title,
          details: targetWish.details,
          category: targetWish.category,
          mode,
          existingDetails: mode === 'append' ? targetWish.visualizationDetails : undefined,
          existingDetailsEn: mode === 'append' ? targetWish.visualizationDetailsEn : undefined,
          refinePrompt,
        }),
      });

      if (!response.ok) {
        let errMsg = 'Server returned error when generating details';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      
      const updatedWishes = wishes.map(w => {
        if (w.id === id) {
          let nextDetails = result.visualizationText;
          let nextDetailsEn = result.visualizationTextEn;

          if (mode === 'append' && w.visualizationDetails) {
            nextDetails = `${w.visualizationDetails}\n\n${result.visualizationText}`;
            nextDetailsEn = w.visualizationDetailsEn 
              ? `${w.visualizationDetailsEn}\n\n${result.visualizationTextEn}` 
              : result.visualizationTextEn;
          }

          return {
            ...w,
            visualizationDetails: nextDetails,
            visualizationDetailsEn: nextDetailsEn,
          };
        }
        return w;
      });

      saveWishesToStorage(updatedWishes);

    } catch (err) {
      console.error('Failed to generate manifestation scenario:', err);
    } finally {
      setIsGeneratingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleUpdateWish = (id: string, updatedFields: Partial<Wish>) => {
    const updatedWishes = wishes.map(w => {
      if (w.id === id) {
        return { ...w, ...updatedFields };
      }
      return w;
    });
    saveWishesToStorage(updatedWishes);
  };

  // Text-To-Speech Playback
  const fadeOutAndStopPrevious = (fadeOutDuration = 0.5) => {
    const prevGainNode = activeGainNodeRef.current;
    const prevCtx = activeAudioSourceRef.current;
    const prevSource = currentSpeechSourceRef.current;

    if (prevGainNode && prevCtx) {
      try {
        const now = prevCtx.currentTime;
        // Smoothly fade out the gain
        prevGainNode.gain.setValueAtTime(prevGainNode.gain.value, now);
        prevGainNode.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
        
        // Capture local copies to clean up after fadeOutDuration
        setTimeout(() => {
          try {
            prevSource?.stop();
            prevCtx.close();
          } catch (e) {
            // Context might already be closed
          }
        }, fadeOutDuration * 1000 + 50);
      } catch (e) {
        try {
          prevSource?.stop();
          prevCtx.close();
        } catch (err) {}
      }
    } else {
      if (prevSource) {
        try { prevSource.stop(); } catch (e) {}
      }
      if (prevCtx) {
        try { prevCtx.close(); } catch (e) {}
      }
    }

    activeGainNodeRef.current = null;
    activeAudioSourceRef.current = null;
    currentSpeechSourceRef.current = null;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleSpeakText = async (text: string, toneOverride?: 'deep-female' | 'royal-lady' | 'magnetic-male' | 'grounding-male') => {
    // Fade out previous audio instead of cutting off abruptly to create a gorgeous cross-fade
    fadeOutAndStopPrevious(0.5);
    setIsSpeakingLoading(true);

    const activeTone = toneOverride || voiceTone;

    // Map voiceTone to Gemini Voice Name
    const ttsVoiceMap = {
      'deep-female': 'Zephyr',
      'royal-lady': 'Kore',
      'magnetic-male': 'Charon',
      'grounding-male': 'Fenrir'
    };
    const selectedVoiceName = ttsVoiceMap[activeTone] || 'Zephyr';

    try {
      // 1. Fetch from Gemini TTS server endpoint
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: selectedVoiceName }),
      });

      if (!response.ok) {
        throw new Error('TTS server error. Falling back to browser synthesis.');
      }

      const data = await response.json();
      if (!data.audio) {
        throw new Error('TTS response missing audio data.');
      }

      // 2. Decode raw signed 16-bit little endian PCM 24000Hz
      const base64Data = data.audio;
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const numSamples = len / 2;
      const float32Samples = new Float32Array(numSamples);
      const dataView = new DataView(bytes.buffer);
      
      for (let i = 0; i < numSamples; i++) {
        const sample = dataView.getInt16(i * 2, true);
        float32Samples[i] = sample / 32768; // normalize
      }
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      activeAudioSourceRef.current = audioCtx;
      
      const buffer = audioCtx.createBuffer(1, numSamples, 24000);
      buffer.copyToChannel(float32Samples, 0);
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      
      // Create a GainNode for smooth fade transitions
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      activeGainNodeRef.current = gainNode;
      currentSpeechSourceRef.current = source;
      setIsSpeakingLoading(false);
      setIsSpeaking(true);

      source.onended = () => {
        if (currentSpeechSourceRef.current === source) {
          setIsSpeaking(false);
          currentSpeechSourceRef.current = null;
          setSpeakingStartIndex(null);
        }
      };

      source.start(0);

    } catch (err) {
      console.warn("Gemini TTS was offline or not configured. Using high-quality offline SpeechSynthesis fallback:", err);
      
      // Fallback: Browser Web Speech API
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const isEnglish = /[a-zA-Z]{4,}/.test(text);
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        if (isEnglish) {
          const enVoices = voices.filter(v => v.lang.includes('en') || v.lang.includes('EN'));
          if (enVoices.length > 0) {
            const sweetVoice = enVoices.find(v => 
              v.name.toLowerCase().includes('google us english') ||
              v.name.toLowerCase().includes('samantha') || 
              v.name.toLowerCase().includes('hazel') ||
              v.name.toLowerCase().includes('female')
            );
            utterance.voice = sweetVoice || enVoices[0];
          }
        } else {
          // Match standard Chinese voices
          const zhVoices = voices.filter(v => v.lang.includes('zh') || v.lang.includes('ZH'));
          if (zhVoices.length > 0) {
            const femaleVoice = zhVoices.find(v => 
              v.name.toLowerCase().includes('xiaoxiao') || 
              v.name.toLowerCase().includes('tingting') ||
              v.name.toLowerCase().includes('female')
            );
            utterance.voice = femaleVoice || zhVoices[0];
          }
        }

        // Set pitch and rate based on voice tone selection
        if (activeTone === 'royal-lady') {
          utterance.rate = 0.68; // Calm, majestic, slow
          utterance.pitch = 0.95; // Warm royal lady
        } else if (activeTone === 'magnetic-male') {
          utterance.rate = 0.76;
          utterance.pitch = 0.7;
        } else if (activeTone === 'grounding-male') {
          utterance.rate = 0.7;
          utterance.pitch = 0.6;
        } else {
          // deep-female (default)
          utterance.rate = 0.78;
          utterance.pitch = 0.85;
        }
        
        utterance.onend = () => {
          setIsSpeaking(false);
          setIsSpeakingLoading(false);
          setSpeakingStartIndex(null);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setIsSpeakingLoading(false);
          setSpeakingStartIndex(null);
        };
        
        setIsSpeakingLoading(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeakingLoading(false);
        alert("您的浏览器不支持语音播放，已为您进行沉浸式文字展示。");
      }
    }
  };

  const handleStopSpeaking = () => {
    setIsSpeaking(false);
    setIsSpeakingLoading(false);
    setSpeakingStartIndex(null);
    fadeOutAndStopPrevious(0.35); // Smoothly fade out previous speech in 350ms
  };

  const [breathingCountdown, setBreathingCountdown] = useState<number>(4);
  const [selectedGratitudeWhisper, setSelectedGratitudeWhisper] = useState<string>('');

  const playBreathingPhaseSound = (phase: 'inhale' | 'holdIn' | 'exhale' | 'holdOut') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      if (!breathingAudioCtxRef.current) {
        breathingAudioCtxRef.current = new AudioContextClass();
      }
      const ctx = breathingAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      
      if (phase === 'inhale') {
        // --- INHALE: Crisp Crystal Singing Bowl / Sacred Chime (清脆空灵的水晶颂钵/引磬之声) ---
        // Crystal-clear frequencies with pure upper harmonic partials and natural acoustic shimmer
        const masterGain = ctx.createGain();

        // 1. Initial Crystal Mallet Strike Transient (清脆轻灵的敲击触感)
        const strikeOsc1 = ctx.createOscillator();
        const strikeGain1 = ctx.createGain();
        strikeOsc1.type = 'sine';
        strikeOsc1.frequency.setValueAtTime(3600, now);
        strikeOsc1.frequency.exponentialRampToValueAtTime(2200, now + 0.035);
        strikeGain1.gain.setValueAtTime(0, now);
        strikeGain1.gain.linearRampToValueAtTime(0.12, now + 0.002);
        strikeGain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
        strikeOsc1.connect(strikeGain1);
        strikeGain1.connect(masterGain);
        strikeOsc1.start(now);
        strikeOsc1.stop(now + 0.05);

        // High sparkle chime ping (清脆微晶微鸣)
        const sparkleOsc = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkleOsc.type = 'triangle';
        sparkleOsc.frequency.setValueAtTime(5280, now);
        sparkleOsc.frequency.exponentialRampToValueAtTime(3960, now + 0.06);
        sparkleGain.gain.setValueAtTime(0, now);
        sparkleGain.gain.linearRampToValueAtTime(0.06, now + 0.003);
        sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(masterGain);
        sparkleOsc.start(now);
        sparkleOsc.stop(now + 0.08);

        // 2. Crisp Crystal Singing Bowl Partials (D5 / 587.33Hz + Authentic Crystal Bowl Overtones)
        const partials = [
          { freq: 587.33, detune: 0, gain: 0.22, decay: 4.8 },     // Fundamental (D5, Crisp & uplifting)
          { freq: 589.20, detune: 1.87, gain: 0.18, decay: 4.6 },  // Detuned shimmer for natural wave pulsation
          { freq: 1174.66, detune: 2, gain: 0.15, decay: 4.2 },   // Octave overtone
          { freq: 1621.03, detune: -3, gain: 0.12, decay: 3.8 },  // 2.76x Crystal singing bowl mode
          { freq: 2255.35, detune: 4, gain: 0.09, decay: 3.2 },   // 3.84x Bright crystal shimmer
          { freq: 3183.33, detune: -2, gain: 0.06, decay: 2.8 },  // 5.42x Ethereal brilliance
          { freq: 4405.00, detune: 3, gain: 0.035, decay: 2.2 },  // High crystal sparkle
          { freq: 5873.30, detune: 0, gain: 0.015, decay: 1.6 },  // Ultra-high transparent air
        ];

        partials.forEach((p) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(p.freq, now);
          if (p.detune !== 0) {
            osc.detune.setValueAtTime(p.detune, now);
          }

          gainNode.gain.setValueAtTime(0, now);
          // Crisp, gentle attack
          gainNode.gain.linearRampToValueAtTime(p.gain, now + 0.008);
          // Silky exponential decay
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

          osc.connect(gainNode);
          gainNode.connect(masterGain);

          osc.start(now);
          osc.stop(now + p.decay + 0.1);
        });

        // 3. High-Pass Filter (Eliminate muddy low-end rumble) & High-Shelf (Emphasize crisp transparency)
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(350, now);

        const highShelf = ctx.createBiquadFilter();
        highShelf.type = 'peaking';
        highShelf.frequency.setValueAtTime(2800, now);
        highShelf.Q.setValueAtTime(1.2, now);
        highShelf.gain.setValueAtTime(3.5, now); // +3.5dB crystal crispness boost

        masterGain.gain.setValueAtTime(0.85, now);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.9);

        masterGain.connect(highpass);
        highpass.connect(highShelf);
        highShelf.connect(ctx.destination);

      } else if (phase === 'holdIn' || phase === 'holdOut') {
        // --- HOLD IN & OUT: Sacred Woodblock/Wooden Fish (类似敲木鱼的声音) ---
        // Fast wood-resonance transient with hollow body decay and pitch sweep.
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const bandpass = ctx.createBiquadFilter();

        // Fundamental pitch of wooden fish: around 720Hz, sliding down to 530Hz
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(720, now);
        osc1.frequency.exponentialRampToValueAtTime(530, now + 0.08);

        // Overtone component: around 1080Hz, sliding down to 810Hz
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1080, now);
        osc2.frequency.exponentialRampToValueAtTime(810, now + 0.08);

        // Bandpass filter to make it sound hollow like a wooden box cavities
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(650, now);
        bandpass.Q.setValueAtTime(3.0, now);

        gainNode.gain.setValueAtTime(0, now);
        // Extremely sharp transient attack for wood mallet strike
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.002);
        // Wood decays extremely quickly (about 160ms)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        osc1.connect(bandpass);
        osc2.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);

      } else if (phase === 'exhale') {
        // --- EXHALE: Deep, Grounding & Powerful Meditative Temple Drum (厚重大鼓/排浊呼气鼓鸣) ---
        // Multi-layered acoustic synthesis: Strike Attack + Wood/Leather Body + Deep Earth Sub + Warm Punch EQ
        const drumMasterGain = ctx.createGain();

        // 1. Leather Membrane & Beater Strike Transient (清晰有力的鼓皮/击槌瞬态打击感，确保各设备清晰听见)
        const strikeOsc = ctx.createOscillator();
        const strikeGain = ctx.createGain();
        strikeOsc.type = 'triangle';
        strikeOsc.frequency.setValueAtTime(460, now);
        strikeOsc.frequency.exponentialRampToValueAtTime(160, now + 0.045);
        strikeGain.gain.setValueAtTime(0, now);
        strikeGain.gain.linearRampToValueAtTime(0.42, now + 0.003); // Quick, punchy attack
        strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        strikeOsc.connect(strikeGain);
        strikeGain.connect(drumMasterGain);
        strikeOsc.start(now);
        strikeOsc.stop(now + 0.08);

        // 2. Main Drum Body & Leather Skin Tension Sweep (深沉饱满的鼓腔回响)
        const bodyOsc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        bodyOsc.type = 'sine';
        // Pitch sweep from 220Hz downward to 58Hz to emulate large leather membrane resonance
        bodyOsc.frequency.setValueAtTime(220, now);
        bodyOsc.frequency.exponentialRampToValueAtTime(58, now + 0.18);
        bodyGain.gain.setValueAtTime(0, now);
        bodyGain.gain.linearRampToValueAtTime(0.75, now + 0.008);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2); // Rich, long reverberating decay
        bodyOsc.connect(bodyGain);
        bodyGain.connect(drumMasterGain);
        bodyOsc.start(now);
        bodyOsc.stop(now + 2.3);

        // 3. Warm Harmonic Mid-Body (大地木质与中低频丰满度)
        const harmonicOsc = ctx.createOscillator();
        const harmonicGain = ctx.createGain();
        harmonicOsc.type = 'triangle';
        harmonicOsc.frequency.setValueAtTime(140, now);
        harmonicOsc.frequency.exponentialRampToValueAtTime(68, now + 0.22);
        harmonicGain.gain.setValueAtTime(0, now);
        harmonicGain.gain.linearRampToValueAtTime(0.38, now + 0.01);
        harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
        harmonicOsc.connect(harmonicGain);
        harmonicGain.connect(drumMasterGain);
        harmonicOsc.start(now);
        harmonicOsc.stop(now + 0.9);

        // 4. Sub-Bass Earth Grounding (深层大地低频振荡)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(65, now);
        subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.4);
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.55, now + 0.02);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
        subOsc.connect(subGain);
        subGain.connect(drumMasterGain);
        subOsc.start(now);
        subOsc.stop(now + 2.1);

        // 5. Acoustic Filter & Punch Resonance Shaping (低通与温暖中低频提升)
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(520, now); // Open up to 520Hz for rich body and tactile punch
        lowpass.Q.setValueAtTime(1.5, now);

        const punchEQ = ctx.createBiquadFilter();
        punchEQ.type = 'peaking';
        punchEQ.frequency.setValueAtTime(130, now);
        punchEQ.Q.setValueAtTime(1.2, now);
        punchEQ.gain.setValueAtTime(4.5, now); // +4.5dB boost on the punchy chest thump

        drumMasterGain.gain.setValueAtTime(0.92, now); // Emphasized, prominent master presence
        drumMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        drumMasterGain.connect(lowpass);
        lowpass.connect(punchEQ);
        punchEQ.connect(ctx.destination);
      }
    } catch (err) {
      console.error('Failed to play phase transition sound:', err);
    }
  };

  // Breathing loop timer with synchronized countdown, visual progress, and auditory cues
  useEffect(() => {
    if (!activeWishSession) return;

    const pattern = breathingPatterns.find(p => p.id === selectedPatternId) || breathingPatterns[0];
    const isSohum = pattern.id === 'sohum';

    // Local tracking variables inside closure
    let localSohumStage: 1 | 2 = sohumStageMode === 'stage2' ? 2 : 1;
    let localCycleCount = 1;
    let localElapsedSeconds = 0;

    setSohumCurrentStage(localSohumStage);
    setSohumCycleCount(1);
    setSohumElapsedSeconds(0);

    const getInhaleTime = () => {
      if (isSohum) return localSohumStage === 1 ? 5 : 6;
      return pattern.inhale;
    };

    const getExhaleTime = () => {
      if (isSohum) return localSohumStage === 1 ? 5 : 6;
      return pattern.exhale;
    };

    const getPhaseText = (phase: 'inhale' | 'holdIn' | 'exhale' | 'holdOut', stage: 1 | 2 = localSohumStage) => {
      const isEn = language === 'en';
      if (pattern.id === 'sohum') {
        if (phase === 'inhale') {
          return isEn 
            ? (stage === 1 ? 'So (Inhale • 5s)' : 'So (Inhale • 6s)') 
            : (stage === 1 ? 'So (吸气 · 连系源头 5s)' : 'So (吸气 · 深入原初 6s)');
        }
        if (phase === 'exhale') {
          return isEn 
            ? (stage === 1 ? 'Hum (Exhale • 5s)' : 'Hum (Exhale • 6s)') 
            : (stage === 1 ? 'Hum (呼气 · 回归本我 5s)' : 'Hum (呼气 · 大我安歇 6s)');
        }
      } else if (pattern.id === 'rebirthing') {
        if (phase === 'inhale') return isEn ? 'Continuous Inhale...' : '连贯吸气...';
        if (phase === 'exhale') return isEn ? 'Passive Release...' : '放手呼气...';
      }
      
      if (phase === 'inhale') return isEn ? 'Inhale...' : '吸气...';
      if (phase === 'holdIn') return isEn ? 'Hold Breath...' : '吸气后屏息...';
      if (phase === 'exhale') return isEn ? 'Exhale...' : '呼气...';
      if (phase === 'holdOut') return isEn ? 'Hold Breath...' : '呼气后屏息...';
      return '';
    };

    const initialInhale = getInhaleTime();
    setBreathingCountdown(initialInhale);
    setBreathingPhase('inhale');
    setBreathingText(getPhaseText('inhale', localSohumStage));
    playBreathingPhaseSound('inhale');

    let currentPhase: 'inhale' | 'holdIn' | 'exhale' | 'holdOut' = 'inhale';
    let currentCountdown = initialInhale;

    const interval = setInterval(() => {
      localElapsedSeconds++;
      setSohumElapsedSeconds(localElapsedSeconds);

      currentCountdown--;
      if (currentCountdown <= 0) {
        if (currentPhase === 'inhale') {
          if (pattern.holdIn > 0 && !isSohum) {
            currentPhase = 'holdIn';
            currentCountdown = pattern.holdIn;
            setBreathingPhase('holdIn');
            setBreathingText(getPhaseText('holdIn'));
            playBreathingPhaseSound('holdIn');
          } else {
            currentPhase = 'exhale';
            currentCountdown = getExhaleTime();
            setBreathingPhase('exhale');
            setBreathingText(getPhaseText('exhale', localSohumStage));
            playBreathingPhaseSound('exhale');
          }
        } else if (currentPhase === 'holdIn') {
          currentPhase = 'exhale';
          currentCountdown = getExhaleTime();
          setBreathingPhase('exhale');
          setBreathingText(getPhaseText('exhale', localSohumStage));
          playBreathingPhaseSound('exhale');
        } else if (currentPhase === 'exhale') {
          if (pattern.holdOut > 0 && !isSohum) {
            currentPhase = 'holdOut';
            currentCountdown = pattern.holdOut;
            setBreathingPhase('holdOut');
            setBreathingText(getPhaseText('holdOut'));
            playBreathingPhaseSound('holdOut');
          } else {
            // Completed 1 full breath cycle
            localCycleCount++;
            setSohumCycleCount(localCycleCount);

            // Handle SOHUM auto-stage transition (1 min 6 times -> 1 min 5 times)
            if (isSohum && sohumStageMode === 'auto' && localSohumStage === 1) {
              // 6 cycles of 10s = 60s
              if (localElapsedSeconds >= 58 || localCycleCount > 6) {
                localSohumStage = 2;
                setSohumCurrentStage(2);
              }
            }

            currentPhase = 'inhale';
            currentCountdown = getInhaleTime();
            setBreathingPhase('inhale');
            setBreathingText(getPhaseText('inhale', localSohumStage));
            playBreathingPhaseSound('inhale');
          }
        } else if (currentPhase === 'holdOut') {
          localCycleCount++;
          setSohumCycleCount(localCycleCount);

          currentPhase = 'inhale';
          currentCountdown = getInhaleTime();
          setBreathingPhase('inhale');
          setBreathingText(getPhaseText('inhale', localSohumStage));
          playBreathingPhaseSound('inhale');
        }
      }
      setBreathingCountdown(currentCountdown);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWishSession, selectedPatternId, sohumStageMode, language]);

  // Start continuous Solfeggio frequency oscillators
  const startSolfeggioSynth = () => {
    try {
      stopSolfeggioSynth();

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      solfeggioAudioCtxRef.current = ctx;

      const mainGain = ctx.createGain();
      // Main carrier volume (gentle scaling)
      mainGain.gain.setValueAtTime(solfeggioVolume * 0.15, ctx.currentTime);
      mainGain.connect(ctx.destination);
      solfeggioGainRef.current = mainGain;

      // Lowpass filter for smooth, warm sub-harmonic sounds
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, ctx.currentTime);
      filter.connect(mainGain);

      // Left Channel carrier
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(solfeggioFrequency, ctx.currentTime);
      osc1.connect(filter);

      // Right Channel carrier - slightly detuned by +4.32Hz for luxurious Theta-wave cosmic beating
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(solfeggioFrequency + 4.32, ctx.currentTime);
      osc2.connect(filter);

      osc1.start();
      osc2.start();

      solfeggioOscsRef.current = [osc1, osc2];
    } catch (err) {
      console.error('Failed to start Solfeggio frequency generator:', err);
    }
  };

  const stopSolfeggioSynth = () => {
    if (solfeggioOscsRef.current && solfeggioOscsRef.current.length > 0) {
      solfeggioOscsRef.current.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {}
      });
      solfeggioOscsRef.current = [];
    }
    if (solfeggioAudioCtxRef.current) {
      try {
        solfeggioAudioCtxRef.current.close();
      } catch (e) {}
      solfeggioAudioCtxRef.current = null;
    }
    solfeggioGainRef.current = null;
  };

  // Reactively start/stop continuous Solfeggio sound depending on active state, sound type selection, and master enable switch
  useEffect(() => {
    if (activeWishSession && meditationSoundType === 'solfeggio' && isBackgroundAudioEnabled) {
      startSolfeggioSynth();
      // Mute/pause original ambient music track so they don't clash harshly
      setIsMusicPlaying(false);
    } else {
      stopSolfeggioSynth();
    }

    // Handle ambient music track state reactively when entering session
    if (activeWishSession && meditationSoundType === 'ambient') {
      if (isBackgroundAudioEnabled) {
        setIsMusicPlaying(true);
      } else {
        setIsMusicPlaying(false);
      }
    }

    return () => {
      stopSolfeggioSynth();
    };
  }, [activeWishSession, meditationSoundType, solfeggioFrequency, isBackgroundAudioEnabled]);

  // Adjust volume dynamically when user moves the slider
  useEffect(() => {
    if (solfeggioGainRef.current && solfeggioAudioCtxRef.current) {
      const ctx = solfeggioAudioCtxRef.current;
      solfeggioGainRef.current.gain.setValueAtTime(solfeggioVolume * 0.15, ctx.currentTime);
    }
  }, [solfeggioVolume]);

  const playAwakeningChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      // Elegant, pure notes for a beautiful, rich awakening chime (F# major arpeggio / pentatonic chord series)
      const freqs = [369.99, 466.16, 554.37, 739.99, 932.33, 1108.73]; 

      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);

        gainNode.gain.setValueAtTime(0, now + index * 0.12);
        gainNode.gain.linearRampToValueAtTime(0.12, now + index * 0.12 + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 4.0);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 4.5);
      });
    } catch (err) {
      console.error('Failed to play awakening chime:', err);
    }
  };

  // Countdown timer interval logic
  useEffect(() => {
    if (!activeWishSession || !isTimerRunning) return;

    if (timerRemaining <= 0) {
      setIsTimerRunning(false);
      handleStopSpeaking();
      playAwakeningChime();
      stopSolfeggioSynth(); // Stop Solfeggio vibration when session completes
      
      const randWhisper = GRATITUDE_WHISPERS[Math.floor(Math.random() * GRATITUDE_WHISPERS.length)];
      setSelectedGratitudeWhisper(randWhisper);
      
      setShowFinishedOverlay(true);

      // Fade out background music smoothly over 4 seconds
      if (isMusicPlaying) {
        const originalVolume = musicVolume;
        let currentVol = musicVolume;
        const steps = 20;
        const fadeStep = musicVolume / steps;
        const intervalTime = 4000 / steps;

        const fadeInterval = setInterval(() => {
          currentVol -= fadeStep;
          if (currentVol <= 0.01) {
            clearInterval(fadeInterval);
            setIsMusicPlaying(false);
            setMusicVolume(originalVolume); // Reset volume to original setting
          } else {
            setMusicVolume(Math.max(0, currentVol));
          }
        }, intervalTime);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimerRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWishSession, isTimerRunning, timerRemaining, isMusicPlaying, musicVolume]);

  const handleStartManifestationSession = (wish: Wish) => {
    setActiveWishSession(wish);
    setActiveSessionLang('zh');
    setTimerRemaining(timerDuration);
    setIsTimerRunning(true);
    setShowFinishedOverlay(false);
    setSelectedGratitudeWhisper(GRATITUDE_WHISPERS[Math.floor(Math.random() * GRATITUDE_WHISPERS.length)]);

    // Never auto-play background music or auto-read text on session entry or topic switch
    setIsBackgroundAudioEnabled(false);
    setIsMusicPlaying(false);
    stopSolfeggioSynth();
    handleStopSpeaking();
  };

  const handleNavigate = (view: PrimaryViewId) => {
    if (view === 'temple' && currentView !== 'temple') {
      setTempleReturnView(currentView);
    }
    setCurrentView(view);
    setShowMobileTools(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentView === 'temple') {
      document.title =
        language === 'en'
          ? 'Yixiu Little Temple · AMND Manifestation'
          : '一休小庙 · AMND Manifestation';
    } else {
      document.title = 'AMND Manifestation · Amanda 的学海魔法屋';
    }
  }, [currentView, language]);

  const handleEnterMeditationSpace = (wishToUse?: Wish) => {
    setCurrentView('stillness');
    setShowMobileTools(false);
    const targetWish = wishToUse || activeWishSession || DEFAULT_UNIVERSAL_WISH;
    handleStartManifestationSession(targetWish);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitManifestationSession = () => {
    setActiveWishSession(null);
    setIsTimerRunning(false);
    setShowFinishedOverlay(false);
    setIsBackgroundAudioEnabled(false);
    setIsMusicPlaying(false);
    handleStopSpeaking();
    stopSolfeggioSynth();
  };

  // Lock background page scroll while immersive meditation/manifestation overlay is open
  useEffect(() => {
    if (!activeWishSession) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activeWishSession]);

  const handleSetTimerDuration = (minutes: number) => {
    const seconds = minutes * 60;
    setTimerDuration(seconds);
    setTimerRemaining(seconds);
    setIsTimerRunning(true);
    setShowFinishedOverlay(false);
  };

  const activeTheme = BACKGROUNDS_THEMES.find(t => t.id === visualBg) || BACKGROUNDS_THEMES[1];
  const isBgDark = visualBg === 'sparkling-sky';

  const navItems: {
    id: PrimaryViewId;
    label: string;
    mobileLabel: string;
    icon: typeof Home;
  }[] = [
    { id: 'home', label: language === 'en' ? 'Home' : '归心', mobileLabel: language === 'en' ? 'Home' : '归心', icon: Home },
    { id: 'wisdom', label: language === 'en' ? 'Wisdom' : '智慧', mobileLabel: language === 'en' ? 'Wisdom' : '智慧', icon: BookOpen },
    { id: 'temple', label: language === 'en' ? 'Yixiu Little Temple' : '一休小庙', mobileLabel: language === 'en' ? 'Yixiu Little Temple' : '一休小庙', icon: Compass },
    { id: 'stillness', label: language === 'en' ? 'Stillness' : '静心', mobileLabel: language === 'en' ? 'Still' : '静心', icon: Wind },
    { id: 'manifestation', label: language === 'en' ? 'Manifestation' : '显化', mobileLabel: language === 'en' ? 'Manifest' : '显化', icon: Sparkles },
    { id: 'myspace', label: language === 'en' ? 'My Space' : '我的空间', mobileLabel: language === 'en' ? 'Space' : '我的', icon: User },
  ];

  // Single AudioPlayer instance shared cleanly between StillnessPage and off-view fullscreen meditation
  const audioPlayerNode = (
    <AudioPlayer
      language={language}
      currentTrack={currentTrack}
      onTrackChange={setCurrentTrack}
      tracks={tracks}
      onAddCustomTrack={handleAddCustomTrack}
      voiceTone={voiceTone}
      onVoiceToneChange={setVoiceTone}
      isPlaying={isMusicPlaying}
      setIsPlaying={setIsMusicPlaying}
      volume={musicVolume}
      setVolume={setMusicVolume}
      activeWishSession={activeWishSession}
    />
  );

  return (
    <div className="relative min-h-screen text-[var(--amnd-text-primary)] transition-colors duration-500 font-sans">
      {/* Calm Warm Ivory Base Surface */}
      <div className="fixed inset-0 -z-20 pointer-events-none bg-[var(--amnd-bg-primary)]" />

      {/* Subtle Canvas Atmosphere Layer (kept subtle on editorial views; full-strength inside Meditation Space) */}
      <div className={activeWishSession ? 'pointer-events-none' : 'opacity-[0.16] pointer-events-none transition-opacity duration-500'}>
        <VisualizationBackground type={visualBg} intensity={3} saturation={bgSaturation} brightness={bgBrightness} blur={bgBlur} />
      </div>

      {/* Header Bar (compact 56px single row on mobile; single-row 6-section header on desktop) */}
      <header className="sticky top-0 z-40 bg-[var(--amnd-bg-elevated)]/95 backdrop-blur-md border-b border-[var(--amnd-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Logo */}
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            className="flex items-center text-left cursor-pointer rounded-lg focus-visible:outline-2 shrink-0"
            aria-label="AMND Manifestation Home"
            id="brand-home-logo-btn"
          >
            <img
              src="/logo-header.png"
              alt="AMND Manifestation · Amanda 的学海魔法屋"
              className="h-9 md:h-11 lg:h-12 w-auto object-contain select-none shrink-0"
            />
          </button>
          <h1 className="sr-only">AMND Manifestation</h1>
          <p className="sr-only">
            {language === 'en'
              ? "Amanda's Sanctuary · Learn, and Magic Manifests."
              : 'Amanda 的学海魔法屋 · 学习了，魔法会显化。'}
          </p>

          {/* Center (Desktop >=768px): 6 Primary Pages Navigation */}
          <nav
            aria-label={language === 'en' ? 'Primary navigation' : '主导航'}
            className="hidden md:flex items-center gap-1 lg:gap-2 overflow-x-auto no-scrollbar"
          >
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  id={`nav-view-${item.id}`}
                  className={`relative px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-[13px] font-sans transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-[var(--amnd-text-primary)] font-semibold bg-[var(--amnd-bg-secondary)]'
                      : 'text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-bg-secondary)]/50'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2.5 bottom-0.5 h-[2px] rounded-full bg-[var(--amnd-wood)]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Atmosphere & Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-sans transition-colors duration-200 border whitespace-nowrap shrink-0 cursor-pointer ${
                showFilterPanel
                  ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)] border-transparent'
                  : 'bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-secondary)] border-[var(--amnd-border-strong)]'
              }`}
              id="filter-toggle-btn"
              title={language === 'en' ? 'Adjust canvas atmosphere, saturation, brightness, and blur' : '调节画布心境、饱和度、亮度和模糊度'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="font-medium hidden lg:inline">
                {language === 'en' ? 'Atmosphere' : '氛围'}
              </span>
            </button>

            {/* Language Switcher (always accessible) */}
            <button
              type="button"
              onClick={() => setLanguage((l) => (l === 'zh' ? 'en' : 'zh'))}
              className="min-h-[36px] md:min-h-0 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-sans transition-colors duration-200 flex items-center gap-1 border bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-primary)] border-[var(--amnd-border-strong)] font-medium whitespace-nowrap shrink-0 cursor-pointer"
              id="language-toggle-btn"
            >
              <span>{language === 'zh' ? 'EN' : '中文'}</span>
            </button>

            {/* Desktop Backup / Share Bar */}
            <div className="hidden lg:block">
              <UserSyncBar
                wishes={wishes}
                onOpenShareModal={() => setIsShareModalOpen(true)}
                language={language}
                onImportWishes={(imported) => saveWishesToStorage(imported)}
              />
            </div>

            {/* Mobile & Tablet (<1024px) Utility Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowMobileTools((prev) => !prev)}
              aria-expanded={showMobileTools}
              aria-controls="header-secondary-tools"
              id="mobile-tools-toggle-btn"
              className={`lg:hidden inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                showMobileTools
                  ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)] border-transparent'
                  : 'bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] text-[var(--amnd-text-primary)] border-[var(--amnd-border-strong)]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'en' ? 'Tools' : '工具'}</span>
              {showMobileTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Secondary Tools Drawer (<1024px) */}
        {showMobileTools && (
          <div
            id="header-secondary-tools"
            className="lg:hidden border-t border-[var(--amnd-border)] bg-[var(--amnd-bg-elevated)] px-4 py-3 flex flex-wrap items-center justify-between gap-2 animate-fadeIn"
          >
            <button
              type="button"
              onClick={() => {
                setShowFilterPanel((prev) => !prev);
                setShowMobileTools(false);
              }}
              className={`md:hidden px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 cursor-pointer ${
                showFilterPanel
                  ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)] border-transparent'
                  : 'bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-primary)] border-[var(--amnd-border-strong)]'
              }`}
              id="mobile-filter-toggle-btn"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Atmosphere & Filter' : '画布与氛围滤镜'}</span>
            </button>

            <div className="ml-auto">
              <UserSyncBar
                wishes={wishes}
                onOpenShareModal={() => setIsShareModalOpen(true)}
                language={language}
                onImportWishes={(imported) => saveWishesToStorage(imported)}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Layout container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8" id="manifestation-app-body">

        {/* Ambient Atmosphere & Filter Control Panel */}
        {showFilterPanel && (
          <div className="mb-6 p-5 amnd-surface animate-fadeIn space-y-5" id="ambient-filters-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--amnd-border)] pb-3 gap-2">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[var(--amnd-wood)]" />
                  <span>
                    {language === 'en' ? 'Atmosphere & Canvas Filter' : '心境画布与氛围滤镜'}
                  </span>
                </h3>
                <p className="text-xs text-[var(--amnd-text-muted)] mt-0.5">
                  {language === 'en' ? 'Customize visual atmosphere, saturation, brightness, and blur' : '按当下心境自由选择视觉画布，调节画面饱和度、亮度和模糊度'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBgSaturation(100);
                  setBgBrightness(100);
                  setBgBlur(0);
                }}
                className="text-xs font-medium text-[var(--amnd-wood)] hover:text-[var(--amnd-bg-elevated)] bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-wood)] px-3.5 py-1.5 rounded-lg border border-[var(--amnd-border-strong)] transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Reset to Default' : '重置原版'}</span>
              </button>
            </div>

            {/* Canvas Atmosphere Themes */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[var(--amnd-text-secondary)] block">
                {language === 'en' ? 'Canvas Atmosphere' : '心境画布主题'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BACKGROUNDS_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setVisualBg(theme.id)}
                    className={`p-3 rounded-xl border text-left transition-colors flex items-center gap-2 cursor-pointer ${
                      visualBg === theme.id
                        ? 'bg-[var(--amnd-wood-soft)] text-[var(--amnd-text-primary)] border-[var(--amnd-wood)] font-semibold'
                        : 'bg-[var(--amnd-bg-secondary)]/60 hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-secondary)] border-[var(--amnd-border)]'
                    }`}
                    title={language === 'en' ? theme.nameEn : theme.name}
                    id={`theme-btn-${theme.id}`}
                  >
                    <span aria-hidden="true">{theme.emoji}</span>
                    <span className="text-xs truncate">{language === 'en' ? theme.nameEn : theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ambient Presets Grid */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[var(--amnd-text-secondary)] block">
                {language === 'en' ? 'Recommended Meditation Atmosphere Presets' : '推荐静心氛围预设'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { name: language === 'en' ? 'Original Canvas' : '默认原版', saturation: 100, brightness: 100, blur: 0, desc: language === 'en' ? 'Standard palette' : '均衡自然' },
                  { name: language === 'en' ? 'Tranquil Dawn' : '静谧晨曦', saturation: 80, brightness: 120, blur: 2, desc: language === 'en' ? 'Morning peace' : '清朗平和' },
                  { name: language === 'en' ? 'Deep Dream' : '深沉梦境', saturation: 130, brightness: 75, blur: 4, desc: language === 'en' ? 'Deep dream space' : '沉静内观' },
                  { name: language === 'en' ? 'Ethereal Void' : '无尘空灵', saturation: 40, brightness: 90, blur: 6, desc: language === 'en' ? 'Deep relaxation' : '极简留白' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setBgSaturation(preset.saturation);
                      setBgBrightness(preset.brightness);
                      setBgBlur(preset.blur);
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-center cursor-pointer ${
                      bgSaturation === preset.saturation && bgBrightness === preset.brightness && bgBlur === preset.blur
                        ? 'bg-[var(--amnd-wood-soft)] text-[var(--amnd-text-primary)] border-[var(--amnd-wood)] font-semibold'
                        : 'bg-[var(--amnd-bg-secondary)]/60 hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-secondary)] border-[var(--amnd-border)]'
                    }`}
                  >
                    <span className="text-xs font-semibold">{preset.name}</span>
                    <span className="text-[11px] text-[var(--amnd-text-muted)] mt-0.5">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--amnd-bg-secondary)]/60 border border-[var(--amnd-border)]">
                <div className="flex items-center justify-between text-xs font-medium text-[var(--amnd-text-primary)]">
                  <span>{language === 'en' ? 'Canvas Saturation' : '背景饱和度'}</span>
                  <span className="font-mono text-[11px] tabular-nums bg-[var(--amnd-bg-elevated)] px-2 py-0.5 rounded border border-[var(--amnd-border)]">{bgSaturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={bgSaturation}
                  onChange={(e) => setBgSaturation(Number(e.target.value))}
                  className="w-full accent-[var(--amnd-wood)] cursor-pointer h-1.5 bg-[var(--amnd-border)] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[11px] text-[var(--amnd-text-muted)]">
                  <span>{language === 'en' ? 'Muted' : '素雅低饱和'}</span>
                  <span>100%</span>
                  <span>{language === 'en' ? 'Vivid' : '丰润'}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--amnd-bg-secondary)]/60 border border-[var(--amnd-border)]">
                <div className="flex items-center justify-between text-xs font-medium text-[var(--amnd-text-primary)]">
                  <span>{language === 'en' ? 'Canvas Brightness' : '背景亮度'}</span>
                  <span className="font-mono text-[11px] tabular-nums bg-[var(--amnd-bg-elevated)] px-2 py-0.5 rounded border border-[var(--amnd-border)]">{bgBrightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={bgBrightness}
                  onChange={(e) => setBgBrightness(Number(e.target.value))}
                  className="w-full accent-[var(--amnd-wood)] cursor-pointer h-1.5 bg-[var(--amnd-border)] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[11px] text-[var(--amnd-text-muted)]">
                  <span>{language === 'en' ? 'Quiet Dark' : '静谧柔暗'}</span>
                  <span>100%</span>
                  <span>{language === 'en' ? 'Luminous' : '明亮通透'}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--amnd-bg-secondary)]/60 border border-[var(--amnd-border)]">
                <div className="flex items-center justify-between text-xs font-medium text-[var(--amnd-text-primary)]">
                  <span>{language === 'en' ? 'Canvas Blur' : '背景模糊度'}</span>
                  <span className="font-mono text-[11px] tabular-nums bg-[var(--amnd-bg-elevated)] px-2 py-0.5 rounded border border-[var(--amnd-border)]">{bgBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={bgBlur}
                  onChange={(e) => setBgBlur(Number(e.target.value))}
                  className="w-full accent-[var(--amnd-wood)] cursor-pointer h-1.5 bg-[var(--amnd-border)] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[11px] text-[var(--amnd-text-muted)]">
                  <span>{language === 'en' ? 'Clear' : '清透'}</span>
                  <span>{language === 'en' ? 'Soft' : '柔和'}</span>
                  <span>{language === 'en' ? 'Deep Blur' : '微茫虚化'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary 6-Page Views */}
        {currentView === 'home' && (
          <HomePage
            language={language}
            onNavigate={handleNavigate}
            onEnterStillness={() => handleNavigate('stillness')}
            onSpeak={handleSpeakText}
            isSpeaking={isSpeaking}
            onStopSpeaking={handleStopSpeaking}
          />
        )}

        {currentView === 'wisdom' && (
          <WisdomPage
            language={language}
            onSpeak={handleSpeakText}
            onAddCustomWish={(title, details, category) => {
              handleAddWish({ title, details, category });
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'temple' && (
          <TemplePage
            language={language}
            onNavigate={handleNavigate}
            onEnterStillness={() => handleNavigate('stillness')}
            onExitTemple={() => handleNavigate(templeReturnView)}
          />
        )}

        {currentView === 'stillness' && (
          <StillnessPage
            language={language}
            wishes={wishes}
            defaultUniversalWish={DEFAULT_UNIVERSAL_WISH}
            timerDuration={timerDuration}
            onSelectDurationMinutes={(mins) => {
              const seconds = mins * 60;
              setTimerDuration(seconds);
              setTimerRemaining(seconds);
            }}
            breathingPatterns={breathingPatterns}
            selectedPatternId={selectedPatternId}
            onSelectPatternId={setSelectedPatternId}
            onStartMeditation={(wish) => handleEnterMeditationSpace(wish)}
            audioPlayerSlot={audioPlayerNode}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'manifestation' && (
          <ManifestationPage
            language={language}
            wishes={wishes}
            onAddWish={handleAddWish}
            onDeleteWish={handleDeleteWish}
            onGenerateDetails={handleGenerateDetails}
            onStartSession={handleStartManifestationSession}
            isGeneratingMap={isGeneratingMap}
            onUpdateWish={handleUpdateWish}
            onSpeak={handleSpeakText}
            isSpeaking={isSpeaking}
            onStopSpeaking={handleStopSpeaking}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'myspace' && (
          <MySpacePage
            language={language}
            wishes={wishes}
            onImportWishes={(imported) => saveWishesToStorage(imported)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onStartMeditationForWish={(wish) => handleStartManifestationSession(wish)}
            onNavigate={handleNavigate}
          />
        )}

        {/* Single-instance off-view AudioPlayer fallback ONLY when fullscreen meditation is opened outside StillnessPage */}
        {currentView !== 'stillness' && activeWishSession !== null && (
          <div className="hidden" aria-hidden="true">
            {audioPlayerNode}
          </div>
        )}
      </main>

      {/* FULL SCREEN IMMERSIVE MANIFESTATION VISUALIZATION OVERLAY */}
      {activeWishSession && (
        <div
          className={`fixed inset-0 z-[60] overflow-y-auto font-sans ${
            isBgDark ? 'bg-[#1E1B4B]' : 'bg-[#faf7f2]'
          }`}
          id="immersive-focus-session-overlay"
        >
          {/* Fixed opaque backdrop + visual canvas locked to viewport (never scrolls away or reveals main page underneath) */}
          <div
            className={`fixed inset-0 z-0 pointer-events-none ${
              isBgDark ? 'bg-[#1E1B4B]' : 'bg-[#faf7f2]'
            }`}
            aria-hidden="true"
          >
            <VisualizationBackground
              type={visualBg}
              intensity={4}
              saturation={bgSaturation}
              brightness={bgBrightness}
              blur={bgBlur}
              zIndexClass="z-0"
            />
          </div>

          <div className="relative z-10 min-h-full w-full flex flex-col justify-between gap-8 p-4 md:p-8 lg:p-12">
            {/* Top Bar inside focus session */}
            <div className="flex items-center justify-between w-full shrink-0 relative z-10">
              <div className={`flex items-center space-x-2.5 ${isBgDark ? 'text-white' : 'text-[#5c3e43]'}`}>
              <img
                src="/logo-icon.png"
                alt="AMND Manifestation"
                className="w-8 h-8 object-contain shrink-0 select-none"
              />
              <div className="text-left">
                <span className={`text-[10px] uppercase font-mono tracking-widest block font-bold ${isBgDark ? 'text-amber-200' : 'text-[#8e6d72]'}`}>Active Manifestation</span>
                <span className={`text-xs font-semibold font-serif ${isBgDark ? 'text-white/95' : 'text-[#4a2e31]'}`}>
                  {language === 'en' ? 'Deep Focus Manifestation Session...' : '正在进行深度专注显化中...'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full backdrop-blur-md border text-xs font-bold transition-all shadow-md ${
                  showFilterPanel
                    ? 'bg-[#8e6d72] text-white border-transparent'
                    : isBgDark 
                      ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' 
                      : 'bg-white/60 hover:bg-white/80 text-[#5c3e43] border-[#8e6d72]/20'
                }`}
                id="immersive-filter-toggle-btn"
                title={language === 'en' ? 'Adjust filter settings' : '调节沉浸背景氛围滤镜'}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === 'en' ? '🎛️ Filters' : '🎛️ 氛围滤镜'}</span>
              </button>

              <button
                onClick={handleExitManifestationSession}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full backdrop-blur-md border text-xs font-bold transition-all shadow-md ${
                  isBgDark 
                    ? 'bg-white/15 hover:bg-white/25 text-white border-white/20' 
                    : 'bg-[#8e6d72]/15 hover:bg-[#8e6d72]/25 text-[#5c3e43] border-[#8e6d72]/30'
                }`}
                id="exit-session-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Exit Session' : '退出冥想'}</span>
              </button>
            </div>
          </div>

          {/* Real-time filter panel inside immersive focus */}
          {showFilterPanel && (
            <div className={`mt-4 mx-auto max-w-3xl w-full p-4.5 rounded-[28px] backdrop-blur-xl border shadow-2xl relative z-20 animate-fadeIn ${
              isBgDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white/85 border-[#8e6d72]/20 text-[#4a3a3a]'
            }`} id="immersive-filters-panel">
              <div className="flex items-center justify-between border-b border-[#8e6d72]/15 pb-2 mb-3">
                <div className="text-left">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#8e6d72] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>
                      {language === 'en' ? 'Deep Meditation Calibration' : '冥想深度氛围微调 (Deep Meditation Calibration)'}
                    </span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBgSaturation(100);
                    setBgBrightness(100);
                    setBgBlur(0);
                  }}
                  className="text-[9.5px] font-bold px-2 py-1 rounded-lg bg-[#8e6d72]/15 hover:bg-[#8e6d72]/25 border border-[#8e6d72]/15 transition-all text-[#8e6d72]"
                >
                  {language === 'en' ? 'Reset to Default' : '重置原版'}
                </button>
              </div>

              {/* Sliders in single line or row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span>{language === 'en' ? 'Saturation' : '饱和度 (Saturation)'}</span>
                    <span className="font-mono text-[10.5px]">{bgSaturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={bgSaturation}
                    onChange={(e) => setBgSaturation(Number(e.target.value))}
                    className="w-full accent-[#8e6d72] cursor-pointer h-1 bg-gray-200/50 rounded-lg"
                  />
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span>{language === 'en' ? 'Brightness' : '亮度 (Brightness)'}</span>
                    <span className="font-mono text-[10.5px]">{bgBrightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={bgBrightness}
                    onChange={(e) => setBgBrightness(Number(e.target.value))}
                    className="w-full accent-[#8e6d72] cursor-pointer h-1 bg-gray-200/50 rounded-lg"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span>{language === 'en' ? 'Blur' : '模糊度 (Blur)'}</span>
                    <span className="font-mono text-[10.5px]">{bgBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={bgBlur}
                    onChange={(e) => setBgBlur(Number(e.target.value))}
                    className="w-full accent-[#8e6d72] cursor-pointer h-1 bg-gray-200/50 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Center focus elements */}
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center my-auto py-2 space-y-5 md:space-y-7 relative z-10">
            
            {/* Countdown Timer Control Center */}
            <div className={`backdrop-blur-md border rounded-[28px] px-5 py-3.5 flex flex-col sm:flex-row items-center gap-5 shadow-xl animate-fadeIn ${
              isBgDark 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/60 border-[#8e6d72]/20 shadow-pink-100/20'
            }`}>
              {/* Timer Display */}
              <div className="flex items-center gap-3">
                <span className="text-xl">⏳</span>
                <div className="text-left">
                  <span className={`text-[9px] uppercase tracking-wider block font-bold font-mono ${isBgDark ? 'text-pink-200' : 'text-[#b49196]'}`}>
                    {language === 'en' ? 'Manifestation Timer' : 'Manifestation Timer • 冥想倒计时'}
                  </span>
                  <span className={`font-mono text-2xl md:text-3xl font-bold tracking-widest ${isBgDark ? 'text-white' : 'text-[#4a3a3a]'}`}>
                    {Math.floor(timerRemaining / 60).toString().padStart(2, '0')}:
                    {(timerRemaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Timer Controls */}
              <div className={`flex items-center gap-2 sm:border-l sm:pl-5 ${isBgDark ? 'sm:border-white/20' : 'sm:border-[#8e6d72]/20'}`}>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`p-2.5 rounded-full transition-all duration-300 active:scale-95 shadow-sm ${
                    isBgDark ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-[#8e6d72]/15 hover:bg-[#8e6d72]/25 text-[#8e6d72]'
                  }`}
                  title={isTimerRunning ? (language === 'en' ? "Pause timer" : "暂停倒计时") : (language === 'en' ? "Start timer" : "开始倒计时")}
                  id="timer-play-pause-btn"
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setTimerRemaining(timerDuration)}
                  className={`p-2.5 rounded-full transition-all duration-300 active:scale-95 ${
                    isBgDark ? 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white' : 'bg-[#8e6d72]/10 hover:bg-[#8e6d72]/20 text-[#8e6d72]'
                  }`}
                  title={language === 'en' ? "Reset time" : "重置时间"}
                  id="timer-reset-btn"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Duration presets */}
              <div className={`flex items-center gap-1 p-1 rounded-full border ${isBgDark ? 'bg-black/15 border-white/10' : 'bg-white/80 border-[#8e6d72]/15'}`}>
                {[5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSetTimerDuration(mins)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 ${
                      timerDuration === mins * 60
                        ? isBgDark 
                          ? 'bg-white text-[#8e6d72] shadow-md font-bold'
                          : 'bg-[#8e6d72] text-white shadow-md font-bold'
                        : isBgDark 
                          ? 'text-white/70 hover:text-white hover:bg-white/5'
                          : 'text-[#8e6d72]/80 hover:text-[#8e6d72] hover:bg-[#8e6d72]/5'
                    }`}
                    id={`timer-preset-${mins}`}
                  >
                    {language === 'en' ? `${mins} Mins` : `${mins}分钟`}
                  </button>
                ))}
              </div>
            </div>

            {/* Breathing Pattern Presets Panel */}
            <div className="w-full max-w-md mx-auto space-y-2 animate-fadeIn">
              <span className={`text-[10px] uppercase font-bold tracking-widest block text-center ${isBgDark ? 'text-pink-200' : 'text-[#8e6d72]'}`}>
                {language === 'en' ? '🧘 Select Breathing Rhythm' : '🧘 冥想呼吸律动选择 (Breathing Patterns)'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 p-1 rounded-2xl border backdrop-blur-md bg-white/20 border-white/10">
                {breathingPatterns.map((pat) => (
                  <button
                    key={pat.id}
                    onClick={() => {
                      setSelectedPatternId(pat.id);
                    }}
                    className={`px-2 py-2 rounded-xl text-[10.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-center cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      selectedPatternId === pat.id
                        ? isBgDark
                          ? 'bg-white text-[#8e6d72] shadow-md font-extrabold scale-105'
                          : 'bg-[#8e6d72] text-white shadow-md font-extrabold scale-105'
                        : isBgDark
                          ? 'text-white hover:bg-white/10'
                          : 'text-[#8e6d72] hover:bg-[#8e6d72]/10'
                    }`}
                    title={pat.desc}
                    id={`pattern-btn-${pat.id}`}
                  >
                    <span>{pat.name}</span>
                    <span className="text-[8px] opacity-75 font-mono truncate max-w-full">({pat.code})</span>
                  </button>
                ))}
              </div>

              {/* Special SOHUM 1-min 6 times -> 1-min 5 times Staged Controller */}
              {selectedPatternId === 'sohum' && (
                <div className={`p-3 rounded-2xl border backdrop-blur-md space-y-2 text-center transition-all ${
                  isBgDark ? 'bg-amber-950/30 border-amber-400/30 text-amber-200' : 'bg-amber-50/80 border-amber-200/80 text-amber-900'
                }`}>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {[
                      { id: 'auto', label: language === 'en' ? '✨ Auto Staged (6/min ➔ 5/min)' : '✨ 智能阶段递进 (1分6次 ➔ 1分5次)' },
                      { id: 'stage1', label: language === 'en' ? '🍃 Stage 1: 6/min (5s/5s)' : '🍃 第1阶段: 6次/分 (5s So/5s Hum)' },
                      { id: 'stage2', label: language === 'en' ? '🌌 Stage 2: 5/min (6s/6s)' : '🌌 第2阶段: 5次/分 (6s So/6s Hum)' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSohumStageMode(mode.id as any)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          sohumStageMode === mode.id
                            ? 'bg-amber-600 text-white shadow-xs scale-105'
                            : 'bg-white/40 text-amber-900/80 hover:bg-white/70'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {/* Real-time Staged Progress Indicator */}
                  <div className="flex items-center justify-center gap-2 text-[10.5px] font-mono font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>
                      {sohumCurrentStage === 1
                        ? (language === 'en' ? `Stage 1: 6 breaths/min (5s/5s) • Breath ${((sohumCycleCount - 1) % 6) + 1}/6` : `当前：第 1 阶段（6次/分 • 5s So吸 / 5s Hum呼 • 第 ${((sohumCycleCount - 1) % 6) + 1}/6 次呼吸）`)
                        : (language === 'en' ? `Stage 2: 5 breaths/min (6s/6s) • Deep Resonance ${((sohumCycleCount - 1) % 5) + 1}/5` : `当前：第 2 阶段（5次/分 • 6s So吸 / 6s Hum呼 • 第 ${((sohumCycleCount - 1) % 5) + 1}/5 次深度同频）`)
                      }
                    </span>
                  </div>
                </div>
              )}

              <p className={`text-[10px] text-center italic ${isBgDark ? 'text-pink-200/70' : 'text-[#8e6d72]/70'}`}>
                ✨ {breathingPatterns.find(p => p.id === selectedPatternId)?.desc}
              </p>
            </div>

            {/* Breathing Guide and Chakra Visualizer Side-by-Side Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch justify-center animate-fadeIn">
              
              {/* Left Side: Breathing Guide */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-4">
                {/* Visual Breathing Nodes / Steps */}
                <div className={`flex flex-wrap items-center justify-center gap-2 md:gap-3 border rounded-2xl px-3 md:px-4 py-1.5 md:py-2 shadow-inner backdrop-blur-sm w-full ${
                  isBgDark ? 'bg-white/5 border-white/10' : 'bg-white/40 border-[#8e6d72]/15'
                }`}>
                  {/* 1. 吸气 Inhale */}
                  <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full text-[11px] md:text-xs transition-all duration-500 ${
                    breathingPhase === 'inhale'
                      ? 'bg-amber-400/25 text-amber-900 dark:text-amber-100 border border-amber-400/40 font-bold scale-105'
                      : isBgDark ? 'text-white/40 border border-transparent' : 'text-[var(--amnd-text-muted)] border border-transparent'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      breathingPhase === 'inhale'
                        ? 'bg-amber-600 dark:bg-amber-300'
                        : isBgDark ? 'bg-white/20' : 'bg-[var(--amnd-border-strong)]'
                    }`} />
                    <span>
                      {language === 'en' ? 'Inhale' : '吸气'}{' '}
                      {breathingPhase === 'inhale' ? `${breathingCountdown}s` : `${currentPattern.inhale}s`}
                    </span>
                  </div>
                  <div className={`w-2.5 h-[1px] ${isBgDark ? 'bg-white/10' : 'bg-[var(--amnd-border)]'}`}></div>

                  {/* 2. 吸气后屏息 Hold In */}
                  <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full text-[11px] md:text-xs transition-all duration-500 ${
                    breathingPhase === 'holdIn'
                      ? 'bg-amber-400/30 text-amber-900 dark:text-amber-100 border border-amber-300/40 font-bold scale-105'
                      : isBgDark ? 'text-white/40 border border-transparent' : 'text-[var(--amnd-text-muted)] border border-transparent'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      breathingPhase === 'holdIn'
                        ? 'bg-amber-700 dark:bg-amber-300'
                        : isBgDark ? 'bg-white/20' : 'bg-[var(--amnd-border-strong)]'
                    }`} />
                    <span>
                      {language === 'en' ? 'Hold' : '屏息'}{' '}
                      {breathingPhase === 'holdIn' ? `${breathingCountdown}s` : `${currentPattern.holdIn}s`}
                    </span>
                  </div>
                  <div className={`w-2.5 h-[1px] ${isBgDark ? 'bg-white/10' : 'bg-[var(--amnd-border)]'}`}></div>

                  {/* 3. 呼气 Exhale */}
                  <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full text-[11px] md:text-xs transition-all duration-500 ${
                    breathingPhase === 'exhale'
                      ? 'bg-sky-400/25 text-sky-900 dark:text-sky-100 border border-sky-300/40 font-bold scale-105'
                      : isBgDark ? 'text-white/40 border border-transparent' : 'text-[var(--amnd-text-muted)] border border-transparent'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      breathingPhase === 'exhale'
                        ? 'bg-sky-600 dark:bg-sky-300'
                        : isBgDark ? 'bg-white/20' : 'bg-[var(--amnd-border-strong)]'
                    }`} />
                    <span>
                      {language === 'en' ? 'Exhale' : '呼气'}{' '}
                      {breathingPhase === 'exhale' ? `${breathingCountdown}s` : `${currentPattern.exhale}s`}
                    </span>
                  </div>

                  {/* 4. 呼气后屏息 Hold Out (only shown for Box breathing patterns) */}
                  {currentPattern.holdOut > 0 && (
                    <>
                      <div className={`w-2.5 h-[1px] ${isBgDark ? 'bg-white/10' : 'bg-[var(--amnd-border)]'}`}></div>
                      <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full text-[11px] md:text-xs transition-all duration-500 ${
                        breathingPhase === 'holdOut'
                          ? 'bg-stone-400/25 text-stone-900 dark:text-stone-100 border border-stone-300/40 font-bold scale-105'
                          : isBgDark ? 'text-white/40 border border-transparent' : 'text-[var(--amnd-text-muted)] border border-transparent'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          breathingPhase === 'holdOut'
                            ? 'bg-stone-600 dark:bg-stone-300'
                            : isBgDark ? 'bg-white/20' : 'bg-[var(--amnd-border-strong)]'
                        }`} />
                        <span>
                          {language === 'en' ? 'Hold' : '屏息'}{' '}
                          {breathingPhase === 'holdOut' ? `${breathingCountdown}s` : `${currentPattern.holdOut}s`}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Interactive Breathing Ring Card */}
                <div className={`flex flex-col items-center justify-center p-6 rounded-3xl border w-full flex-grow backdrop-blur-md shadow-sm transition-all duration-1000 ${
                  isBgDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-[#8e6d72]/20'
                }`}>
                  <BreathingRingWithParticles
                    language={language}
                    breathingPhase={breathingPhase}
                    breathingCountdown={breathingCountdown}
                    breathingText={breathingText}
                    isBgDark={isBgDark}
                    patternType={selectedPatternId}
                    sohumStage={sohumCurrentStage}
                    cycleText={selectedPatternId === 'sohum' ? (sohumCurrentStage === 1 ? `第 ${((sohumCycleCount - 1) % 6) + 1} / 6 次呼吸` : `第 ${((sohumCycleCount - 1) % 5) + 1} / 5 次呼吸`) : undefined}
                    mantraSubtext={selectedPatternId === 'sohum' ? (sohumCurrentStage === 1 ? 'Sah Aham • 我即是彼' : 'Sah Aham • 万物合一') : undefined}
                  />
                  <p className={`text-xs tracking-wide font-medium text-center mt-3 ${isBgDark ? 'text-white/70' : 'text-[#6d5b5e]'}`}>
                    {language === 'en' ? 'Regulate breath, empty thoughts, connect with the cosmic field' : '调匀呼吸，放空思绪，连接宇宙能量场'}
                  </p>
                </div>
              </div>

              {/* Right Side: Dynamic Chakra & Central Channel Visualizer */}
              <div className="lg:col-span-7 flex w-full">
                <ChakraVisualizer
                  language={language}
                  breathingPhase={breathingPhase}
                  breathingCountdown={breathingCountdown}
                  isBgDark={isBgDark}
                  currentPattern={currentPattern}
                />
              </div>
            </div>

            {/* Immersive Text details */}
            <div className="space-y-3 md:space-y-4 px-4 w-full">
              {/* Intent / Wish Selector Bar */}
              <div className={`p-2.5 rounded-2xl border backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shadow-sm ${
                isBgDark ? 'bg-white/10 border-white/15' : 'bg-white/70 border-[#8e6d72]/20'
              }`}>
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full custom-scrollbar py-0.5">
                  <span className={`text-[10.5px] font-bold uppercase tracking-wider pl-1 shrink-0 ${isBgDark ? 'text-pink-200' : 'text-[#8e6d72]'}`}>
                    {language === 'en' ? '🧘 Meditation Topic:' : '🧘 冥想意图:'}
                  </span>
                  
                  {/* Default Universal Cosmic Abundance */}
                  <button
                    type="button"
                    onClick={() => {
                      handleStartManifestationSession(DEFAULT_UNIVERSAL_WISH);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeWishSession.id === DEFAULT_UNIVERSAL_WISH.id
                        ? isBgDark
                          ? 'bg-white text-[#8e6d72] shadow-sm font-extrabold scale-[1.02]'
                          : 'bg-[#8e6d72] text-white shadow-sm font-extrabold scale-[1.02]'
                        : isBgDark
                          ? 'bg-white/10 text-white/80 hover:bg-white/20'
                          : 'bg-white/60 text-[#8e6d72] hover:bg-white/90 border border-[#8e6d72]/15'
                    }`}
                  >
                    <span>✨</span>
                    <span>{language === 'en' ? 'Universal Cosmic Abundance' : '宇宙纯净丰盛 (通用)'}</span>
                  </button>

                  {/* User wishes */}
                  {wishes.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        handleStartManifestationSession(w);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer max-w-[200px] truncate shrink-0 ${
                        activeWishSession.id === w.id
                          ? isBgDark
                            ? 'bg-white text-[#8e6d72] shadow-sm font-extrabold scale-[1.02]'
                            : 'bg-[#8e6d72] text-white shadow-sm font-extrabold scale-[1.02]'
                          : isBgDark
                            ? 'bg-white/10 text-white/80 hover:bg-white/20'
                            : 'bg-white/60 text-[#8e6d72] hover:bg-white/90 border border-[#8e6d72]/15'
                      }`}
                      title={w.title}
                    >
                      <span>💎</span>
                      <span className="truncate">{w.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <h2 className={`text-xl md:text-2xl lg:text-3xl font-serif font-bold tracking-wide transition-colors duration-1000 ${
                  isBgDark ? 'text-white text-shadow text-left' : 'text-[#4a2e31] text-shadow-sm text-left'
                }`}>
                  {activeWishSession.title}
                </h2>
                
                {/* Language Toggles inside immersive view */}
                {activeWishSession.visualizationDetails && (
                  <div className={`flex items-center gap-1 p-0.5 rounded-xl border backdrop-blur-md shrink-0 ${
                    isBgDark ? 'bg-white/10 border-white/15' : 'bg-white/80 border-[#8e6d72]/25'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessionLang('zh');
                        setSpeakingStartIndex(null);
                        const text = activeWishSession.visualizationDetails || activeWishSession.details;
                        if (isSpeaking || isSpeakingLoading) {
                          handleSpeakText(text);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        activeSessionLang === 'zh'
                          ? isBgDark ? 'bg-white text-[#8e6d72] font-extrabold shadow-sm' : 'bg-[#8e6d72] text-white font-extrabold shadow-sm'
                          : isBgDark ? 'text-white/70 hover:text-white' : 'text-[#8e6d72]/80 hover:text-[#8e6d72]'
                      }`}
                    >
                      {language === 'en' ? '🇨🇳 Chinese Scene' : '🇨🇳 中文景像'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessionLang('en');
                        setSpeakingStartIndex(null);
                        const text = activeWishSession.visualizationDetailsEn || activeWishSession.visualizationDetails || activeWishSession.details;
                        if (isSpeaking || isSpeakingLoading) {
                          handleSpeakText(text);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        activeSessionLang === 'en'
                          ? isBgDark ? 'bg-white text-[#8e6d72] font-extrabold shadow-sm' : 'bg-[#8e6d72] text-white font-extrabold shadow-sm'
                          : isBgDark ? 'text-white/70 hover:text-white' : 'text-[#8e6d72]/80 hover:text-[#8e6d72]'
                      }`}
                    >
                      {language === 'en' ? '🇬🇧 English Scene' : '🇬🇧 英文景象'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className={`p-4 md:p-6 rounded-[28px] backdrop-blur-xl shadow-2xl text-left max-h-[160px] md:max-h-[260px] lg:max-h-[340px] overflow-y-auto custom-scrollbar border transition-all duration-1000 ${
                isBgDark 
                  ? 'bg-black/25 border-white/15' 
                  : 'bg-white/70 border-[#8e6d72]/20 shadow-pink-100/10'
              }`}>
                {/* Subtle Interactive Instruction */}
                <div className={`text-[10px] tracking-wider mb-2.5 font-bold flex items-center gap-1.5 opacity-85 ${isBgDark ? 'text-pink-200' : 'text-[#8e6d72]'}`}>
                  <span>
                    {language === 'en' 
                      ? '💡 Tip: Click any sentence below to start narration from that sentence' 
                      : '💡 交互提示：点击下方文字中的任意句子，即可从该句开始定位朗读'}
                  </span>
                </div>

                <p className={`text-xs md:text-sm leading-relaxed tracking-wider font-sans indent-6 transition-colors duration-1000 whitespace-pre-wrap ${
                  isBgDark ? 'text-pink-50/90' : 'text-[#5c3e43] font-medium'
                }`}>
                  {(() => {
                    const fullText = activeSessionLang === 'zh'
                      ? (activeWishSession.visualizationDetails || activeWishSession.details)
                      : (activeWishSession.visualizationDetailsEn || (language === 'en' ? '[Please click "Re-sensitize Luxury Details" in the card to activate English scenario]' : '【请在愿望卡片中，点击“重新感应奢华细节”以激活专属英文沉浸式场景】'));

                    const segments = getSentenceSegments(fullText);
                    return segments.map((segment, index) => {
                      const isSelected = isSpeaking && speakingStartIndex === segment.startIndex;
                      return (
                        <span
                          key={index}
                          onClick={() => {
                            setSpeakingStartIndex(segment.startIndex);
                            handleSpeakText(segment.fullTextFromHere);
                          }}
                          className={`cursor-pointer rounded px-0.5 transition-all duration-300 ${
                            isSelected
                              ? 'bg-pink-500/25 dark:bg-pink-400/25 text-pink-700 dark:text-pink-100 ring-1 ring-pink-400/40 font-bold shadow-sm'
                              : isBgDark
                                ? 'hover:bg-white/10 hover:text-white'
                                : 'hover:bg-[#8e6d72]/10 hover:text-[#5c3e43]'
                          }`}
                          title={language === 'en' ? '🖱️ Click to start narration from here' : '🖱️ 点击从此句开始定位朗读'}
                        >
                          {isSelected && (
                            <span className="inline-flex items-center text-pink-500 dark:text-pink-300 mr-1 animate-pulse">
                              🔊
                            </span>
                          )}
                          {segment.text}
                        </span>
                      );
                    });
                  })()}
                </p>
              </div>
            </div>

            {/* Speaking voice status & Tone Adjustment Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
              {/* Speaking voice status & Tone Adjustment Controls */}
              <div className="flex flex-col items-center space-y-3 bg-white/15 dark:bg-black/25 backdrop-blur-md p-4 rounded-[24px] border border-white/15 w-full shadow-lg">
                <div className="flex items-center justify-between w-full border-b border-white/10 pb-1.5">
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${isBgDark ? 'text-pink-200' : 'text-[#8e6d72]'}`}>
                    {language === 'en' ? '🗣️ Narration Voice Control' : '🗣️ 智能显化配音调节 (Narration Voice)'}
                  </span>
                  {isSpeakingLoading && (
                    <span className="text-[9.5px] text-amber-500 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {language === 'en' ? 'Loading voice...' : '正在载入中...'}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {[
                    { id: 'deep-female', name: language === 'en' ? 'Serene Deep Female 🪐' : '静谧深沉女声 🪐', desc: 'Serene Deep' },
                    { id: 'royal-lady', name: language === 'en' ? 'Gentle Elegant Lady 👑' : '温婉贵族女声 👑', desc: 'Royal Elegant' },
                    { id: 'magnetic-male', name: language === 'en' ? 'Magnetic Ancient Male 🌌' : '古雅磁性男声 🌌', desc: 'Magnetic Deep' },
                    { id: 'grounding-male', name: language === 'en' ? 'Healing Grounding Male 🧘' : '低频疗愈男声 🧘', desc: 'Grounding Low' },
                  ].map((tone) => (
                    <button
                      key={tone.id}
                      onClick={async () => {
                        setVoiceTone(tone.id as any);
                        // If speaking, immediately cross-fade and speak with the new tone
                        const textToRead = activeSessionLang === 'zh'
                          ? (activeWishSession.visualizationDetails || activeWishSession.details)
                          : (activeWishSession.visualizationDetailsEn || activeWishSession.visualizationDetails || activeWishSession.details);
                        if ((isSpeaking || isSpeakingLoading) && textToRead) {
                          handleSpeakText(textToRead, tone.id as any);
                        }
                      }}
                      className={`py-1.5 rounded-xl text-center text-[10.5px] transition-all duration-300 border flex flex-col items-center justify-center ${
                        voiceTone === tone.id
                          ? 'bg-white text-[#8e6d72] border-white shadow-sm font-bold scale-[1.02]'
                          : isBgDark
                            ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                            : 'bg-white/40 border-[#8e6d72]/10 text-[#4a3a3a] hover:bg-white/60'
                      }`}
                      id={`immersive-tone-${tone.id}`}
                    >
                      <span className="font-semibold">{tone.name}</span>
                      <span className="text-[7.5px] opacity-70 font-mono tracking-wider">{tone.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2.5 w-full pt-1">
                  <button
                    onClick={() => {
                      const textToRead = activeSessionLang === 'zh'
                        ? (activeWishSession.visualizationDetails || activeWishSession.details)
                        : (activeWishSession.visualizationDetailsEn || activeWishSession.visualizationDetails || activeWishSession.details);
                      if (isSpeaking || isSpeakingLoading) {
                        handleStopSpeaking();
                      } else if (textToRead) {
                        handleSpeakText(textToRead);
                      }
                    }}
                    disabled={isSpeakingLoading}
                    className={`flex-1 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer ${
                      isSpeaking 
                        ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
                        : isSpeakingLoading
                          ? 'bg-[#8e6d72]/40 text-white/50 cursor-not-allowed'
                          : isBgDark 
                            ? 'bg-white/15 text-white hover:bg-white/25 border border-white/20' 
                            : 'bg-[#8e6d72] text-white hover:bg-[#8e6d72]/90 border border-transparent'
                    }`}
                    id="immersive-tts-toggle-btn"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>
                      {isSpeaking 
                        ? (language === 'en' ? 'Mute Voice Narration' : '静音语音朗读') 
                        : isSpeakingLoading 
                          ? (language === 'en' ? 'Preparing voice waves...' : '声波准备中...') 
                          : (language === 'en' ? 'Play Voice Narration' : '播放深沉女声朗读')}
                    </span>
                  </button>
                </div>
              </div>

              {/* 🌌 冥想背景声波控制 */}
              <div className="flex flex-col space-y-3 bg-white/15 dark:bg-black/25 backdrop-blur-md p-4 rounded-[24px] border border-white/15 w-full shadow-lg text-left justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between w-full border-b border-white/10 pb-1.5">
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${isBgDark ? 'text-pink-200' : 'text-[#8e6d72]'}`}>
                      {language === 'en' ? '🌌 Meditation Background Acoustics' : '🌌 冥想背景声波设置 (Acoustics)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBackgroundAudioEnabled(!isBackgroundAudioEnabled)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-95 ${
                        isBackgroundAudioEnabled
                          ? isBgDark
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-emerald-500/15 text-emerald-800 border-emerald-500/20'
                          : isBgDark
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-rose-500/10 text-rose-800 border-rose-500/20'
                      }`}
                      title={isBackgroundAudioEnabled ? (language === 'en' ? "Mute background" : "静音背景音") : (language === 'en' ? "Enable background" : "开启背景音")}
                      id="master-background-audio-toggle"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isBackgroundAudioEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                      <span>
                        {language === 'en' 
                          ? `Acoustics: ${isBackgroundAudioEnabled ? 'ON' : 'MUTED'}` 
                          : `背景音: ${isBackgroundAudioEnabled ? '开启' : '静音'}`}
                      </span>
                    </button>
                  </div>

                  {!isBackgroundAudioEnabled && (
                    <div className={`p-2 rounded-xl text-[9.5px] leading-relaxed transition-all animate-fadeIn ${
                      isBgDark ? 'bg-rose-500/10 text-rose-200/90 border border-rose-500/20' : 'bg-rose-500/5 text-rose-900/90 border border-rose-500/10'
                    }`}>
                      {language === 'en' 
                        ? '✨ Background audio is currently muted in this breathing phase. Toggle ON to immerse in environment ambient sounds or Solfeggio frequency waves.'
                        : '✨ 背景音已在当前呼吸环节中静音。开启后即可沉浸于“纯粹环境音”或“频率引导音”，进入深层显化磁场。'}
                    </div>
                  )}

                  <div className={`grid grid-cols-2 p-0.5 rounded-xl border backdrop-blur-md ${
                    isBgDark ? 'bg-white/10 border-white/15' : 'bg-white/80 border-[#8e6d72]/25'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setMeditationSoundType('ambient')}
                      className={`py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                        meditationSoundType === 'ambient'
                          ? isBgDark ? 'bg-white text-[#8e6d72] shadow-sm font-extrabold' : 'bg-[#8e6d72] text-white shadow-sm font-extrabold'
                          : isBgDark ? 'text-white/70 hover:text-white' : 'text-[#8e6d72]/80 hover:text-[#8e6d72]'
                      }`}
                    >
                      {language === 'en' ? '🎵 Ambient Sound' : '🎵 纯粹环境音'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeditationSoundType('solfeggio')}
                      className={`py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                        meditationSoundType === 'solfeggio'
                          ? isBgDark ? 'bg-white text-[#8e6d72] shadow-sm font-extrabold' : 'bg-[#8e6d72] text-white shadow-sm font-extrabold'
                          : isBgDark ? 'text-white/70 hover:text-white' : 'text-[#8e6d72]/80 hover:text-[#8e6d72]'
                      }`}
                    >
                      {language === 'en' ? '🧠 Solfeggio Frequency' : '🧠 频率引导音'}
                    </button>
                  </div>

                  {meditationSoundType === 'ambient' ? (
                    <div className="space-y-1 bg-white/5 dark:bg-black/10 p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-[10.5px] font-semibold">
                        <span className={isBgDark ? 'text-white/80' : 'text-[#4a3a3a]'}>
                          {language === 'en' ? 'Ambient Volume' : '环境伴奏音量'}
                        </span>
                        <span className="font-mono text-[10px]">{Math.round(musicVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !isMusicPlaying;
                            setIsMusicPlaying(next);
                            if (next) {
                              setIsBackgroundAudioEnabled(true);
                            } else {
                              setIsBackgroundAudioEnabled(false);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            isBgDark ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-[#8e6d72]/15 hover:bg-[#8e6d72]/25 text-[#8e6d72]'
                          }`}
                          title={isMusicPlaying ? (language === 'en' ? "Pause ambient sound" : "暂停环境音") : (language === 'en' ? "Play ambient sound" : "播放环境音")}
                        >
                          {isMusicPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={musicVolume}
                          onChange={(e) => setMusicVolume(Number(e.target.value))}
                          className="w-full accent-[#8e6d72] h-1 bg-gray-200/40 rounded-lg cursor-pointer animate-fadeIn"
                        />
                      </div>
                      <div className="text-[9px] text-[#b49196] font-medium leading-tight truncate mt-1">
                        {language === 'en' ? 'Current Track: ' : '当前音轨: '}
                        {language === 'en' && currentTrack.nameEn ? currentTrack.nameEn : currentTrack.name}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-fadeIn">
                      <div className="space-y-1 bg-white/5 dark:bg-black/10 p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between text-[10.5px] font-semibold">
                          <span className={isBgDark ? 'text-white/80' : 'text-[#4a3a3a]'}>
                            {language === 'en' ? 'Solfeggio Volume' : '频率声波强度'}
                          </span>
                          <span className="font-mono text-[10px]">{Math.round(solfeggioVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="1"
                          step="0.05"
                          value={solfeggioVolume}
                          onChange={(e) => setSolfeggioVolume(Number(e.target.value))}
                          className="w-full accent-[#8e6d72] h-1 bg-gray-200/40 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className={`text-[9px] uppercase font-bold tracking-wider block ${isBgDark ? 'text-pink-200/80' : 'text-[#8e6d72]/80'}`}>
                          {language === 'en' ? 'Select Resonance Frequency' : '选择宇宙显化频段 (Solfeggio)'}
                        </span>
                        <div className="grid grid-cols-1 gap-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-0.5">
                          {[
                            {
                              hz: 432,
                              emoji: '🌌',
                              title: language === 'en' ? '432 Hz Cosmic Resonance' : '432 Hz 宇宙共振',
                              desc: language === 'en' ? 'Heal mind & body, empty thoughts' : '疗愈身心，放空思绪'
                            },
                            {
                              hz: 528,
                              emoji: '✨',
                              title: language === 'en' ? '528 Hz Miracle Transformation' : '528 Hz 奇迹转化',
                              desc: language === 'en' ? 'Cell resonance, manifest miracles' : '细胞共振，显化奇迹'
                            },
                            {
                              hz: 396,
                              emoji: '🧘',
                              title: language === 'en' ? '396 Hz Deep Liberation' : '396 Hz 深度释怀',
                              desc: language === 'en' ? 'Clear fear, unlock security' : '清洗恐惧，打通安全感'
                            },
                            {
                              hz: 639,
                              emoji: '💖',
                              title: language === 'en' ? '639 Hz Elegant Love Resonance' : '639 Hz 极奢爱共振',
                              desc: language === 'en' ? 'Open Heart chakra, manifest harmony' : '打开心轮，显化贵人'
                            },
                            {
                              hz: 963,
                              emoji: '👑',
                              title: language === 'en' ? '963 Hz Crown Pure Consciousness' : '963 Hz 神性纯意识',
                              desc: language === 'en' ? 'Connect Crown chakra, high dimension' : '连接顶轮，高维显化'
                            }
                          ].map((freq) => (
                            <button
                              key={freq.hz}
                              type="button"
                              onClick={() => setSolfeggioFrequency(freq.hz)}
                              className={`p-1.5 rounded-xl text-left text-[10px] transition-all border flex items-center justify-between gap-1.5 cursor-pointer ${
                                solfeggioFrequency === freq.hz
                                  ? 'bg-white text-[#8e6d72] border-white shadow-sm font-bold scale-[1.01]'
                                  : isBgDark
                                    ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                                    : 'bg-white/40 border-[#8e6d72]/10 text-[#4a3a3a] hover:bg-white/60'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-xs shrink-0">{freq.emoji}</span>
                                <div className="truncate">
                                  <span className="font-bold block leading-tight">{freq.title}</span>
                                  <span className="text-[8px] opacity-75 block font-normal leading-tight truncate">{freq.desc}</span>
                                </div>
                              </div>
                              <span className="font-mono text-[9px] shrink-0 bg-[#8e6d72]/10 px-1 py-0.5 rounded border border-[#8e6d72]/15">{freq.hz}Hz</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Ambient reassurance */}
          <div className={`flex flex-col md:flex-row items-center justify-between w-full shrink-0 border-t pt-4 relative z-10 text-xs space-y-2 md:space-y-0 font-medium ${
            isBgDark ? 'border-white/20 text-white/70' : 'border-[#8e6d72]/20 text-[#6d5b5e]'
          }`}>
            <span>
              {language === 'en' 
                ? '🌸 Every beautiful moment is recorded in your peaceful river of life' 
                : '🌸 每一个美好的瞬间，都已经记载在您的生命长河里'}
            </span>
            <div className="flex items-center space-x-4">
              <span>
                {language === 'en' ? 'Ambient Track: ' : '背景乐: '}
                {language === 'en' && currentTrack.nameEn ? currentTrack.nameEn : currentTrack.name}
              </span>
              <span>•</span>
              <span>
                {language === 'en' ? 'Color Palette: ' : '主色调: '}
                {language === 'en' && activeTheme.nameEn ? activeTheme.nameEn : activeTheme.name}
              </span>
            </div>
          </div>
          </div>

          {/* MEDITATION FINISHED CALM OVERLAY */}
          {showFinishedOverlay && (
            <div className="fixed inset-0 z-[70] bg-[#262320]/60 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-6 md:p-8 overflow-y-auto animate-fadeIn" id="finished-overlay">
              <div className="bg-[var(--amnd-bg-elevated)] max-w-lg p-6 md:p-10 rounded-[28px] border border-[var(--amnd-border)] shadow-2xl flex flex-col items-center space-y-5 md:space-y-6 my-auto text-[var(--amnd-text-primary)]">
                <div className="w-12 h-12 rounded-2xl bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border)] flex items-center justify-center text-[var(--amnd-wood)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--amnd-text-primary)] tracking-wide">
                    {language === 'en' ? 'Stillness Complete · Walk with Clarity' : '静坐圆满 · 带着清明前行'}
                  </h3>
                  <span className="text-[11px] uppercase tracking-widest text-[var(--amnd-text-muted)] font-mono block">
                    Session Completed
                  </span>
                </div>

                <div className="w-12 h-[1px] bg-[var(--amnd-border-strong)]"></div>

                <p className="text-xs md:text-sm text-[var(--amnd-text-secondary)] leading-relaxed font-sans">
                  {language === 'en'
                    ? 'Thank yourself for giving this quiet time back to your breath and body. Carry this steadiness gently into your next ordinary action.'
                    : '感谢自己将这段安静的时间留给呼吸与身心。带着这份平稳与清醒，从容走回接下来的日常行动。'}
                </p>

                {/* Dynamic Gratitude Whisper Block */}
                {selectedGratitudeWhisper && (
                  <div className="w-full bg-[var(--amnd-bg-secondary)] rounded-2xl p-4 md:p-5 border border-[var(--amnd-border)] text-center">
                    <span className="text-[10px] uppercase font-medium tracking-widest text-[var(--amnd-text-muted)] block mb-2">
                      {language === 'en' ? 'Closing Reflection' : '今日静心余韵'}
                    </span>
                    <blockquote className="font-serif italic text-xs md:text-sm text-[var(--amnd-text-primary)] leading-relaxed">
                      “ {selectedGratitudeWhisper} ”
                    </blockquote>
                  </div>
                )}

                <div className="w-full text-left space-y-3 pt-1">
                  <span className="text-[10px] uppercase font-medium tracking-widest text-[var(--amnd-text-muted)] block text-center mb-1">
                    {language === 'en' ? 'Gentle Transition Steps' : '出定后的温和收尾'}
                  </span>
                  <div className="grid grid-cols-1 gap-2 text-xs text-[var(--amnd-text-secondary)]">
                    <p>
                      <strong className="text-[var(--amnd-text-primary)] font-medium">01 · {language === 'en' ? 'Sense your breath' : '觉察呼吸'}：</strong>
                      {language === 'en' ? 'Notice your shoulders soften before opening your eyes fully.' : '缓缓睁眼之前，先感受双肩与下颌的自然放松。'}
                    </p>
                    <p>
                      <strong className="text-[var(--amnd-text-primary)] font-medium">02 · {language === 'en' ? 'Offer quiet gratitude' : '心怀感恩'}：</strong>
                      {language === 'en' ? 'Acknowledge what feels supportive and steady in your life right now.' : '感谢此刻陪伴着你的稳定细节，无论大小。'}
                    </p>
                    <p>
                      <strong className="text-[var(--amnd-text-primary)] font-medium">03 · {language === 'en' ? 'Record a clear note' : '记下一句感悟'}：</strong>
                      {language === 'en' ? 'Optionally capture one honest thought in My Space.' : '如有清明浮现的想法，可返回后记入「我的空间」。'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExitManifestationSession}
                  className="w-full sm:w-auto px-8 py-3 amnd-btn-primary font-medium text-xs transition-colors cursor-pointer"
                  id="finished-exit-btn"
                >
                  {language === 'en' ? 'Return to Sanctuary' : '带着清明回归'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Share & Data Export/Import Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        language={language}
        wishes={wishes}
        onImportData={(importedWishes) => {
          saveWishesToStorage(importedWishes);
        }}
      />

      {/* Footer credits (with extra mobile bottom padding so fixed tab bar never covers it) */}
      <footer className="text-center pt-10 pb-24 md:pb-10 px-4 text-xs border-t border-[var(--amnd-border)] mt-14 bg-[var(--amnd-bg-secondary)]/70 text-[var(--amnd-text-secondary)]">
        <img
          src="/logo-icon.png"
          alt="AMND Manifestation"
          className="w-10 h-10 mx-auto mb-2.5 object-contain select-none"
        />
        <p className="font-serif text-sm font-semibold text-[var(--amnd-text-primary)]">
          AMND Manifestation · Amanda 的学海魔法屋
        </p>
        <p className="mt-1.5 text-xs text-[var(--amnd-text-muted)]">
          {language === 'en'
            ? 'Learn, and Magic Manifests. · Learning → Awareness → Stillness → Manifestation'
            : '学习了，魔法会显化。 · 学习 → 觉察 → 静心 → 显化'}
        </p>
      </footer>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation Bar (58px tall + 56px top bar = 114px < 15% of 844px mobile viewport) */}
      <nav
        aria-label={language === 'en' ? 'Mobile navigation' : '移动端底部导航'}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[58px] bg-[var(--amnd-bg-elevated)]/95 backdrop-blur-md border-t border-[var(--amnd-border)] grid grid-cols-6 px-1"
        id="mobile-bottom-nav"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              id={`mobile-nav-${item.id}`}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'text-[var(--amnd-wood)] font-semibold'
                  : 'text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span
                className={`leading-tight text-center ${
                  item.id === 'temple' && language === 'en'
                    ? 'text-[9px] px-0.5 line-clamp-2'
                    : 'text-[10px] leading-none whitespace-nowrap'
                }`}
              >
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
