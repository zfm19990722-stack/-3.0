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
  Square,
  Download,
  Save,
  Sparkles,
  Sliders,
  X,
  Radio,
  Disc3,
  Headphones,
} from 'lucide-react';

interface AudioPlayerProps {
  currentTrack: MusicTrack;
  onTrackChange: (track: MusicTrack) => void;
  tracks: MusicTrack[];
  onAddCustomTrack: (track: MusicTrack) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  language?: 'zh' | 'en';
}

export default function AudioPlayer({
  currentTrack,
  onTrackChange,
  tracks,
  onAddCustomTrack,
  isPlaying,
  setIsPlaying,
  volume,
  setVolume,
  language = 'zh',
}: AudioPlayerProps) {
  // Navigation tabs: Pure Music Selection vs. Smart Solfeggio Composer
  const [activeTab, setActiveTab] = useState<'tracks' | 'composer'>('tracks');

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Custom audio URL and file upload form state
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Solfeggio Composer states
  const [composerHz, setComposerHz] = useState<number>(528);
  const [composerWave, setComposerWave] = useState<OscillatorType>('sine');
  const [composerBeat, setComposerBeat] = useState<'none' | 'theta' | 'alpha' | 'delta'>('theta');
  const [composerNature, setComposerNature] = useState<NatureSoundType>('ocean');
  const [composerNatureVol, setComposerNatureVol] = useState<number>(0.55);
  const [composerName, setComposerName] = useState<string>('');
  const [isLiveComposing, setIsLiveComposing] = useState<boolean>(false);
  const [isRecordingComposer, setIsRecordingComposer] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);

  // Audio elements & node references
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synth AudioContext elements
  const synthIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const natureSoundscapeHandleRef = useRef<SoundscapeHandle | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const activeSourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  // Standard audio initialization
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      stopSynth();
    };
  }, []);

  // Helper: Parse Synthesizer settings from saved custom preset string
  const parseSynthUrl = (url: string) => {
    if (!url.startsWith('synth:')) return null;
    const params = new URLSearchParams(url.substring(6));
    return {
      freq: parseFloat(params.get('freq') || '528'),
      wave: (params.get('wave') || 'sine') as OscillatorType,
      beat: (params.get('beat') || 'theta') as 'none' | 'theta' | 'alpha' | 'delta',
      soundscape: (params.get('soundscape') || 'ocean') as NatureSoundType,
      natureVol: parseFloat(params.get('natureVol') || '0.55'),
    };
  };

  // Sync active track source and play/pause state
  useEffect(() => {
    if (!audioRef.current) return;

    // If active track is a synthesized preset
    if (currentTrack.id === 'princess-synth' || currentTrack.id.startsWith('custom-synth-') || currentTrack.url.startsWith('synth:')) {
      audioRef.current.pause();
      if (isPlaying) {
        startSynth();
      } else {
        stopSynth();
      }
      return;
    }

    // Standard static MP3 / audio track
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

  // Live procedural synthesis using Web Audio API
  const startSynth = () => {
    let baseHz = 528;
    let waveShape: OscillatorType = 'sine';
    let beatType: 'none' | 'theta' | 'alpha' | 'delta' = 'theta';
    let natureType: NatureSoundType = 'ocean';
    let natureVol = 0.55;

    if (currentTrack.url.startsWith('synth:')) {
      const parsed = parseSynthUrl(currentTrack.url);
      if (parsed) {
        baseHz = parsed.freq;
        waveShape = parsed.wave;
        beatType = parsed.beat;
        natureType = parsed.soundscape;
        natureVol = parsed.natureVol;
      }
    } else if (currentTrack.id === 'princess-synth') {
      baseHz = 432;
      waveShape = 'sine';
      beatType = 'theta';
      natureType = 'ocean';
      natureVol = 0.55;
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

  // Real-time live parameter updating in composer tab
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

  // Real-time change of nature soundscape
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

  // Run the peaceful synthesizer engine
  const runProceduralSynth = (
    baseHz: number,
    waveShape: OscillatorType,
    beatType: 'none' | 'theta' | 'alpha' | 'delta',
    natureType: NatureSoundType,
    natureVol = composerNatureVol
  ) => {
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
    mainGain.gain.setValueAtTime(volume > 0 ? volume : 0.6, ctx.currentTime);
    mainGain.connect(ctx.destination);
    mainGainRef.current = mainGain;

    // Ethereal Feedback Delay Network for expansive meditation space
    const delayNode = ctx.createDelay(3.0);
    const delayFeedback = ctx.createGain();
    const delayFilter = ctx.createBiquadFilter();

    delayNode.delayTime.setValueAtTime(1.2, ctx.currentTime);
    delayFeedback.gain.setValueAtTime(0.5, ctx.currentTime);
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(750, ctx.currentTime);

    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(mainGain);

    // Soft serene base pad
    const playDrone = (freq: number, type: OscillatorType, level: number) => {
      const osc1 = ctx.createOscillator();
      osc1.type = type;
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = type;
      osc2.frequency.setValueAtTime(freq, ctx.currentTime);
      osc2.detune.setValueAtTime(-10, ctx.currentTime);

      const osc3 = ctx.createOscillator();
      osc3.type = type;
      osc3.frequency.setValueAtTime(freq, ctx.currentTime);
      osc3.detune.setValueAtTime(10, ctx.currentTime);

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
      lfoGain.gain.setValueAtTime(level * 0.12, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(mainGain);

      const droneDelaySend = ctx.createGain();
      droneDelaySend.gain.setValueAtTime(0.2, ctx.currentTime);
      oscGain.connect(droneDelaySend);
      droneDelaySend.connect(delayNode);

      osc1.start();
      osc2.start();
      osc3.start();
      lfo.start();

      activeOscillatorsRef.current.push(osc1, osc2, osc3, lfo);
    };

    // Harmonic Chord Tones
    playDrone(baseHz / 2, waveShape, 0.5);
    playDrone(baseHz, waveShape, 0.35);
    playDrone(baseHz * 1.5, 'sine', 0.22);

    // Scientific Binaural Beats
    let beatFreq = 0;
    if (beatType === 'theta') beatFreq = 4;
    else if (beatType === 'alpha') beatFreq = 8;
    else if (beatType === 'delta') beatFreq = 2;

    if (beatFreq > 0) {
      const carrier = 144;

      const oscL = ctx.createOscillator();
      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(carrier, ctx.currentTime);
      const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const gainL = ctx.createGain();
      gainL.gain.setValueAtTime(0.16, ctx.currentTime);

      const oscR = ctx.createOscillator();
      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(carrier + beatFreq, ctx.currentTime);
      const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const gainR = ctx.createGain();
      gainR.gain.setValueAtTime(0.16, ctx.currentTime);

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

    // High-Fidelity Natural Soundscapes
    natureSoundscapeHandleRef.current = setupNatureSoundscape(ctx, mainGain, natureType, natureVol);

    // Soft pentatonic Solfeggio chimes
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
      osc2.detune.setValueAtTime(6, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, t);

      const chimeGain = ctx.createGain();
      const peakVolume = 0.07;
      const sustainVolume = peakVolume * 0.3;
      
      chimeGain.gain.setValueAtTime(0, t);
      chimeGain.gain.linearRampToValueAtTime(peakVolume, t + 0.15);
      chimeGain.gain.linearRampToValueAtTime(sustainVolume, t + 0.55);
      const releaseStart = t + 1.2;
      chimeGain.gain.setValueAtTime(sustainVolume, releaseStart);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + 4.5);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(chimeGain);
      chimeGain.connect(mainGain);

      const chimeDelaySend = ctx.createGain();
      chimeDelaySend.gain.setValueAtTime(0.6, t);
      chimeGain.connect(chimeDelaySend);
      chimeDelaySend.connect(delayNode);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 6);
      osc2.stop(t + 6);

      activeOscillatorsRef.current.push(osc1, osc2);
    };

    playChimeNote();

    const chimeLoop = () => {
      const nextTime = Math.random() * 2000 + 2000;
      synthIntervalRef.current = window.setTimeout(() => {
        playChimeNote();
        chimeLoop();
      }, nextTime);
    };
    chimeLoop();
  };

  // Render and download procedural composition
  const handleRecordComposer = async () => {
    if (isRecordingComposer) return;
    setIsRecordingComposer(true);
    setRecordingProgress(12);

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const dest = ctx.createMediaStreamDestination();

    const renderingGain = ctx.createGain();
    renderingGain.gain.setValueAtTime(0.85, ctx.currentTime);
    renderingGain.connect(dest);
    renderingGain.connect(ctx.destination);

    const renderingDelayNode = ctx.createDelay(3.0);
    const renderingDelayFeedback = ctx.createGain();
    const renderingDelayFilter = ctx.createBiquadFilter();

    renderingDelayNode.delayTime.setValueAtTime(1.2, ctx.currentTime);
    renderingDelayFeedback.gain.setValueAtTime(0.5, ctx.currentTime);
    renderingDelayFilter.type = 'lowpass';
    renderingDelayFilter.frequency.setValueAtTime(750, ctx.currentTime);

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
      osc2.detune.setValueAtTime(-10, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      const oscGain = ctx.createGain();
      const t = ctx.currentTime;
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(level * 0.4, t + 2.0);
      oscGain.gain.linearRampToValueAtTime(level * 0.35, t + 3.0);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(renderingGain);

      const droneDelaySend = ctx.createGain();
      droneDelaySend.gain.setValueAtTime(0.2, ctx.currentTime);
      oscGain.connect(droneDelaySend);
      droneDelaySend.connect(renderingDelayNode);

      osc1.start();
      osc2.start();

      return [osc1, osc2];
    };

    const renderedOscs: OscillatorNode[] = [];
    renderedOscs.push(...playRecordingDrone(composerHz / 2, composerWave, 0.55));
    renderedOscs.push(...playRecordingDrone(composerHz, composerWave, 0.35));

    const pentatonicScale = [1, 1.25, 1.5, 1.875, 2, 2.5, 3];
    const chimesInterval = setInterval(() => {
      const ratio = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
      const freq = composerHz * ratio;
      
      const osc1 = ctx.createOscillator();
      osc1.type = composerWave === 'sine' ? 'sine' : 'triangle';
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      const gain = ctx.createGain();
      const t = ctx.currentTime;
      const peakVolume = 0.1;
      const sustainVolume = peakVolume * 0.3;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peakVolume, t + 0.15);
      gain.gain.linearRampToValueAtTime(sustainVolume, t + 0.55);
      const releaseStart = t + 1.05;
      gain.gain.setValueAtTime(sustainVolume, releaseStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + 2.0);

      osc1.connect(filter);
      filter.connect(gain);
      gain.connect(renderingGain);

      const chimeDelaySend = ctx.createGain();
      chimeDelaySend.gain.setValueAtTime(0.6, t);
      gain.connect(chimeDelaySend);
      chimeDelaySend.connect(renderingDelayNode);

      osc1.start(t);
      osc1.stop(t + 3.2);
    }, 1300);

    const recSoundscapeHandle = setupNatureSoundscape(ctx, renderingGain, composerNature, composerNatureVol);

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
      a.download = `${composerName.trim() || '静心神圣赫兹纯音乐'}_${composerHz}Hz.webm`;
      a.click();
      setIsRecordingComposer(false);
    };

    mediaRecorder.start();

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
    const name = composerName.trim() || `定制 ${composerHz}Hz 静心纯音乐`;
    const newTrack: MusicTrack = {
      id: `custom-synth-${Date.now()}`,
      name: `🎹 ${name}`,
      nameEn: `🎹 ${name}`,
      url: `synth:freq=${composerHz}&wave=${composerWave}&beat=${composerBeat}&soundscape=${composerNature}&natureVol=${composerNatureVol}`,
      isCustom: true,
      frequencyBadge: `✨ ${composerHz}Hz 纯乐`,
      summary: language === 'en' ? 'Custom algorithmic pure meditation track' : '用户智能编曲定制纯音乐',
    };

    onAddCustomTrack(newTrack);
    onTrackChange(newTrack);
    setComposerName('');
    setIsPlaying(true);
    showToast(language === 'en' ? `✨ Saved "${name}" to pure music tracks!` : `✨「${name}」已成功保存至您的静心纯音乐曲库！`);
  };

  // Custom music URL submit handler
  const handleAddUrl = (e: FormEvent) => {
    e.preventDefault();
    if (!customUrl) return;

    const name = customName || `自定义静心曲目 ${tracks.length + 1}`;
    const newTrack: MusicTrack = {
      id: `custom-${Date.now()}`,
      name: `🌸 ${name}`,
      nameEn: `🌸 ${name}`,
      url: customUrl,
      isCustom: true,
      frequencyBadge: '🎵 外部音频',
      summary: language === 'en' ? 'Custom pure audio stream' : '用户自定义导入纯音乐',
    };

    onAddCustomTrack(newTrack);
    onTrackChange(newTrack);
    setCustomUrl('');
    setCustomName('');
    setShowAddForm(false);
    setIsPlaying(true);
    showToast(language === 'en' ? '✨ Custom music URL imported successfully!' : '✨ 成功导入自定义网络纯音乐！');
  };

  // File upload logic for pure calming MP3/WAV tracks
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let firstAddedTrack: MusicTrack | null = null;
    Array.from(files).forEach((file: File, index) => {
      const fileUrl = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newTrack: MusicTrack = {
        id: `custom-file-${Date.now()}-${index}`,
        name: `🎵 ${cleanName}`,
        nameEn: `🎵 ${cleanName}`,
        url: fileUrl,
        isCustom: true,
        frequencyBadge: '📁 本地纯乐',
        summary: language === 'en' ? 'Local pure meditation audio file' : '用户本地高保真静心纯音乐',
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
    showToast(language === 'en' ? `🎉 Imported ${files.length} pure music file(s)!` : `🎉 成功导入 ${files.length} 首本地静心纯音乐！`);
    setShowAddForm(false);
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
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tracks'
                ? 'bg-white text-[#8e6d72] shadow-sm font-bold'
                : 'text-[#8e6d72]/70 hover:bg-white/10'
            }`}
            id="tab-tracks"
          >
            <Music className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Pure Music' : '静心纯音乐'}</span>
          </button>
          <button
            onClick={() => setActiveTab('composer')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'composer'
                ? 'bg-white text-[#8e6d72] shadow-sm font-bold'
                : 'text-[#8e6d72]/70 hover:bg-white/10'
            }`}
            id="tab-composer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Solfeggio Composer' : '智能赫兹编曲'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
          </button>
        </div>

        {activeTab === 'tracks' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[10.5px] text-[#8e6d72] font-bold px-3 py-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-white/70 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            id="btn-add-music"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Import Music' : '导入纯音乐'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: PURE MEDITATION MUSIC SELECTION */}
      {activeTab === 'tracks' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Track Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  onTrackChange(track);
                  setIsPlaying(true);
                }}
                className={`p-3 rounded-2xl text-left text-xs transition-all duration-300 flex flex-col justify-between border cursor-pointer ${
                  currentTrack.id === track.id
                    ? 'bg-white/95 border-pink-300 text-[#8e6d72] shadow-md font-bold scale-[1.01] ring-1 ring-pink-300/40'
                    : 'bg-white/30 border-white/30 text-[#4a3a3a] hover:bg-white/50'
                }`}
                id={`track-select-${track.id}`}
              >
                <div className="flex items-start justify-between gap-1.5 w-full">
                  <span className="font-semibold leading-snug line-clamp-2">
                    {language === 'en' ? (track.nameEn || track.name) : track.name}
                  </span>
                  {currentTrack.id === track.id && isPlaying && (
                    <span className="flex items-center gap-0.5 shrink-0 mt-0.5">
                      <span className="w-1 h-3 bg-pink-500 rounded-full animate-pulse" />
                      <span className="w-1 h-2 bg-pink-400 rounded-full animate-bounce" />
                      <span className="w-1 h-3.5 bg-pink-600 rounded-full animate-pulse" />
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-pink-100/40">
                  <span className="text-[9px] text-[#b49196] font-mono tracking-wider font-bold">
                    {track.frequencyBadge || (track.url.startsWith('synth:') ? '✨ 索尔菲吉奥纯乐' : '🎵 静心原声')}
                  </span>
                  {track.summary && (
                    <span className="text-[8.5px] text-[#8e6d72]/70 truncate max-w-[120px]">
                      {track.summary}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Current Track Info Banner */}
          <div className="p-3.5 rounded-2xl bg-white/40 border border-white/60 flex items-center justify-between text-left animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-100/80 text-pink-700 flex items-center justify-center font-bold">
                <Disc3 className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <span className="text-[9.5px] uppercase tracking-wider text-[#b49196] font-bold block">
                  {language === 'en' ? 'Currently Playing Pure Tone' : '当前正在播放的静心纯音乐'}
                </span>
                <span className="text-xs font-bold text-[#8e6d72]">
                  {language === 'en' ? (currentTrack.nameEn || currentTrack.name) : currentTrack.name}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-700 text-[9.5px] font-bold">
              {language === 'en' ? '100% Pure Sound' : '100% 纯净静心'}
            </span>
          </div>

          {/* Custom Track Import Modal */}
          {showAddForm && (
            <div className="p-4 rounded-[24px] border border-white/70 bg-white/60 backdrop-blur-md space-y-3 animate-fadeIn shadow-lg">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#8e6d72]/15">
                <span className="text-[11px] font-bold text-[#8e6d72] uppercase tracking-wide flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-pink-500" />
                  <span>{language === 'en' ? 'Import Pure Meditation Audio' : '导入您的静心纯音乐文件 / 音频流'}</span>
                </span>
                <button onClick={() => setShowAddForm(false)} className="text-[#8e6d72] hover:text-black cursor-pointer p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload File */}
              <div className="space-y-1">
                <span className="text-[9.5px] font-bold text-[#8e6d72] block">
                  {language === 'en' ? 'Method 1: Batch Upload Pure Audio Files (MP3 / WAV / M4A)' : '方法一: 批量上传本地纯音乐文件 (支持多选 / MP3 / WAV / FLAC)'}
                </span>
                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-dashed border-[#b49196]/60 hover:border-[#8e6d72] bg-white/70 text-xs text-[#8e6d72] font-semibold transition-all text-center cursor-pointer shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-pink-500" />
                      <span>{language === 'en' ? 'Click or Drag Audio Files Here' : '点击选择或拖入本地静心纯音乐 (支持多选)'}</span>
                    </div>
                    <span className="text-[9.5px] text-[#b49196] font-normal">
                      {language === 'en' ? 'Local playback with 100% original lossless quality' : '本地无损播放，随时随地享受静谧纯乐'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-[9px] text-[#b49196] font-mono font-bold">OR</div>

              {/* Form Input URL */}
              <form onSubmit={handleAddUrl} className="space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[9.5px] font-bold text-[#8e6d72] block">
                    {language === 'en' ? 'Method 2: Enter MP3 Audio URL' : '方法二: 输入网络纯音乐 MP3 直链'}
                  </span>
                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://example.com/pure_meditation.mp3"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full text-xs pl-8.5 pr-2.5 py-2 rounded-xl border border-white/60 bg-white/70 focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder={language === 'en' ? 'Name this custom track (Optional)' : '给此纯乐曲目命名 (可选)'}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-white/60 bg-white/70 focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                />

                <button
                  type="submit"
                  disabled={!customUrl}
                  className="w-full py-2.5 rounded-xl bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Confirm Import' : '确认导入纯音乐'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COSMIC SOLFEGGIO COMPOSER (PURE INSTRUMENTAL SYNTHESIZER) */}
      {activeTab === 'composer' && (
        <div className="space-y-4 animate-fadeIn text-left">
          {/* Top description */}
          <div className="bg-[#ffe4e9]/40 rounded-2xl p-3.5 border border-[#8e6d72]/15">
            <p className="text-[11px] text-[#6d5b5e] leading-relaxed">
              {language === 'en' ? (
                <>
                  <strong>🎹 Pure Solfeggio Synthesizer</strong>: Real-time procedural sound engine generating pristine harmonic tones, soothing nature acoustics, and binaural brainwave frequencies. Completely pure instrumental music without any vocal interruptions.
                </>
              ) : (
                <>
                  <strong>🎹 宇宙神圣赫兹纯乐合成引擎</strong>：通过高精度 Web Audio 纯算法实时生成神圣索尔菲吉奥和弦、西藏金钵、皇家竖琴及高保真大自然环境音。<strong>100% 纯净静心声乐，无任何机械人声干扰。</strong>
                </>
              )}
            </p>
          </div>

          <div className="space-y-3.5">
            {/* 1. Base Frequency */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block mb-1.5">
                {language === 'en' ? '🌸 Solfeggio Pure Frequency' : '🌸 索尔菲吉奥神圣频率 (Solfeggio Pure Frequencies)'}
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { hz: 396, name: '根轮消除恐惧', nameEn: 'Release Fear' },
                  { hz: 432, name: '宇宙自然谐振', nameEn: 'Cosmic Unity' },
                  { hz: 528, name: 'DNA奇迹显化', nameEn: 'DNA Manifest' },
                  { hz: 639, name: '心轮爱与连接', nameEn: 'Heart Love' },
                  { hz: 741, name: '直觉启迪净化', nameEn: 'Cleanse' },
                  { hz: 963, name: '顶轮神圣合一', nameEn: 'Divine Crown' },
                ].map((item) => (
                  <button
                    key={item.hz}
                    onClick={() => {
                      setComposerHz(item.hz);
                      handleUpdateComposerSetting(item.hz, composerWave, composerBeat, composerNature);
                    }}
                    className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                      composerHz === item.hz
                        ? 'bg-white border-[#8e6d72] text-[#8e6d72] shadow-sm font-bold scale-[1.03]'
                        : 'bg-white/20 border-white/20 text-[#4a3a3a] hover:bg-white/40'
                    }`}
                  >
                    <div className="text-[10.5px] font-bold font-mono">{item.hz}Hz</div>
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
                  {language === 'en' ? '🎻 Instrument Timbre' : '🎻 纯乐器音色 (Instrument Timbre)'}
                </span>
                <select
                  value={composerWave}
                  onChange={(e) => {
                    const wave = e.target.value as OscillatorType;
                    setComposerWave(wave);
                    handleUpdateComposerSetting(composerHz, wave, composerBeat, composerNature);
                  }}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-white/60 bg-white/60 text-[#4a3a3a] focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                >
                  <option value="sine">{language === 'en' ? '🎐 Tibetan Singing Bowl (Sine)' : '🎐 空灵藏传金钵 (Sine)'}</option>
                  <option value="triangle">{language === 'en' ? '🌸 Royal Crystal Harp (Triangle)' : '🌸 皇家水晶竖琴 (Triangle)'}</option>
                  <option value="sawtooth">{language === 'en' ? '🌌 Cosmic Ambient Pad' : '🌌 浩瀚太空氛围和弦 (Pad)'}</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block mb-1">
                  {language === 'en' ? '🧘 Brainwave Resonance' : '🧘 深度脑波 (Binaural Beat)'}
                </span>
                <select
                  value={composerBeat}
                  onChange={(e) => {
                    const beat = e.target.value as any;
                    setComposerBeat(beat);
                    handleUpdateComposerSetting(composerHz, composerWave, beat, composerNature);
                  }}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-white/60 bg-white/60 text-[#4a3a3a] focus:outline-none focus:ring-1 focus:ring-[#8e6d72]/30"
                >
                  <option value="theta">{language === 'en' ? '🧠 Theta 4Hz (Subconscious Calm)' : '🧠 Theta 4Hz (潜意识深度静心)'}</option>
                  <option value="alpha">{language === 'en' ? '🍃 Alpha 8Hz (Relaxed Focus)' : '🍃 Alpha 8Hz (澄澈清明放松)'}</option>
                  <option value="delta">{language === 'en' ? '😴 Delta 2Hz (Deep Healing Sleep)' : '😴 Delta 2Hz (深层疗愈修护)'}</option>
                  <option value="none">{language === 'en' ? '🚫 No Binaural Beat' : '🚫 无脑波共鸣'}</option>
                </select>
              </div>
            </div>

            {/* 3. Soundscapes Overlay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8e6d72] block">
                  {language === 'en' ? '🌿 Organic Nature Soundscapes' : '🌿 模拟高保真大自然环境纯乐 (Nature Soundscapes)'}
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
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
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
                placeholder={language === 'en' ? 'Name this custom pure track (e.g. 528Hz Ocean Zen...)' : '给这首静心纯乐起个名字 (如：528Hz 潮汐静心曲...)'}
                value={composerName}
                onChange={(e) => setComposerName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/60 bg-white/50 placeholder-[#b49196]/80 text-[#4a3a3a] focus:outline-none focus:ring-2 focus:ring-[#8e6d72]/15"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Save Preset */}
                <button
                  type="button"
                  onClick={handleSaveComposerPreset}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-white/90 text-[#8e6d72] border border-[#8e6d72]/30 font-semibold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Save to Pure Tracks' : '存入静心曲库'}</span>
                </button>

                {/* Instant recording download */}
                <button
                  type="button"
                  onClick={handleRecordComposer}
                  disabled={isRecordingComposer}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRecordingComposer ? (
                    <>
                      <div className="w-3 h-3 border-2 border-pink-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>{language === 'en' ? `Recording (${recordingProgress}s)` : `录制中 (${recordingProgress}s)`}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Export Audio File' : '导出纯音乐音频'}</span>
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
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-white font-semibold text-xs shadow-md transition-all cursor-pointer ${
                    isLiveComposing
                      ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
                      : 'bg-[#8e6d72] hover:bg-[#8e6d72]/90'
                  }`}
                >
                  {isLiveComposing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isLiveComposing ? (language === 'en' ? 'Stop Synth' : '停止演奏') : (language === 'en' ? 'Live Play' : '实时试听演奏')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER Master Audio Status Bar */}
      <div className="flex items-center gap-4 py-2.5 px-3.5 mt-4 rounded-2xl bg-white/50 border border-white/60 shadow-sm text-left">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3.5 rounded-full bg-[#8e6d72] hover:bg-[#8e6d72]/90 text-white shadow-md shadow-[#8e6d72]/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
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
            {activeTab === 'composer' ? (language === 'en' ? `Solfeggio Synth: ${composerHz}Hz pure tone` : `正在实时定制: ${composerHz}Hz 神圣纯音`) : currentTrack.name}
          </p>
          <p className="text-[9.5px] text-[#b49196] font-medium mt-0.5">
            {isPlaying
              ? isLiveComposing
                ? (language === 'en' ? '✨ Pure harmonic frequency active...' : '✨ 神圣赫兹纯音乐共振中...')
                : (language === 'en' ? '🌸 Playing serene meditation pure music...' : '🌸 正在播放静心纯音乐...')
              : (language === 'en' ? '🍵 Awaiting your serene meditation journey...' : '🍵 随时点击开启静心纯音乐...')}
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
            className="w-16 h-1 bg-[#8e6d72]/20 rounded-lg appearance-none cursor-pointer accent-[#8e6d72]"
            id="music-volume"
          />
        </div>
      </div>
    </div>
  );
}
