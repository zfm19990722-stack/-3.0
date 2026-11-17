import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { MusicTrack } from '../types';
import {
  NatureSoundType,
  NATURE_SOUNDSCAPES_OPTIONS,
  setupNatureSoundscape,
  SoundscapeHandle,
} from '../services/natureSoundscapes';
import {
  Music,
  Play,
  Pause,
  Plus,
  Link2,
  Upload,
  Volume2,
  Mic,
  Square,
  Download,
  Save,
  Sparkles,
  Trash2,
  Headphones,
  Activity,
  Sliders,
  Check,
  VolumeX,
  X,
  Clock,
  ChevronRight,
  Waves,
  TreePine,
  CloudRain,
  Wind,
} from 'lucide-react';

interface AudioPlayerProps {
  currentTrack: MusicTrack;
  onTrackChange: (track: MusicTrack) => void;
  tracks: MusicTrack[];
  onAddCustomTrack: (track: MusicTrack) => void;
  voiceTone: 'deep-female' | 'royal-lady' | 'magnetic-male' | 'grounding-male';
  onVoiceToneChange: (tone: 'deep-female' | 'royal-lady' | 'magnetic-male' | 'grounding-male') => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  activeWishSession?: any; // Automatically triggers looping personal voice affirmation if configured
  language?: 'zh' | 'en';
}

interface SavedVoice {
  id: string;
  name: string;
  duration: number; // in seconds
  createdAt: string;
  audioBase64: string; // Base64 data URL for local persistence
}

