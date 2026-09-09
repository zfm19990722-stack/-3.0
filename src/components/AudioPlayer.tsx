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

  // File upload logic with multi-file support
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let firstAddedTrack: MusicTrack | null = null;
    Array.from(files).forEach((file, index) => {
      const fileUrl = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newTrack: MusicTrack = {
        id: `custom-file-${Date.now()}-${index}`,
        name: `🎙️ ${cleanName}`,
        nameEn: `🎙️ ${cleanName}`,
        url: fileUrl,
        isCustom: true,
        summary: language === 'en' ? 'Custom uploaded high-fidelity audio' : '用户本地原声录音文件',
      };
      onAddCustomTrack(newTrack);
      if (index === 0) {
        firstAddedTrack = newTrack;
      }
    });

    if (firstAddedTrack) {
      onTrackChange(firstAddedTrack);
      setIsPlaying(true);
    }
    showToast(language === 'en' ? `🎉 Imported ${files.length} recording(s)!` : `🎉 成功导入 ${files.length} 个本地音频/录音！`);
    setShowAddForm(false);
  };

  // Browser Native Speech Synthesis for instant voice narration
  const [isSpeakingText, setIsSpeakingText] = useState(false);
  const toggleSpeechAffirmation = (text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast(language === 'en' ? 'Speech synthesis not supported in this browser' : '当前浏览器不支持语音合成');
      return;
    }

    if (isSpeakingText) {
      window.speechSynthesis.cancel();
      setIsSpeakingText(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88; // Gentle, relaxing meditation pacing
    utterance.pitch = 1.05; // Soothing warm tone

    // Try to find a soft English female voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira') || v.name.includes('Female') || v.lang.startsWith('en')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => setIsSpeakingText(false);
    utterance.onerror = () => setIsSpeakingText(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeakingText(true);
  };

  return (
    <div
      className="relative p-5 md:p-6 rounded-[32px] bg-white/40 backdrop-blur-2xl border border-white/40 shadow-xl shadow-pink-100/10 transition-all duration-300"
      id="custom-audio-player"
    >
      {/* Non-blocking Toast notification banner */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#4a3a3a] text-white text-xs font-semibold shadow-xl border border-white/20 animate-fadeIn flex items-center gap-2 pointer-events-none whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}
      {/* Header Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[#8e6d72]/15 pb-3.5 mb-4 flex-wrap gap-2">
        <div className="flex gap-1 bg-white/30 p-1 rounded-full border border-white/40 shadow-inner">
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'tracks'
                ? 'bg-white text-[#8e6d72] shadow-sm font-bold'
                : 'text-[#8e6d72]/70 hover:bg-white/10'
            }`}
            id="tab-tracks"
          >
            <Music className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Music' : '音乐精选'}</span>
          </button>
          <button
            onClick={() => setActiveTab('composer')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'composer'
                ? 'bg-white text-[#8e6d72] shadow-sm font-bold'
                : 'text-[#8e6d72]/70 hover:bg-white/10'
            }`}
            id="tab-composer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Composer' : '智能编曲器'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'voice'
                ? 'bg-white text-[#8e6d72] shadow-sm font-bold'
                : 'text-[#8e6d72]/70 hover:bg-white/10'
            }`}
            id="tab-voice"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Voice Studio' : '我的声音馆'}</span>
          </button>
        </div>

        {activeTab === 'tracks' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[10px] text-[#8e6d72] font-bold px-2.5 py-1.5 rounded-full bg-white/50 hover:bg-white/80 border border-white/60 transition-all flex items-center gap-1 shadow-sm"
            id="btn-add-music"
          >
            <Plus className="w-3.5 h-3.5" />
            {language === 'en' ? 'Import Custom' : '导入自定义'}
          </button>
        )}
      </div>

      {/* TAB 1: MUSIC SELECTION */}
      {activeTab === 'tracks' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Track Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  onTrackChange(track);
                  setIsPlaying(true);
                }}
                className={`p-3 rounded-xl text-left text-xs transition-all duration-300 flex flex-col justify-between border ${
                  currentTrack.id === track.id
                    ? 'bg-white/90 border-white text-[#8e6d72] shadow-sm font-bold scale-[1.01]'
                    : 'bg-white/20 border-white/20 text-[#4a3a3a] hover:bg-white/40'
                }`}
                id={`track-select-${track.id}`}
              >
                <span className="truncate w-full block font-medium">
                  {language === 'en' ? (track.nameEn || track.name) : track.name}
                </span>
                <span className="text-[8.5px] text-[#b49196] uppercase font-mono tracking-wider mt-1.5 font-bold block">
                  {track.transcript
                    ? (language === 'en' ? '🎙️ Affirmation Voice' : '🎙️ 原声箴言录音')
                    : track.id === 'princess-synth' || track.id.startsWith('custom-synth-')
                    ? (language === 'en' ? '✨ Web Synth' : '✨ Web 智能合成')
                    : (language === 'en' ? '🎵 Audio Stream' : '🎵 音频通道')}
                </span>
              </button>
            ))}
          </div>

          {/* Affirmation Script for current track */}
          {currentTrack.transcript && (
            <div className="p-3.5 rounded-2xl bg-white/40 border border-white/60 space-y-2 text-left animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-[#8e6d72] uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  {language === 'en' ? 'Spoken Affirmation Script' : '原声冥想箴言文稿'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleSpeechAffirmation(currentTrack.transcript || '')}
                    className={`text-[9.5px] px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 border shadow-sm ${
                      isSpeakingText
                        ? 'bg-pink-500 text-white border-pink-600 animate-pulse'
                        : 'bg-white/80 text-[#8e6d72] border-pink-200 hover:bg-white'
                    }`}
                    title={language === 'en' ? 'Live Voice Narration' : '朗读此段箴言'}
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>{isSpeakingText ? (language === 'en' ? 'Stop Voice' : '停止朗读') : (language === 'en' ? 'Read Aloud' : '朗读箴言')}</span>
                  </button>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-700 font-medium">
                    {language === 'en' ? 'High Fidelity' : '高清原声'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#4a3a3a] leading-relaxed font-serif italic bg-white/40 p-2.5 rounded-xl border border-white/40 shadow-inner">
                "{currentTrack.transcript}"
              </p>
              {currentTrack.transcriptZh && (
                <p className="text-[11px] text-[#6d5b5e] leading-relaxed px-1">
                  {currentTrack.transcriptZh}
                </p>
              )}
            </div>
          )}

          {/* Custom Track Import Modal */}
          {showAddForm && (
            <div className="p-4 rounded-[20px] border border-white/60 bg-white/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#8e6d72]/10">
                <span className="text-[11px] font-bold text-[#8e6d72] uppercase tracking-wide">
                  {language === 'en' ? 'Import Original Audio Recordings' : '导入您的原声录音文件'}
                </span>
                <button onClick={() => setShowAddForm(false)} className="text-[#8e6d72] hover:text-black">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload File */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#8e6d72] block">
                  {language === 'en' ? 'Method 1: Batch Upload Your Audio Files (MP3 / WAV / M4A)' : '方法一: 批量上传您的原声录音文件 (支持多选 / MP3 / WAV)'}
                </span>
                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-dashed border-[#b49196]/60 hover:border-[#8e6d72] bg-white/60 text-xs text-[#8e6d72] font-semibold transition-all text-center cursor-pointer shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-pink-500" />
                      <span>{language === 'en' ? 'Select or Drag Audio Files (Multi-Select Supported)' : '点击选择或拖入本地录音文件 (支持按住 Ctrl/Shift 多选 10 首)'}</span>
                    </div>
                    <span className="text-[10px] text-[#b49196] font-normal">
                      {language === 'en' ? 'Direct local playback with 100% original quality' : '直接加载本地原始录音，100% 还原人声音质，无任何改动'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-[8.5px] text-[#b49196] font-mono font-bold">OR</div>

              {/* Form Input URL */}
              <form onSubmit={handleAddUrl} className="space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#8e6d72] block">
                    {language === 'en' ? 'Method 2: Enter MP3 URL' : '方法二: 输入网络 MP3 链接'}
                  </span>
                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://example.com/sound.mp3"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full text-xs pl-8.5 pr-2.5 py-2 rounded-xl border border-white/50 bg-white/45 focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder={language === 'en' ? 'Name this custom track (Optional)' : '给此定制曲目命名 (可选)'}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-white/50 bg-white/45 focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                />

                <button
                  type="submit"
                  disabled={!customUrl}
                  className="w-full py-2 rounded-xl bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white font-bold text-xs shadow transition-all disabled:opacity-40"
                >
                  {language === 'en' ? 'Confirm Import' : '确认导入曲目'}
                </button>
              </form>
            </div>
          )}

          {/* TTS Tone Choices */}
          <div className="pt-2 border-t border-[#8e6d72]/10">
            <label className="text-[10px] uppercase tracking-widest text-[#8e6d72] font-bold block mb-2">
              {language === 'en' ? '🗣️ Affirmation Narration Tone' : '🗣️ 智能朗读配音风格 (Affirmation Narration Tone)'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'deep-female', name: '静谧深沉女声', nameEn: 'Serene Deep Female', desc: 'Serene Deep', emoji: '🪐' },
                { id: 'royal-lady', name: '温婉贵族女声', nameEn: 'Royal Elegant Female', desc: 'Royal Elegant', emoji: '👑' },
                { id: 'magnetic-male', name: '古雅磁性男声', nameEn: 'Magnetic Deep Male', desc: 'Magnetic Deep', emoji: '🌌' },
                { id: 'grounding-male', name: '低频疗愈男声', nameEn: 'Grounding Low Male', desc: 'Grounding Low', emoji: '🧘' },
              ].map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => onVoiceToneChange(tone.id as any)}
                  className={`p-2 rounded-xl text-center text-xs transition-all duration-300 flex flex-col items-center justify-center border ${
                    voiceTone === tone.id
                      ? 'bg-white/85 border-white text-[#8e6d72] shadow-sm font-semibold'
                      : 'bg-white/20 border-white/20 text-[#4a3a3a]/80 hover:bg-white/40'
                  }`}
                  id={`tone-select-${tone.id}`}
                >
                  <span className="text-sm mb-0.5">{tone.emoji}</span>
                  <span className="font-bold text-[10.5px] block">
                    {language === 'en' ? tone.nameEn : tone.name}
                  </span>
                  <span className="text-[7.5px] text-[#b49196] font-mono block">{tone.desc}</span>
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
          <div className="bg-[#ffe4e9]/30 rounded-2xl p-3 border border-[#8e6d72]/10">
            <p className="text-[11px] text-[#6d5b5e] leading-relaxed">
              {language === 'en' ? (
                <>
                  <strong>🎹 Cosmic Synthesizer</strong>: Design custom brainwave resonances with precision Web Audio algorithms. Click [Start Synthesis] to preview, [Save as Preset] or [Record & Download].
                </>
              ) : (
                <>
                  <strong>🎹 宇宙频率合成引擎</strong>：通过高精度 Web Audio 原声算法，设计专属您的脑电波共鸣。点击【开始实时演奏】预览，调整后可以【保存为预设】加入音乐精选，或【录音并下载】。
                </>
              )}
            </p>
          </div>

          <div className="space-y-3">
            {/* 1. Base Frequency */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block mb-1.5">
                {language === 'en' ? '🌸 Choose Solfeggio Frequency' : '🌸 选择神圣赫兹频率 (Solfeggio Frequencies)'}
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { hz: 396, name: '消除恐惧', nameEn: 'Release Fear' },
                  { hz: 432, name: '宇宙共振', nameEn: 'Cosmic Unity' },
                  { hz: 528, name: '奇迹显化', nameEn: 'Manifest' },
                  { hz: 639, name: '爱与连接', nameEn: 'Love & Connect' },
                  { hz: 741, name: '清理解毒', nameEn: 'Cleanse' },
                  { hz: 963, name: '神圣顶轮', nameEn: 'Divine Crown' },
                ].map((item) => (
                  <button
                    key={item.hz}
                    onClick={() => {
                      setComposerHz(item.hz);
                      handleUpdateComposerSetting(item.hz, composerWave, composerBeat, composerNature);
                    }}
                    className={`py-2 px-1 rounded-xl text-center border transition-all ${
                      composerHz === item.hz
                        ? 'bg-white border-[#8e6d72] text-[#8e6d72] shadow-sm font-bold scale-[1.03]'
                        : 'bg-white/20 border-white/20 text-[#4a3a3a] hover:bg-white/40'
                    }`}
                  >
                    <div className="text-[10px] font-bold font-mono">{item.hz}Hz</div>
                    <div className="text-[8px] text-[#b49196] scale-90 origin-center truncate">
                      {language === 'en' ? item.nameEn : item.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Waveshape & Binaural Beat */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block mb-1">
                  {language === 'en' ? '🎻 Timbre Shape' : '🎻 乐器合唱音色 (Timbre Shape)'}
                </span>
                <select
                  value={composerWave}
                  onChange={(e) => {
                    const wave = e.target.value as OscillatorType;
                    setComposerWave(wave);
                    handleUpdateComposerSetting(composerHz, wave, composerBeat, composerNature);
                  }}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-white/60 bg-white/50 text-[#4a3a3a] focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                >
                  <option value="sine">{language === 'en' ? '🎐 Tibetan Bowl (Sine)' : '🎐 空灵藏传金钵 (Sine)'}</option>
                  <option value="triangle">{language === 'en' ? '🌸 Royal Harp (Triangle)' : '🌸 皇家竖琴古筝 (Triangle)'}</option>
                  <option value="sawtooth">{language === 'en' ? '🌌 Cosmic Pad' : '🌌 神圣太空合唱 (Pad)'}</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block mb-1">
                  {language === 'en' ? '🧘 Binaural Beat' : '🧘 脑波注入 (Binaural Beat)'}
                </span>
                <select
                  value={composerBeat}
                  onChange={(e) => {
                    const beat = e.target.value as any;
                    setComposerBeat(beat);
                    handleUpdateComposerSetting(composerHz, composerWave, beat, composerNature);
                  }}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-white/60 bg-white/50 text-[#4a3a3a] focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                >
                  <option value="theta">{language === 'en' ? '🧠 Theta 4Hz (Subconscious)' : '🧠 Theta 4Hz (潜意识显化)'}</option>
                  <option value="alpha">{language === 'en' ? '🍃 Alpha 8Hz (Deep Relax)' : '🍃 Alpha 8Hz (深度放松)'}</option>
                  <option value="delta">{language === 'en' ? '😴 Delta 2Hz (Deep Sleep)' : '😴 Delta 2Hz (辅助无梦眠)'}</option>
                  <option value="none">{language === 'en' ? '🚫 No Resonance' : '🚫 无脑波共鸣'}</option>
                </select>
              </div>
            </div>

            {/* 3. Soundscapes Overlay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block">
                  {language === 'en' ? '🌿 Organic Nature Soundscapes' : '🌿 模拟高保真大自然环境音浪 (Organic Soundscapes)'}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-[#8e6d72]">
                  <span>{language === 'en' ? 'Nature Vol:' : '环境音量:'}</span>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={composerNatureVol}
                    onChange={(e) => handleNatureVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 accent-[#8e6d72] cursor-pointer"
                  />
                  <span className="font-mono text-[9px] w-6 text-right">{Math.round(composerNatureVol * 100)}%</span>
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
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-white border-[#8e6d72] text-[#8e6d72] shadow-sm font-semibold ring-1 ring-[#8e6d72]/30'
                          : 'bg-white/20 border-white/20 text-[#4a3a3a] hover:bg-white/40'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">
                        {language === 'en' ? item.nameEn : item.name}
                      </div>
                      <div className="text-[8px] font-mono text-[#b49196] truncate mt-0.5">
                        {language === 'en' ? item.descEn : item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name and Composing buttons */}
            <div className="pt-2.5 border-t border-[#8e6d72]/10 space-y-2">
              <input
                type="text"
                placeholder={language === 'en' ? 'Name this custom mix (e.g. Dream Repair...)' : '给这首冥想曲起个名字 (如：夜间修复波...)'}
                value={composerName}
                onChange={(e) => setComposerName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/60 bg-white/45 placeholder-[#b49196]/80 text-[#4a3a3a] focus:outline-none focus:ring-2 focus:ring-[#8e6d72]/15"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Save Preset */}
                <button
                  type="button"
                  onClick={handleSaveComposerPreset}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-white/80 text-[#8e6d72] border border-[#8e6d72]/30 font-semibold text-xs shadow-sm transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Save Preset' : '存至背景音馆'}</span>
                </button>

                {/* Instant recording download */}
                <button
                  type="button"
                  onClick={handleRecordComposer}
                  disabled={isRecordingComposer}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  {isRecordingComposer ? (
                    <>
                      <div className="w-3 h-3 border-2 border-pink-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>{language === 'en' ? `Recording (${recordingProgress}s)` : `录制中 (${recordingProgress}s)`}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Record & Download' : '录音并下载音乐'}</span>
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
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-white font-semibold text-xs shadow transition-all ${
                    isLiveComposing
                      ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
                      : 'bg-[#8e6d72] hover:bg-[#8e6d72]/90'
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
          <div className="bg-[#ffe4e9]/30 rounded-2xl p-3 border border-[#8e6d72]/10">
            <p className="text-[11px] text-[#6d5b5e] leading-relaxed">
              {language === 'en' ? (
                <>
                  <strong>🎙️ Personal Voice Studio</strong>: Record yourself reading your wishes or affirmations aloud. Once enabled, your voice will loop during the meditation countdown alongside background tracks to reach your subconscious!
                </>
              ) : (
                <>
                  <strong>🎙️ 我的声线肯定句馆</strong>：在这里亲口朗读您的心愿或显化口令（如：<em>“我有无尽的财富、健康的身体与包容一切的爱”</em>），app将为您录音建档。开启下方设置后，<strong>您录制的亲口声音将在全屏冥想倒计时中自动循环播放</strong>，配合背景梵音直击您的深层潜意识！
                </>
              )}
            </p>
          </div>

          {/* Voice recorder box */}
          <div className="bg-white/30 rounded-2xl p-3.5 border border-white/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>{language === 'en' ? 'Record Voice Affirmation' : '录制我的神圣声音 (Record Voice Affirmation)'}</span>
              </span>
              {isRecordingVoice && (
                <span className="text-[10px] font-bold text-red-500 font-mono flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>RECORDING {voiceRecordSeconds}s</span>
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={language === 'en' ? 'Give your recording an empowering name...' : '给您录音肯定句取个能量名字 (例如：我的富足配得感)'}
                value={voiceRecordName}
                disabled={isRecordingVoice}
                onChange={(e) => setVoiceRecordName(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-white/60 bg-white/50 text-[#4a3a3a] placeholder-[#b49196]/80 focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30 disabled:opacity-60"
              />

              {isRecordingVoice ? (
                <button
                  type="button"
                  onClick={stopRecordingVoice}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1 animate-pulse shadow-md"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'en' ? 'Stop' : '停止'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecordingVoice}
                  className="px-4 py-2 rounded-xl bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white text-xs font-bold flex items-center gap-1 shadow"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Record' : '录音'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Saved Voices Library */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block">
              {language === 'en' ? '📁 My Voice Archive' : '📁 我的建档声波库 (My Voice Archive)'}
            </span>

            {customVoices.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-white/30 rounded-2xl bg-white/10">
                <span className="text-2xl block mb-1">🎧</span>
                <span className="text-[10.5px] text-[#b49196] font-medium">
                  {language === 'en' ? 'No recordings yet. Record a short clip to align with your inner self.' : '尚无录制音频。录制一小段来开启您的灵魂共振吧。'}
                </span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {customVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      selectedVoiceMantraId === voice.id
                        ? 'bg-white/80 border-[#8e6d72]/30 shadow-sm'
                        : 'bg-white/20 border-white/10 hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={() => setSelectedVoiceMantraId(voice.id)}
                        className={`p-1.5 rounded-full transition-all ${
                          selectedVoiceMantraId === voice.id
                            ? 'bg-[#8e6d72] text-white shadow-inner'
                            : 'bg-white/50 text-[#8e6d72]/60 hover:text-[#8e6d72]'
                        }`}
                        title={language === 'en' ? 'Use in Meditation' : '设为冥想背景伴奏'}
                      >
                        <Check className="w-3 h-3" />
                      </button>

                      <div className="text-left min-w-0">
                        <p className="text-[11.5px] font-bold text-[#4a3a3a] truncate">{voice.name}</p>
                        <div className="flex items-center gap-1.5 text-[8.5px] text-[#b49196] font-mono mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {voice.duration}{language === 'en' ? 's' : '秒'}
                          </span>
                          <span>•</span>
                          <span>{voice.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Play Preview */}
                      <button
                        onClick={() => playVoicePreview(voice)}
                        className={`p-1.5 rounded-full border transition-all ${
                          isPlayingVoicePreview === voice.id
                            ? 'bg-rose-500 text-white border-transparent animate-pulse'
                            : 'bg-white/60 border-white/80 text-[#8e6d72] hover:bg-white'
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
                        onClick={() => downloadVoiceClip(voice)}
                        className="p-1.5 rounded-full border bg-white/60 border-white/80 text-[#8e6d72]/80 hover:text-[#8e6d72] hover:bg-white transition-all"
                        title={language === 'en' ? 'Download' : '下载录音'}
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteVoiceClip(voice.id)}
                        className="p-1.5 rounded-full border bg-white/40 border-transparent text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
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
            <div className="bg-[#ffe4e9]/20 border border-[#8e6d72]/15 rounded-2xl p-3 flex items-start gap-2 pt-2.5 shadow-inner">
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
                className="mt-1 accent-[#8e6d72] cursor-pointer"
              />
              <div className="text-left">
                <label
                  htmlFor="checkbox-loop-mantra"
                  className="text-[10.5px] font-bold text-[#8e6d72] block cursor-pointer"
                >
                  {language === 'en' ? '✨ Subconscious Loop: Play your voice during meditation' : '✨ 潜意识神意灌顶：在全屏冥想专注时，循环播放选中的亲口录音'}
                </label>
                <p className="text-[9px] text-[#6d5b5e] mt-0.5 leading-relaxed">
                  {language === 'en' ? 'Once enabled, your recorded audio will loop softly in the background. Hearing your own voice repeating desires is highly effective.' : '勾选后，当您启动全屏专注显化沙龙，本段音频将作为专属心愿指令，与背景音乐叠加柔和循环。听自己的声线念肯定句，潜意识最不易产生抗拒。'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER Master Audio Status Bar */}
      <div className="flex items-center gap-4 py-2.5 px-3.5 mt-4 rounded-2xl bg-white/45 border border-white/50 shadow-sm text-left">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3.5 rounded-full bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white shadow-md shadow-[#8e6d72]/10 hover:scale-105 active:scale-95 transition-all duration-200"
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
          <p className="text-xs font-bold text-[#4a3a3a] truncate">
            {activeTab === 'composer' ? (language === 'en' ? `Composing: ${composerHz}Hz resonance` : `正在定制: ${composerHz}Hz 脑波振动`) : currentTrack.name}
          </p>
          <p className="text-[9.5px] text-[#b49196] font-medium mt-0.5">
            {isPlaying
              ? isLiveComposing
                ? (language === 'en' ? '✨ Perfect brainwave resonance active...' : '✨ 智能赫兹声波完美共振中...')
                : (language === 'en' ? '🌸 Playing sacred ambient meditation track...' : '🌸 正在播放神圣冥想氛围音乐...')
              : (language === 'en' ? '🍵 Awaiting your manifestation journey...' : '🍵 静候您的显化旅程...')}
          </p>
        </div>

        {/* Volume adjust sliders */}
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-[#8e6d72]" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-[#8e6d72]/10 rounded-lg appearance-none cursor-pointer accent-[#8e6d72]"
            id="music-volume"
          />
        </div>
      </div>
    </div>
  );
}