export default function AudioPlayer({
  currentTrack,
  onTrackChange,
  tracks,
  onAddCustomTrack,
  voiceTone,
  onVoiceToneChange,
  isPlaying,
  setIsPlaying,
  volume,
  setVolume,
  activeWishSession,
  language = 'zh',
}: AudioPlayerProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'tracks' | 'composer' | 'voice'>('tracks');

  // Toast notification state for non-blocking feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Solfeggio Composer states
  const [composerHz, setComposerHz] = useState<number>(528);
  const [composerWave, setComposerWave] = useState<OscillatorType>('sine');
  const [composerBeat, setComposerBeat] = useState<'none' | 'theta' | 'alpha' | 'delta'>('theta');
  const [composerNature, setComposerNature] = useState<NatureSoundType>('ocean');
  const [composerNatureVol, setComposerNatureVol] = useState<number>(0.65);
  const [composerName, setComposerName] = useState<string>('');
  const [isLiveComposing, setIsLiveComposing] = useState<boolean>(false);
  const [isRecordingComposer, setIsRecordingComposer] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);

  // Personal Voice Studio states
  const [customVoices, setCustomVoices] = useState<SavedVoice[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceRecordName, setVoiceRecordName] = useState<string>('');
  const [voiceRecordSeconds, setVoiceRecordSeconds] = useState<number>(0);
  const [selectedVoiceMantraId, setSelectedVoiceMantraId] = useState<string | null>(null);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState<string | null>(null);

  // Audio elements & node references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null); // For looping mantra in active session
  const previewAudioRef = useRef<HTMLAudioElement | null>(null); // For playing local preview in list

  // Synth AudioContext elements
  const synthIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const natureSoundscapeHandleRef = useRef<SoundscapeHandle | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const activeGainNodesRef = useRef<GainNode[]>([]);
  const activeSourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  // Mic recording references
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<number | null>(null);

  // Load archived voices on mount
  useEffect(() => {
    const loaded = localStorage.getItem('lumiere_saved_voices');
    if (loaded) {
      try {
        const parsed = JSON.parse(loaded);
        setCustomVoices(parsed);
        // Default select first voice if available
        if (parsed.length > 0) {
          setSelectedVoiceMantraId(parsed[0].id);
        }
      } catch (e) {
        console.error('Error loading saved voices:', e);
      }
    }
  }, []);

  // Standard audio initialization
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      stopSynth();
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
      }
    };
  }, []);

  // Sync active track source and play/pause state
  useEffect(() => {
    if (!audioRef.current) return;

    // If active track is a synthesized preset
    if (currentTrack.id === 'princess-synth' || currentTrack.id.startsWith('custom-synth-')) {
      audioRef.current.pause();
      if (isPlaying) {
        startSynth();
      } else {
        stopSynth();
      }
      return;
    }

    // Standard static MP3 track
    stopSynth();
    audioRef.current.src = currentTrack.url;
    audioRef.current.volume = volume;

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn('Audio play gesture required:', err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [currentTrack, isPlaying]);

  // Handle master volume adjustments dynamically
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (mainGainRef.current && audioCtxRef.current) {
      mainGainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // Loop custom affirmation recording inside the active wish focus session automatically!
  useEffect(() => {
    if (!voiceAudioRef.current) {
      voiceAudioRef.current = new Audio();
      voiceAudioRef.current.loop = true;
    }

    if (activeWishSession && selectedVoiceMantraId && isPlaying) {
      const selectedVoice = customVoices.find((v) => v.id === selectedVoiceMantraId);
      if (selectedVoice) {
        voiceAudioRef.current.src = selectedVoice.audioBase64;
        voiceAudioRef.current.volume = volume * 0.75; // Balanced with background music
        voiceAudioRef.current.play().catch((err) => {
          console.warn('Personal mantra loop failed to start:', err);
        });
      }
    } else {
      voiceAudioRef.current.pause();
    }

    return () => {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
      }
    };
  }, [activeWishSession, selectedVoiceMantraId, isPlaying, customVoices, volume]);

  // Helper: Parse Synthesizer settings from saved custom preset string
  const parseSynthUrl = (url: string) => {
    if (!url.startsWith('synth:')) return null;
    const params = new URLSearchParams(url.substring(6));
    return {
      freq: parseFloat(params.get('freq') || '528'),
      wave: (params.get('wave') || 'sine') as OscillatorType,
      beat: (params.get('beat') || 'theta') as 'none' | 'theta' | 'alpha' | 'delta',
      soundscape: (params.get('soundscape') || 'ocean') as NatureSoundType,
      natureVol: parseFloat(params.get('natureVol') || '0.65'),
    };
  };

  // Live procedural synthesis using Web Audio API
  const startSynth = () => {
    let baseHz = 528;
    let waveShape: OscillatorType = 'sine';
    let beatType: 'none' | 'theta' | 'alpha' | 'delta' = 'theta';
    let natureType: NatureSoundType = 'ocean';
    let natureVol = 0.65;

    if (currentTrack.id.startsWith('custom-synth-')) {
      const parsed = parseSynthUrl(currentTrack.url);
      if (parsed) {
        baseHz = parsed.freq;
        waveShape = parsed.wave;
        beatType = parsed.beat;
        natureType = parsed.soundscape;
        natureVol = parsed.natureVol;
      }
    } else if (currentTrack.id === 'princess-synth') {
      // Celestial default parameters
      baseHz = 432;
      waveShape = 'sine';
      beatType = 'theta';
      natureType = 'ocean';
      natureVol = 0.65;
    }

    runProceduralSynth(baseHz, waveShape, beatType, natureType, natureVol);
  };

  const stopSynth = () => {
    setIsLiveComposing(false);
    if (synthIntervalRef.current) {
      clearTimeout(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }

    if (natureSoundscapeHandleRef.current) {
      natureSoundscapeHandleRef.current.stop();
      natureSoundscapeHandleRef.current = null;
    }

    const oscsToStop = [...activeOscillatorsRef.current];
    const srcsToStop = [...activeSourceNodesRef.current];
    const ctx = audioCtxRef.current;

    activeOscillatorsRef.current = [];
    activeSourceNodesRef.current = [];

    oscsToStop.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    srcsToStop.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });

    if (ctx && ctx.state !== 'closed') {
      try {
        ctx.close();
      } catch (e) {}
    }
    audioCtxRef.current = null;
    mainGainRef.current = null;
  };

  // Real-time live parameter updating: when playing in composer tab, immediately morph sound
  const handleUpdateComposerSetting = (
    newHz = composerHz,
    newWave = composerWave,
    newBeat = composerBeat,
    newNature = composerNature,
    newNatureVol = composerNatureVol
  ) => {
    if (isLiveComposing) {
      runProceduralSynth(newHz, newWave, newBeat, newNature, newNatureVol);
    }
  };

  // Real-time change of nature soundscape without restarting tonal oscillators
  const handleSelectNature = (nat: NatureSoundType) => {
    setComposerNature(nat);
    if (isLiveComposing && audioCtxRef.current && mainGainRef.current) {
      if (natureSoundscapeHandleRef.current) {
        natureSoundscapeHandleRef.current.stop();
        natureSoundscapeHandleRef.current = null;
      }
      natureSoundscapeHandleRef.current = setupNatureSoundscape(
        audioCtxRef.current,
        mainGainRef.current,
        nat,
        composerNatureVol
      );
    }
  };

  // Real-time nature volume slider adjustment
  const handleNatureVolumeChange = (newVol: number) => {
    setComposerNatureVol(newVol);
    if (natureSoundscapeHandleRef.current) {
      natureSoundscapeHandleRef.current.setVolume(newVol);
    }
  };

  // Run the synthesizer engine with parameterized nodes
  const runProceduralSynth = (
    baseHz: number,
    waveShape: OscillatorType,
    beatType: 'none' | 'theta' | 'alpha' | 'delta',
    natureType: NatureSoundType,
    natureVol = composerNatureVol
  ) => {
    // Stop any existing synthesis cleanly
    if (synthIntervalRef.current) {
      clearTimeout(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (natureSoundscapeHandleRef.current) {
      natureSoundscapeHandleRef.current.stop();
      natureSoundscapeHandleRef.current = null;
    }
    activeOscillatorsRef.current.forEach((osc) => {
      try { osc.stop(); osc.disconnect(); } catch (e) {}
    });
    activeSourceNodesRef.current.forEach((src) => {
      try { src.stop(); src.disconnect(); } catch (e) {}
    });
    activeOscillatorsRef.current = [];
    activeSourceNodesRef.current = [];

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch (e) {}
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;
    setIsLiveComposing(true);

    if (ctx.state === 'suspended') {
      ctx.resume().catch((err) => console.warn('AudioContext resume:', err));
    }

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(volume > 0 ? volume : 0.7, ctx.currentTime);
    mainGain.connect(ctx.destination);
    mainGainRef.current = mainGain;

    // Ethereal Feedback Delay Network
    const delayNode = ctx.createDelay(3.0);
    const delayFeedback = ctx.createGain();
    const delayFilter = ctx.createBiquadFilter();

    delayNode.delayTime.setValueAtTime(1.2, ctx.currentTime);
    delayFeedback.gain.setValueAtTime(0.55, ctx.currentTime);
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(800, ctx.currentTime);

    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(mainGain);

    // A. Soft base ambient pad
    const playDrone = (freq: number, type: OscillatorType, level: number) => {
      const osc1 = ctx.createOscillator();
      osc1.type = type;
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = type;
      osc2.frequency.setValueAtTime(freq, ctx.currentTime);
      osc2.detune.setValueAtTime(-12, ctx.currentTime);

      const osc3 = ctx.createOscillator();
      osc3.type = type;
      osc3.frequency.setValueAtTime(freq, ctx.currentTime);
      osc3.detune.setValueAtTime(12, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      const oscGain = ctx.createGain();
      const t = ctx.currentTime;
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(level * 0.45, t + 1.2);
      oscGain.gain.linearRampToValueAtTime(level * 0.38, t + 2.5);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(level * 0.15, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(mainGain);

      const droneDelaySend = ctx.createGain();
      droneDelaySend.gain.setValueAtTime(0.22, ctx.currentTime);
      oscGain.connect(droneDelaySend);
      droneDelaySend.connect(delayNode);

      osc1.start();
      osc2.start();
      osc3.start();
      lfo.start();

      activeOscillatorsRef.current.push(osc1, osc2, osc3, lfo);
    };

    // Synthesize harmonious chord frequencies
    playDrone(baseHz / 2, waveShape, 0.55);
    playDrone(baseHz, waveShape, 0.35);
    playDrone(baseHz * 1.5, 'sine', 0.25);

    // B. Scientific Binaural Brainwave Beats
    let beatFreq = 0;
    if (beatType === 'theta') beatFreq = 4;
    else if (beatType === 'alpha') beatFreq = 8;
    else if (beatType === 'delta') beatFreq = 2;

    if (beatFreq > 0) {
      const carrier = 150;

      const oscL = ctx.createOscillator();
      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(carrier, ctx.currentTime);
      const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const gainL = ctx.createGain();
      gainL.gain.setValueAtTime(0.18, ctx.currentTime);

      const oscR = ctx.createOscillator();
      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(carrier + beatFreq, ctx.currentTime);
      const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const gainR = ctx.createGain();
      gainR.gain.setValueAtTime(0.18, ctx.currentTime);

      if (pannerL && pannerR) {
        pannerL.pan.setValueAtTime(-1, ctx.currentTime);
        pannerR.pan.setValueAtTime(1, ctx.currentTime);

        oscL.connect(gainL);
        gainL.connect(pannerL);
        pannerL.connect(mainGain);

        oscR.connect(gainR);
        gainR.connect(pannerR);
        pannerR.connect(mainGain);
      } else {
        oscL.connect(gainL);
        gainL.connect(mainGain);
        oscR.connect(gainR);
        gainR.connect(mainGain);
      }

      oscL.start();
      oscR.start();
      activeOscillatorsRef.current.push(oscL, oscR);
    }

    // C. High-Fidelity Natural Soundscapes (Pink/Brown noise, dynamic LFOs & generative acoustics)
    natureSoundscapeHandleRef.current = setupNatureSoundscape(ctx, mainGain, natureType, natureVol);

    // D. Soft sparkling Solfeggio chimes
    const pentatonicScale = [1, 1.25, 1.5, 1.875, 2, 2.5, 3];
    const playChimeNote = () => {
      if (!audioCtxRef.current) return;
      const t = ctx.currentTime;
      const ratio = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
      const freq = baseHz * ratio;

      const osc1 = ctx.createOscillator();
      osc1.type = waveShape === 'sine' ? 'sine' : 'triangle';
      osc1.frequency.setValueAtTime(freq, t);

      const osc2 = ctx.createOscillator();
      osc2.type = waveShape === 'sine' ? 'sine' : 'triangle';
      osc2.frequency.setValueAtTime(freq, t);
      osc2.detune.setValueAtTime(8, t);

      const osc3 = ctx.createOscillator();
      osc3.type = waveShape === 'sine' ? 'sine' : 'triangle';
      osc3.frequency.setValueAtTime(freq, t);
      osc3.detune.setValueAtTime(-8, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, t);

      const chimeGain = ctx.createGain();
      const peakVolume = 0.08;
      const sustainVolume = peakVolume * 0.35;
      
      chimeGain.gain.setValueAtTime(0, t);
      chimeGain.gain.linearRampToValueAtTime(peakVolume, t + 0.15);
      chimeGain.gain.linearRampToValueAtTime(sustainVolume, t + 0.55);
      const releaseStart = t + 1.25;
      chimeGain.gain.setValueAtTime(sustainVolume, releaseStart);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + 4.5);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(chimeGain);
      chimeGain.connect(mainGain);

      const chimeDelaySend = ctx.createGain();
      chimeDelaySend.gain.setValueAtTime(0.65, t);
      chimeGain.connect(chimeDelaySend);
      chimeDelaySend.connect(delayNode);

      osc1.start(t);
      osc2.start(t);
      osc3.start(t);
      osc1.stop(t + 6);
      osc2.stop(t + 6);
      osc3.stop(t + 6);

      activeOscillatorsRef.current.push(osc1, osc2, osc3);
    };

    // Play initial chime
    playChimeNote();

    // Re-schedule chime interval loops
    const chimeLoop = () => {
      const nextTime = Math.random() * 1800 + 1800;
      synthIntervalRef.current = window.setTimeout(() => {
        playChimeNote();
        chimeLoop();
      }, nextTime);
    };
    chimeLoop();
  };

  // Render, record, and instantly download the procedural composition
  const handleRecordComposer = async () => {
    if (isRecordingComposer) return;
    setIsRecordingComposer(true);
    setRecordingProgress(12); // Record a premium 12-second high-fidelity looping file

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const dest = ctx.createMediaStreamDestination();

    // Create a rendering gain node connected directly to recorder destination
    const renderingGain = ctx.createGain();
    renderingGain.gain.setValueAtTime(0.85, ctx.currentTime);
    renderingGain.connect(dest);
    renderingGain.connect(ctx.destination); // Play locally so user can monitor

    // Add rendering delay feedback loop
    const renderingDelayNode = ctx.createDelay(3.0);
    const renderingDelayFeedback = ctx.createGain();
    const renderingDelayFilter = ctx.createBiquadFilter();

    renderingDelayNode.delayTime.setValueAtTime(1.2, ctx.currentTime);
    renderingDelayFeedback.gain.setValueAtTime(0.55, ctx.currentTime);
    renderingDelayFilter.type = 'lowpass';
    renderingDelayFilter.frequency.setValueAtTime(800, ctx.currentTime);

    renderingDelayNode.connect(renderingDelayFilter);
    renderingDelayFilter.connect(renderingDelayFeedback);
    renderingDelayFeedback.connect(renderingDelayNode);
    renderingDelayNode.connect(renderingGain);

    const playRecordingDrone = (freq: number, type: OscillatorType, level: number) => {
      const osc1 = ctx.createOscillator();
      osc1.type = type;
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = type;
      osc2.frequency.setValueAtTime(freq, ctx.currentTime);
      osc2.detune.setValueAtTime(-12, ctx.currentTime);

      const osc3 = ctx.createOscillator();
      osc3.type = type;
      osc3.frequency.setValueAtTime(freq, ctx.currentTime);
      osc3.detune.setValueAtTime(12, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      const oscGain = ctx.createGain();
      const t = ctx.currentTime;
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(level * 0.4, t + 2.0); // Soft Attack
      oscGain.gain.linearRampToValueAtTime(level * 0.35, t + 3.0); // Decay to Sustain

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(renderingGain);

      // Route 22% of rendering drone to delay
      const droneDelaySend = ctx.createGain();
      droneDelaySend.gain.setValueAtTime(0.22, ctx.currentTime);
      oscGain.connect(droneDelaySend);
      droneDelaySend.connect(renderingDelayNode);

      osc1.start();
      osc2.start();
      osc3.start();

      return [osc1, osc2, osc3];
    };

    const renderedOscs: OscillatorNode[] = [];
    renderedOscs.push(...playRecordingDrone(composerHz / 2, composerWave, 0.6));
    renderedOscs.push(...playRecordingDrone(composerHz, composerWave, 0.4));
    renderedOscs.push(...playRecordingDrone(composerHz * 1.5, 'sine', 0.25));

    // Continuous chime notes throughout the duration
    const pentatonicScale = [1, 1.25, 1.5, 1.875, 2, 2.5, 3];
    const chimesInterval = setInterval(() => {
      const ratio = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
      const freq = composerHz * ratio;
      
      const osc1 = ctx.createOscillator();
      osc1.type = composerWave === 'sine' ? 'sine' : 'triangle';
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = composerWave === 'sine' ? 'sine' : 'triangle';
      osc2.frequency.setValueAtTime(freq, ctx.currentTime);
      osc2.detune.setValueAtTime(8, ctx.currentTime);

      const osc3 = ctx.createOscillator();
      osc3.type = composerWave === 'sine' ? 'sine' : 'triangle';
      osc3.frequency.setValueAtTime(freq, ctx.currentTime);
      osc3.detune.setValueAtTime(-8, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, ctx.currentTime);

      const gain = ctx.createGain();
      const t = ctx.currentTime;
      const peakVolume = 0.12;
      const sustainVolume = peakVolume * 0.3;

      gain.gain.setValueAtTime(0, t);
      // Attack
      gain.gain.linearRampToValueAtTime(peakVolume, t + 0.15);
      // Decay to Sustain
      gain.gain.linearRampToValueAtTime(sustainVolume, t + 0.55);
      // Release
      const releaseStart = t + 1.05;
      gain.gain.setValueAtTime(sustainVolume, releaseStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + 2.0);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gain);
      gain.connect(renderingGain);

      // Route 65% of recorded chime to rendering delay
      const chimeDelaySend = ctx.createGain();
      chimeDelaySend.gain.setValueAtTime(0.65, t);
      gain.connect(chimeDelaySend);
      chimeDelaySend.connect(renderingDelayNode);

      osc1.start();
      osc2.start();
      osc3.start();
      osc1.stop(t + 3.2);
      osc2.stop(t + 3.2);
      osc3.stop(t + 3.2);
    }, 1200);

    // Natural background soundscape synthesis attached to rendering pipe
    const recSoundscapeHandle = setupNatureSoundscape(ctx, renderingGain, composerNature, composerNatureVol);

    // MediaRecorder on the Web Audio stream destination
    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(dest.stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      clearInterval(chimesInterval);
      clearInterval(progressInterval);
      renderedOscs.forEach((o) => {
        try {
          o.stop();
        } catch (err) {}
      });
      recSoundscapeHandle.stop();
      ctx.close();

      const blob = new Blob(chunks, { type: 'audio/webm' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `${composerName.trim() || '我的定制神圣赫兹波'}_${composerHz}Hz_冥想曲.webm`;
      a.click();
      setIsRecordingComposer(false);
    };

    mediaRecorder.start();

    // Countdown timer for progress bar
    const progressInterval = setInterval(() => {
      setRecordingProgress((p) => {
        if (p <= 1) {
          mediaRecorder.stop();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  // Save current dynamic composer configuration as a permanent preset track
  const handleSaveComposerPreset = () => {
    const name = composerName.trim() || `定制 ${composerHz}Hz 宇宙共振曲`;
    const newTrack: MusicTrack = {
      id: `custom-synth-${Date.now()}`,
      name: `🎹 ${name}`,
      url: `synth:freq=${composerHz}&wave=${composerWave}&beat=${composerBeat}&soundscape=${composerNature}&natureVol=${composerNatureVol}`,
      isCustom: true,
    };

    onAddCustomTrack(newTrack);
    onTrackChange(newTrack);
    setComposerName('');
    setIsPlaying(true);
    showToast(language === 'en' ? `✨ Saved "${name}" to tracks!` : `✨「${name}」已成功保存至您的冥想背景曲库！`);
  };

  // Record your own voice affirmations using microphone
  const startRecordingVoice = async () => {
    if (isRecordingVoice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      voiceMediaRecorderRef.current = mediaRecorder;
      voiceAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(voiceAudioChunksRef.current, { type: 'audio/webm' });

        // Turn off mic light by releasing tracks
        stream.getTracks().forEach((track) => track.stop());

        // Read audio and persist as high-performance Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const newVoice: SavedVoice = {
            id: `voice-${Date.now()}`,
            name: voiceRecordName.trim() || `我的声波肯定句 ${customVoices.length + 1}`,
            duration: voiceRecordSeconds,
            createdAt: new Date().toLocaleDateString('zh-CN'),
            audioBase64: base64data,
          };
          const updated = [...customVoices, newVoice];
          setCustomVoices(updated);
          localStorage.setItem('lumiere_saved_voices', JSON.stringify(updated));
          setVoiceRecordName('');
          if (updated.length === 1) {
            setSelectedVoiceMantraId(newVoice.id);
          }
          showToast(language === 'en' ? '🎙️ Voice affirmation saved successfully!' : '🎙️ 亲口声波肯定句录制并建档成功！');
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setVoiceRecordSeconds(0);

      voiceTimerRef.current = window.setInterval(() => {
        setVoiceRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to get mic access:', err);
      showToast(language === 'en' ? '⚠️ Please allow microphone permission in your browser.' : '⚠️ 请在浏览器中允许麦克风权限以录制亲口肯定句。');
    }
  };

  const stopRecordingVoice = () => {
    if (!isRecordingVoice || !voiceMediaRecorderRef.current) return;
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceMediaRecorderRef.current.stop();
    setIsRecordingVoice(false);
  };

  // Playback preview of recorded affirmations
  const playVoicePreview = (voice: SavedVoice) => {
    if (isPlayingVoicePreview === voice.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPlayingVoicePreview(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(voice.audioBase64);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setIsPlayingVoicePreview(null);
      };
      setIsPlayingVoicePreview(voice.id);
      audio.volume = volume;
      audio.play().catch((err) => console.log('Preview playback failed:', err));
    }
  };

  // Download recorded voice affirm file
  const downloadVoiceClip = (voice: SavedVoice) => {
    const a = document.createElement('a');
    a.href = voice.audioBase64;
    a.download = `${voice.name}.webm`;
    a.click();
  };

  // Delete recorded voice affirm file
  const deleteVoiceClip = (id: string) => {
    const updated = customVoices.filter((v) => v.id !== id);
    setCustomVoices(updated);
    localStorage.setItem('lumiere_saved_voices', JSON.stringify(updated));
    if (selectedVoiceMantraId === id) {
      setSelectedVoiceMantraId(updated.length > 0 ? updated[0].id : null);
    }
    showToast(language === 'en' ? '🗑️ Affirmation recording deleted.' : '🗑️ 声波肯定句已删除。');
  };

  // Custom music URL submit handler
  const handleAddUrl = (e: FormEvent) => {
    e.preventDefault();
    if (!customUrl) return;

    const name = customName || `自定义导入曲目 ${tracks.length + 1}`;
    const newTrack: MusicTrack = {
      id: `custom-${Date.now()}`,
      name: `🌸 ${name}`,
      url: customUrl,
      isCustom: true,
    };

    onAddCustomTrack(newTrack);
    onTrackChange(newTrack);
    setCustomUrl('');
    setCustomName('');
    setShowAddForm(false);
    setIsPlaying(true);
  };

  // File upload logic
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const newTrack: MusicTrack = {
      id: `custom-file-${Date.now()}`,
      name: `🎵 ${file.name.replace(/\.[^/.]+$/, '')}`,
      url: fileUrl,
      isCustom: true,
    };

    onAddCustomTrack(newTrack);
    onTrackChange(newTrack);
    setIsPlaying(true);
  };

  return (
    <div
      className="relative p-5 md:p-6 amnd-surface transition-colors duration-200"
      id="custom-audio-player"
    >
      {/* Non-blocking Toast notification banner */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[var(--amnd-text-primary)] text-[var(--amnd-bg-elevated)] text-xs font-medium shadow-[var(--amnd-shadow-md)] animate-fadeIn flex items-center gap-2 pointer-events-none whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
          <span>{toastMsg}</span>
        </div>
      )}
      {/* Header Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[var(--amnd-border)] pb-3.5 mb-4 flex-wrap gap-2">
        <div className="flex gap-1 bg-[var(--amnd-bg-secondary)] p-1 rounded-xl border border-[var(--amnd-border)]">
          <button
            type="button"
            onClick={() => setActiveTab('tracks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'tracks'
                ? 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] shadow-2xs font-semibold border border-[var(--amnd-border)]'
                : 'text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)]'
            }`}
            id="tab-tracks"
          >
            <Music className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Music' : '音乐精选'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('composer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'composer'
                ? 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] shadow-2xs font-semibold border border-[var(--amnd-border)]'
                : 'text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)]'
            }`}
            id="tab-composer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Composer' : '声景编曲'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'voice'
                ? 'bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] shadow-2xs font-semibold border border-[var(--amnd-border)]'
                : 'text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)]'
            }`}
            id="tab-voice"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Voice Studio' : '我的声音馆'}</span>
          </button>
        </div>

        {activeTab === 'tracks' && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[11px] text-[var(--amnd-wood)] font-medium px-2.5 py-1.5 rounded-lg bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] border border-[var(--amnd-border)] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            id="btn-add-music"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Import Custom' : '导入自定义'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: MUSIC SELECTION */}
      {activeTab === 'tracks' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Track Grid */}
          <div className="grid grid-cols-2 gap-2">
            {tracks.map((track) => (
              <button
                type="button"
                key={track.id}
                onClick={() => {
                  onTrackChange(track);
                  setIsPlaying(true);
                }}
                className={`p-3 rounded-xl text-left text-xs transition-colors duration-200 flex flex-col justify-between border cursor-pointer ${
                  currentTrack.id === track.id
                    ? 'bg-[var(--amnd-wood-soft)] border-[var(--amnd-wood)] text-[var(--amnd-text-primary)] font-semibold'
                    : 'bg-[var(--amnd-bg-primary)] border-[var(--amnd-border)] text-[var(--amnd-text-secondary)] hover:bg-[var(--amnd-bg-secondary)]'
                }`}
                id={`track-select-${track.id}`}
              >
                <span className="truncate w-full block font-medium">{track.name}</span>
                <span className="text-[11px] text-[var(--amnd-text-muted)] mt-1 block">
                  {track.id === 'princess-synth' || track.id.startsWith('custom-synth-')
                    ? (language === 'en' ? 'Web Synth' : 'Web 实时合成')
                    : (language === 'en' ? 'Audio Stream' : '音频轨道')}
                </span>
              </button>
            ))}
          </div>

          {/* Custom Track Import Modal */}
          {showAddForm && (
            <div className="p-4 amnd-surface-stone space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--amnd-border)]">
                <span className="text-xs font-semibold text-[var(--amnd-text-primary)]">
                  {language === 'en' ? 'Add External Music Link' : '添加本地或网络音频'}
                </span>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload File */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-[var(--amnd-text-secondary)] block">
                  {language === 'en' ? 'Method 1: Upload Local Audio' : '方式一：选择本地音频文件'}
                </span>
                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-[var(--amnd-border-strong)] hover:border-[var(--amnd-wood)] bg-[var(--amnd-bg-elevated)] text-xs text-[var(--amnd-wood)] font-medium transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Select MP3 or WAV file' : '选择 MP3 或 WAV 音乐'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-[11px] text-[var(--amnd-text-muted)] font-mono">OR</div>

              {/* Form Input URL */}
              <form onSubmit={handleAddUrl} className="space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-[var(--amnd-text-secondary)] block">
                    {language === 'en' ? 'Method 2: Enter MP3 URL' : '方式二：输入网络 MP3 链接'}
                  </span>
                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 text-[var(--amnd-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://example.com/sound.mp3"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full text-xs pl-8.5 pr-2.5 py-2 amnd-input"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder={language === 'en' ? 'Name this custom track (Optional)' : '给此曲目命名（可选）'}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs px-3 py-2 amnd-input"
                />

                <button
                  type="submit"
                  disabled={!customUrl}
                  className="w-full py-2 amnd-btn-primary font-medium text-xs disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Confirm Import' : '确认导入曲目'}
                </button>
              </form>
            </div>
          )}

          {/* TTS Tone Choices */}
          <div className="pt-3 border-t border-[var(--amnd-border)]">
            <label className="text-xs text-[var(--amnd-text-primary)] font-medium block mb-2">
              {language === 'en' ? 'Narration Voice Style' : '朗读配音音色选择'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'deep-female', name: '静谧深沉女声', nameEn: 'Serene Deep Female', desc: 'Serene Deep' },
                { id: 'royal-lady', name: '温婉清雅女声', nameEn: 'Gentle Elegant Female', desc: 'Gentle Elegant' },
                { id: 'magnetic-male', name: '古雅磁性男声', nameEn: 'Magnetic Deep Male', desc: 'Magnetic Deep' },
                { id: 'grounding-male', name: '低频沉稳男声', nameEn: 'Grounding Low Male', desc: 'Grounding Low' },
              ].map((tone) => (
                <button
                  type="button"
                  key={tone.id}
                  onClick={() => onVoiceToneChange(tone.id as any)}
                  className={`p-2.5 rounded-xl text-center text-xs transition-colors duration-200 flex flex-col items-center justify-center border cursor-pointer ${
                    voiceTone === tone.id
                      ? 'bg-[var(--amnd-wood-soft)] border-[var(--amnd-wood)] text-[var(--amnd-text-primary)] font-semibold'
                      : 'bg-[var(--amnd-bg-primary)] border-[var(--amnd-border)] text-[var(--amnd-text-secondary)] hover:bg-[var(--amnd-bg-secondary)]'
                  }`}
                  id={`tone-select-${tone.id}`}
                >
                  <span className="font-medium text-xs block">
                    {language === 'en' ? tone.nameEn : tone.name}
                  </span>
                  <span className="text-[10px] text-[var(--amnd-text-muted)] font-mono block mt-0.5">{tone.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COSMIC SOLFEGGIO COMPOSER */}
      {activeTab === 'composer' && (
        <div className="space-y-4 animate-fadeIn text-left">
          {/* Top description */}
          <div className="bg-[var(--amnd-bg-secondary)] rounded-xl p-3 border border-[var(--amnd-border)]">
            <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              {language === 'en' ? (
                <>
                  <strong>Soundscape Synthesizer</strong>: Design custom frequency resonances with Web Audio synthesis. Preview live, save as a preset, or record &amp; download.
                </>
              ) : (
                <>
                  <strong>自然声景与频率编曲器</strong>：通过 Web Audio 实时合成专属频率与自然环境声。可点击【开始实时演奏】试听，调整后【存至音馆】或【录音并下载】。
                </>
              )}
            </p>
          </div>

          <div className="space-y-3">
            {/* 1. Base Frequency */}
            <div>
              <span className="text-xs font-medium text-[var(--amnd-text-primary)] block mb-1.5">
                {language === 'en' ? 'Choose Resonance Frequency' : '选择谐振频率 (Hz)'}
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { hz: 396, name: '释怀安定', nameEn: 'Release Fear' },
                  { hz: 432, name: '自然共振', nameEn: 'Cosmic Unity' },
                  { hz: 528, name: '转化平衡', nameEn: 'Manifest' },
                  { hz: 639, name: '心轮连接', nameEn: 'Love & Connect' },
                  { hz: 741, name: '清明觉察', nameEn: 'Cleanse' },
                  { hz: 963, name: '澄澈安住', nameEn: 'Stillness' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.hz}
                    onClick={() => {
                      setComposerHz(item.hz);
                      handleUpdateComposerSetting(item.hz, composerWave, composerBeat, composerNature);
                    }}
                    className={`py-2 px-1 rounded-xl text-center border transition-colors cursor-pointer ${
                      composerHz === item.hz
                        ? 'bg-[var(--amnd-wood-soft)] border-[var(--amnd-wood)] text-[var(--amnd-text-primary)] font-semibold'
                        : 'bg-[var(--amnd-bg-primary)] border-[var(--amnd-border)] text-[var(--amnd-text-secondary)] hover:bg-[var(--amnd-bg-secondary)]'
                    }`}
                  >
                    <div className="text-xs font-semibold font-mono tabular-nums">{item.hz}Hz</div>
                    <div className="text-[10px] text-[var(--amnd-text-muted)] truncate mt-0.5">
                      {language === 'en' ? item.nameEn : item.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Waveshape & Binaural Beat */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-medium text-[var(--amnd-text-primary)] block mb-1">
                  {language === 'en' ? 'Timbre Shape' : '共振音色'}
                </span>
                <select
                  value={composerWave}
                  onChange={(e) => {
                    const wave = e.target.value as OscillatorType;
                    setComposerWave(wave);
                    handleUpdateComposerSetting(composerHz, wave, composerBeat, composerNature);
                  }}
                  className="w-full text-xs px-2.5 py-2 amnd-input"
                >
                  <option value="sine">{language === 'en' ? 'Singing Bowl (Sine)' : '颂钵清音 (Sine)'}</option>
                  <option value="triangle">{language === 'en' ? 'Warm Strings (Triangle)' : '木琴弦音 (Triangle)'}</option>
                  <option value="sawtooth">{language === 'en' ? 'Ambient Pad' : '和声声场 (Pad)'}</option>
                </select>
              </div>

              <div>
                <span className="text-xs font-medium text-[var(--amnd-text-primary)] block mb-1">
                  {language === 'en' ? 'Binaural Beat' : '脑波节律'}
                </span>
                <select
                  value={composerBeat}
                  onChange={(e) => {
                    const beat = e.target.value as any;
                    setComposerBeat(beat);
                    handleUpdateComposerSetting(composerHz, composerWave, beat, composerNature);
                  }}
                  className="w-full text-xs px-2.5 py-2 amnd-input"
                >
                  <option value="theta">{language === 'en' ? 'Theta 4Hz (Deep Calm)' : 'Theta 4Hz（深沉内观）'}</option>
                  <option value="alpha">{language === 'en' ? 'Alpha 8Hz (Relaxation)' : 'Alpha 8Hz（放松专注）'}</option>
                  <option value="delta">{language === 'en' ? 'Delta 2Hz (Restorative)' : 'Delta 2Hz（静谧安眠）'}</option>
                  <option value="none">{language === 'en' ? 'No Resonance' : '无脑波节律'}</option>
                </select>
              </div>
            </div>

            {/* 3. Soundscapes Overlay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--amnd-text-primary)] block">
                  {language === 'en' ? 'Organic Nature Soundscapes' : '自然环境音景'}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-[var(--amnd-text-secondary)]">
                  <span>{language === 'en' ? 'Nature Vol:' : '环境音量:'}</span>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={composerNatureVol}
                    onChange={(e) => handleNatureVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1.5 accent-[var(--amnd-wood)] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] tabular-nums w-8 text-right">{Math.round(composerNatureVol * 100)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {NATURE_SOUNDSCAPES_OPTIONS.map((item) => {
                  const isSelected = composerNature === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNature(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--amnd-wood-soft)] border-[var(--amnd-wood)] text-[var(--amnd-text-primary)] font-semibold'
                          : 'bg-[var(--amnd-bg-primary)] border-[var(--amnd-border)] text-[var(--amnd-text-secondary)] hover:bg-[var(--amnd-bg-secondary)]'
                      }`}
                    >
                      <div className="text-xs font-medium truncate">
                        {language === 'en' ? item.nameEn : item.name}
                      </div>
                      <div className="text-[10px] text-[var(--amnd-text-muted)] truncate mt-0.5">
                        {language === 'en' ? item.descEn : item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name and Composing buttons */}
            <div className="pt-2.5 border-t border-[var(--amnd-border)] space-y-2">
              <input
                type="text"
                placeholder={language === 'en' ? 'Name this custom mix (e.g. Evening Calm...)' : '给这首声景曲目起个名字（如：晚风静坐...）'}
                value={composerName}
                onChange={(e) => setComposerName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 amnd-input"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Save Preset */}
                <button
                  type="button"
                  onClick={handleSaveComposerPreset}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 amnd-btn-secondary font-medium text-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                  <span>{language === 'en' ? 'Save Preset' : '存至背景音馆'}</span>
                </button>

                {/* Instant recording download */}
                <button
                  type="button"
                  onClick={handleRecordComposer}
                  disabled={isRecordingComposer}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--amnd-gold-soft)] hover:bg-[var(--amnd-gold)]/20 text-[var(--amnd-text-primary)] border border-[var(--amnd-gold)]/30 font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isRecordingComposer ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[var(--amnd-wood)] border-t-transparent rounded-full animate-spin"></div>
                      <span>{language === 'en' ? `Recording (${recordingProgress}s)` : `录制中 (${recordingProgress}s)`}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                      <span>{language === 'en' ? 'Record & Download' : '录音并下载'}</span>
                    </>
                  )}
                </button>

                {/* Real-time live play preview */}
                <button
                  type="button"
                  onClick={() => {
                    if (isLiveComposing) {
                      stopSynth();
                      setIsPlaying(false);
                    } else {
                      stopSynth();
                      setIsPlaying(true);
                      runProceduralSynth(composerHz, composerWave, composerBeat, composerNature, composerNatureVol);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                    isLiveComposing
                      ? 'bg-[var(--amnd-danger)] text-[var(--amnd-bg-elevated)]'
                      : 'amnd-btn-primary'
                  }`}
                >
                  {isLiveComposing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isLiveComposing ? (language === 'en' ? 'Stop Live Playing' : '停止实时演奏') : (language === 'en' ? 'Start Live Playing' : '开始实时演奏')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL VOICE STUDIO */}
      {activeTab === 'voice' && (
        <div className="space-y-4 animate-fadeIn text-left">
          {/* Instructions */}
          <div className="bg-[var(--amnd-bg-secondary)] rounded-xl p-3 border border-[var(--amnd-border)]">
            <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              {language === 'en' ? (
                <>
                  <strong>Personal Voice Studio</strong>: Record yourself reading your intentions aloud. Once enabled, your recording will loop softly during the meditation timer alongside background soundscapes.
                </>
              ) : (
                <>
                  <strong>个人声音肯定句馆</strong>：在此亲口录下您的心愿或觉察短句，并自动本地保存。开启下方设置后，<strong>您录制的声音将在静坐倒计时中温和循环</strong>，配合自然声景陪伴练习。
                </>
              )}
            </p>
          </div>

          {/* Voice recorder box */}
          <div className="bg-[var(--amnd-bg-primary)] rounded-xl p-3.5 border border-[var(--amnd-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--amnd-text-primary)] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                <span>{language === 'en' ? 'Record Voice Affirmation' : '录制个人声音片段'}</span>
              </span>
              {isRecordingVoice && (
                <span className="text-xs font-semibold text-[var(--amnd-danger)] font-mono tabular-nums flex items-center gap-1">
                  <span>REC {voiceRecordSeconds}s</span>
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={language === 'en' ? 'Give your recording a name...' : '给这段录音命名（例如：清晨静心自我提醒）'}
                value={voiceRecordName}
                disabled={isRecordingVoice}
                onChange={(e) => setVoiceRecordName(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2 amnd-input disabled:opacity-60"
              />

              {isRecordingVoice ? (
                <button
                  type="button"
                  onClick={stopRecordingVoice}
                  className="px-4 py-2 rounded-xl bg-[var(--amnd-danger)] text-[var(--amnd-bg-elevated)] text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'en' ? 'Stop' : '停止'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecordingVoice}
                  className="px-4 py-2 amnd-btn-primary text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Record' : '录音'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Saved Voices Library */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[var(--amnd-text-primary)] block">
              {language === 'en' ? 'My Voice Archive' : '已存声音列表'}
            </span>

            {customVoices.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-[var(--amnd-border-strong)] rounded-xl bg-[var(--amnd-bg-secondary)]/40">
                <span className="text-xs text-[var(--amnd-text-muted)] font-medium">
                  {language === 'en' ? 'No recordings yet. Record a short clip to begin.' : '尚无录制音频，录制一小段即可保存在本地使用。'}
                </span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {customVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      selectedVoiceMantraId === voice.id
                        ? 'bg-[var(--amnd-wood-soft)] border-[var(--amnd-wood)]'
                        : 'bg-[var(--amnd-bg-primary)] border-[var(--amnd-border)] hover:bg-[var(--amnd-bg-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedVoiceMantraId(voice.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          selectedVoiceMantraId === voice.id
                            ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)]'
                            : 'bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)]'
                        }`}
                        title={language === 'en' ? 'Use in Meditation' : '设为冥想背景伴奏'}
                      >
                        <Check className="w-3 h-3" />
                      </button>

                      <div className="text-left min-w-0">
                        <p className="text-xs font-medium text-[var(--amnd-text-primary)] truncate">{voice.name}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--amnd-text-muted)] font-mono tabular-nums mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {voice.duration}{language === 'en' ? 's' : '秒'}
                          </span>
                          <span>·</span>
                          <span>{voice.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Play Preview */}
                      <button
                        type="button"
                        onClick={() => playVoicePreview(voice)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isPlayingVoicePreview === voice.id
                            ? 'bg-[var(--amnd-wood)] text-[var(--amnd-bg-elevated)] border-transparent'
                            : 'bg-[var(--amnd-bg-elevated)] border-[var(--amnd-border)] text-[var(--amnd-wood)] hover:bg-[var(--amnd-bg-secondary)]'
                        }`}
                        title={language === 'en' ? 'Preview' : '播放预览'}
                      >
                        {isPlayingVoicePreview === voice.id ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                      </button>

                      {/* Download */}
                      <button
                        type="button"
                        onClick={() => downloadVoiceClip(voice)}
                        className="p-1.5 rounded-lg border bg-[var(--amnd-bg-elevated)] border-[var(--amnd-border)] text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-bg-secondary)] transition-colors cursor-pointer"
                        title={language === 'en' ? 'Download' : '下载录音'}
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => deleteVoiceClip(voice.id)}
                        className="p-1.5 rounded-lg border bg-[var(--amnd-bg-elevated)] border-transparent text-[var(--amnd-text-muted)] hover:text-[var(--amnd-danger)] hover:bg-[var(--amnd-danger-soft)] transition-colors cursor-pointer"
                        title={language === 'en' ? 'Delete' : '删除肯定句'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Meditation loop configuration toggle */}
          {customVoices.length > 0 && (
            <div className="bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border)] rounded-xl p-3 flex items-start gap-2">
              <input
                type="checkbox"
                id="checkbox-loop-mantra"
                checked={selectedVoiceMantraId !== null}
                onChange={(e) => {
                  if (e.target.checked && customVoices.length > 0) {
                    setSelectedVoiceMantraId(customVoices[0].id);
                  } else {
                    setSelectedVoiceMantraId(null);
                  }
                }}
                className="mt-1 accent-[var(--amnd-wood)] cursor-pointer"
              />
              <div className="text-left">
                <label
                  htmlFor="checkbox-loop-mantra"
                  className="text-xs font-medium text-[var(--amnd-text-primary)] block cursor-pointer"
                >
                  {language === 'en' ? 'Loop your voice softly during stillness sessions' : '静心模式开关：在全屏冥想时柔和循环播放选中的录音'}
                </label>
                <p className="text-[11px] text-[var(--amnd-text-muted)] mt-0.5 leading-relaxed">
                  {language === 'en' ? 'Once enabled, your recorded audio will loop gently alongside ambient tracks.' : '勾选后，开启全屏冥想时将把该录音叠加在背景声景中柔和循环。'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER Master Audio Status Bar */}
      <div className="flex items-center gap-3.5 py-2.5 px-3.5 mt-4 rounded-xl bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border)] text-left">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 rounded-xl bg-[var(--amnd-wood)] hover:bg-[var(--amnd-wood-hover)] text-[var(--amnd-bg-elevated)] transition-colors cursor-pointer shrink-0"
          id="music-play-pause-btn"
          aria-label={isPlaying ? (language === 'en' ? 'Pause' : '暂停') : (language === 'en' ? 'Play' : '播放')}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--amnd-text-primary)] truncate">
            {activeTab === 'composer' ? (language === 'en' ? `Composing: ${composerHz}Hz resonance` : `正在定制: ${composerHz}Hz 声波共鸣`) : currentTrack.name}
          </p>
          <p className="text-[11px] text-[var(--amnd-text-muted)] mt-0.5 truncate">
            {isPlaying
              ? isLiveComposing
                ? (language === 'en' ? 'Live soundscape resonance active...' : '实时声景共鸣播放中...')
                : (language === 'en' ? 'Playing calm meditation soundscape...' : '正在播放静心背景声景...')
              : (language === 'en' ? 'Ready for your stillness session' : '静候开启背景声景')}
          </p>
        </div>

        {/* Volume adjust sliders */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Volume2 className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-[var(--amnd-border)] rounded-lg appearance-none cursor-pointer accent-[var(--amnd-wood)]"
            id="music-volume"
          />
        </div>
      </div>
    </div>
  );
}
