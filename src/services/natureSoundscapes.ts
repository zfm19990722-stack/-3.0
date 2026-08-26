/**
 * High-Fidelity Procedural Nature Soundscape Generator
 * Generates organic, soothing nature acoustics (Ocean, Rain, Wind, Stream, Night Crickets, Forest Birds)
 * using Web Audio API procedural synthesis with zero external audio asset dependency.
 */

export type NatureSoundType = 'none' | 'ocean' | 'rain' | 'wind' | 'stream' | 'night' | 'birds';

export interface NatureOption {
  id: NatureSoundType;
  name: string;
  nameEn: string;
  emoji: string;
  desc: string;
  descEn: string;
}

export const NATURE_SOUNDSCAPES_OPTIONS: NatureOption[] = [
  {
    id: 'ocean',
    name: '🌊 潮汐涌动',
    nameEn: '🌊 Ocean Tide',
    emoji: '🌊',
    desc: '深海浪涌与白噪音退潮',
    descEn: 'Deep ocean swells & foaming surf',
  },
  {
    id: 'rain',
    name: '🌧️ 舒缓细雨',
    nameEn: '🌧️ Gentle Rain',
    emoji: '🌧️',
    desc: '窗边细雨与雨滴微落声',
    descEn: 'Soothing rain with micro droplet taps',
  },
  {
    id: 'wind',
    name: '🍃 幽谷清风',
    nameEn: '🍃 Valley Breeze',
    emoji: '🍃',
    desc: '穿林晚风与松涛微啸',
    descEn: 'Resonant mountain wind through pine woods',
  },
  {
    id: 'stream',
    name: '🏞️ 森林溪流',
    nameEn: '🏞️ Forest Stream',
    emoji: '🏞️',
    desc: '潺潺清泉与水泡微鸣',
    descEn: 'Crisp mountain stream & bubbling water',
  },
  {
    id: 'night',
    name: '🌙 夏夜虫鸣',
    nameEn: '🌙 Night Crickets',
    emoji: '🌙',
    desc: '静谧夜色与草丛秋蝉',
    descEn: 'Peaceful starry night & rhythmic crickets',
  },
  {
    id: 'birds',
    name: '🕊️ 晨光林鸟',
    nameEn: '🕊️ Forest Birds',
    emoji: '🕊️',
    desc: '晨曦林间空灵清脆鸟鸣',
    descEn: 'Gentle morning woods & ethereal bird songs',
  },
  {
    id: 'none',
    name: '🚫 纯净赫兹',
    nameEn: '🚫 Pure Frequencies',
    emoji: '🚫',
    desc: '仅保留核心赫兹梵音',
    descEn: 'Silent backdrop, pure harmonic tones only',
  },
];

/**
 * Generates true stereo Pink Noise (Paul Kellet's algorithm: -3dB/octave slope)
 */
export function createPinkNoiseBuffer(ctx: AudioContext, durationSeconds = 6): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.15;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

/**
 * Generates stereo Brown Noise (Integrated random walk for deep low-end rumbling)
 */
export function createBrownNoiseBuffer(ctx: AudioContext, durationSeconds = 6): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  }
  return buffer;
}

export interface SoundscapeHandle {
  stop: () => void;
  setVolume: (vol: number) => void;
}

/**
 * Builds and connects a procedural nature soundscape to the destination AudioNode.
 */
export function setupNatureSoundscape(
  ctx: AudioContext,
  destination: AudioNode,
  natureType: NatureSoundType,
  volumeLevel = 0.6
): SoundscapeHandle {
  if (natureType === 'none') {
    return { stop: () => {}, setVolume: () => {} };
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.max(0, Math.min(1.5, volumeLevel)), ctx.currentTime);
  masterGain.connect(destination);

  const activeOscs: OscillatorNode[] = [];
  const activeSources: AudioBufferSourceNode[] = [];
  const activeIntervals: number[] = [];

  try {
    if (natureType === 'ocean') {
      // --- 🌊 OCEAN TIDE: Multi-stage surging waves + foam spray ---
      const brownBuf = createBrownNoiseBuffer(ctx, 8);
      const pinkBuf = createPinkNoiseBuffer(ctx, 8);

      const brownSrc = ctx.createBufferSource();
      brownSrc.buffer = brownBuf;
      brownSrc.loop = true;

      const pinkSrc = ctx.createBufferSource();
      pinkSrc.buffer = pinkBuf;
      pinkSrc.loop = true;

      // Primary wave body filter (deep surge 120Hz -> 650Hz)
      const waveFilter = ctx.createBiquadFilter();
      waveFilter.type = 'lowpass';
      waveFilter.Q.setValueAtTime(1.8, ctx.currentTime);
      waveFilter.frequency.setValueAtTime(280, ctx.currentTime);

      // Foam/spray bandpass filter
      const foamFilter = ctx.createBiquadFilter();
      foamFilter.type = 'bandpass';
      foamFilter.Q.setValueAtTime(1.2, ctx.currentTime);
      foamFilter.frequency.setValueAtTime(1200, ctx.currentTime);

      const waveGain = ctx.createGain();
      waveGain.gain.setValueAtTime(0.24, ctx.currentTime);

      const foamGain = ctx.createGain();
      foamGain.gain.setValueAtTime(0.08, ctx.currentTime);

      // Wave surge LFO (period ~7.5s, 0.133Hz)
      const waveLfo = ctx.createOscillator();
      waveLfo.type = 'sine';
      waveLfo.frequency.setValueAtTime(0.13, ctx.currentTime);

      const waveLfoFreqGain = ctx.createGain();
      waveLfoFreqGain.gain.setValueAtTime(260, ctx.currentTime);
      waveLfo.connect(waveLfoFreqGain);
      waveLfoFreqGain.connect(waveFilter.frequency);

      const waveLfoAmpGain = ctx.createGain();
      waveLfoAmpGain.gain.setValueAtTime(0.12, ctx.currentTime);
      waveLfo.connect(waveLfoAmpGain);
      waveLfoAmpGain.connect(waveGain.gain);

      // Foam surge LFO
      const foamLfoGain = ctx.createGain();
      foamLfoGain.gain.setValueAtTime(0.06, ctx.currentTime);
      waveLfo.connect(foamLfoGain);
      foamLfoGain.connect(foamGain.gain);

      brownSrc.connect(waveFilter);
      pinkSrc.connect(waveFilter);
      waveFilter.connect(waveGain);
      waveGain.connect(masterGain);

      pinkSrc.connect(foamFilter);
      foamFilter.connect(foamGain);
      foamGain.connect(masterGain);

      brownSrc.start();
      pinkSrc.start();
      waveLfo.start();

      activeSources.push(brownSrc, pinkSrc);
      activeOscs.push(waveLfo);

    } else if (natureType === 'rain') {
      // --- 🌧️ GENTLE RAIN: Textured steady rainfall + micro water droplet plinks ---
      const pinkBuf = createPinkNoiseBuffer(ctx, 6);
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = pinkBuf;
      rainSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.Q.setValueAtTime(0.6, ctx.currentTime);
      rainFilter.frequency.setValueAtTime(1800, ctx.currentTime);

      const rainHighpass = ctx.createBiquadFilter();
      rainHighpass.type = 'highpass';
      rainHighpass.frequency.setValueAtTime(320, ctx.currentTime);

      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.18, ctx.currentTime);

      rainSrc.connect(rainFilter);
      rainFilter.connect(rainHighpass);
      rainHighpass.connect(rainGain);
      rainGain.connect(masterGain);

      rainSrc.start();
      activeSources.push(rainSrc);

      // Micro droplet drops generator
      const dropletInterval = window.setInterval(() => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        const dropletOsc = ctx.createOscillator();
        const dropletGain = ctx.createGain();
        const dropFreq = 1600 + Math.random() * 1400;

        dropletOsc.type = 'sine';
        dropletOsc.frequency.setValueAtTime(dropFreq, now);
        dropletOsc.frequency.exponentialRampToValueAtTime(dropFreq * 0.7, now + 0.025);

        dropletGain.gain.setValueAtTime(0, now);
        dropletGain.gain.linearRampToValueAtTime(0.045, now + 0.003);
        dropletGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        dropletOsc.connect(dropletGain);
        dropletGain.connect(masterGain);

        dropletOsc.start(now);
        dropletOsc.stop(now + 0.03);
      }, 120);

      activeIntervals.push(dropletInterval);

    } else if (natureType === 'wind') {
      // --- 🍃 VALLEY BREEZE: Resonant sweeping mountain & pine tree wind ---
      const brownBuf = createBrownNoiseBuffer(ctx, 8);
      const pinkBuf = createPinkNoiseBuffer(ctx, 8);

      const brownSrc = ctx.createBufferSource();
      brownSrc.buffer = brownBuf;
      brownSrc.loop = true;

      const pinkSrc = ctx.createBufferSource();
      pinkSrc.buffer = pinkBuf;
      pinkSrc.loop = true;

      // Resonant bandpass whistling filter 1
      const windFilter1 = ctx.createBiquadFilter();
      windFilter1.type = 'bandpass';
      windFilter1.Q.setValueAtTime(3.6, ctx.currentTime);
      windFilter1.frequency.setValueAtTime(380, ctx.currentTime);

      // Resonant bandpass filter 2
      const windFilter2 = ctx.createBiquadFilter();
      windFilter2.type = 'bandpass';
      windFilter2.Q.setValueAtTime(4.2, ctx.currentTime);
      windFilter2.frequency.setValueAtTime(620, ctx.currentTime);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.22, ctx.currentTime);

      // Dual slow LFOs for wandering gusts
      const windLfo1 = ctx.createOscillator();
      windLfo1.type = 'sine';
      windLfo1.frequency.setValueAtTime(0.07, ctx.currentTime);

      const windLfo1Gain = ctx.createGain();
      windLfo1Gain.gain.setValueAtTime(180, ctx.currentTime);
      windLfo1.connect(windLfo1Gain);
      windLfo1Gain.connect(windFilter1.frequency);

      const windLfo2 = ctx.createOscillator();
      windLfo2.type = 'sine';
      windLfo2.frequency.setValueAtTime(0.11, ctx.currentTime);

      const windLfo2Gain = ctx.createGain();
      windLfo2Gain.gain.setValueAtTime(240, ctx.currentTime);
      windLfo2.connect(windLfo2Gain);
      windLfo2Gain.connect(windFilter2.frequency);

      brownSrc.connect(windFilter1);
      pinkSrc.connect(windFilter1);
      windFilter1.connect(windGain);

      brownSrc.connect(windFilter2);
      pinkSrc.connect(windFilter2);
      windFilter2.connect(windGain);

      windGain.connect(masterGain);

      brownSrc.start();
      pinkSrc.start();
      windLfo1.start();
      windLfo2.start();

      activeSources.push(brownSrc, pinkSrc);
      activeOscs.push(windLfo1, windLfo2);

    } else if (natureType === 'stream') {
      // --- 🏞️ FOREST STREAM: Multi-pole sparkling water & bubbling droplets ---
      const pinkBuf = createPinkNoiseBuffer(ctx, 6);
      const streamSrc = ctx.createBufferSource();
      streamSrc.buffer = pinkBuf;
      streamSrc.loop = true;

      const streamFilter1 = ctx.createBiquadFilter();
      streamFilter1.type = 'bandpass';
      streamFilter1.Q.setValueAtTime(1.5, ctx.currentTime);
      streamFilter1.frequency.setValueAtTime(950, ctx.currentTime);

      const streamFilter2 = ctx.createBiquadFilter();
      streamFilter2.type = 'lowpass';
      streamFilter2.frequency.setValueAtTime(2200, ctx.currentTime);

      const streamGain = ctx.createGain();
      streamGain.gain.setValueAtTime(0.18, ctx.currentTime);

      // Fast ripple LFO
      const rippleLfo = ctx.createOscillator();
      rippleLfo.type = 'sine';
      rippleLfo.frequency.setValueAtTime(1.3, ctx.currentTime);

      const rippleGain = ctx.createGain();
      rippleGain.gain.setValueAtTime(250, ctx.currentTime);
      rippleLfo.connect(rippleGain);
      rippleGain.connect(streamFilter1.frequency);

      streamSrc.connect(streamFilter1);
      streamFilter1.connect(streamFilter2);
      streamFilter2.connect(streamGain);
      streamGain.connect(masterGain);

      streamSrc.start();
      rippleLfo.start();

      activeSources.push(streamSrc);
      activeOscs.push(rippleLfo);

      // Bubble pop generator
      const bubbleInterval = window.setInterval(() => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        const bubOsc = ctx.createOscillator();
        const bubGain = ctx.createGain();
        const startFreq = 650 + Math.random() * 550;

        bubOsc.type = 'sine';
        bubOsc.frequency.setValueAtTime(startFreq, now);
        bubOsc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.03);

        bubGain.gain.setValueAtTime(0, now);
        bubGain.gain.linearRampToValueAtTime(0.04, now + 0.005);
        bubGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        bubOsc.connect(bubGain);
        bubGain.connect(masterGain);

        bubOsc.start(now);
        bubOsc.stop(now + 0.04);
      }, 160);

      activeIntervals.push(bubbleInterval);

    } else if (natureType === 'night') {
      // --- 🌙 NIGHT CRICKETS: Warm night bed + gentle pulsed FM cricket chirps ---
      const brownBuf = createBrownNoiseBuffer(ctx, 6);
      const nightSrc = ctx.createBufferSource();
      nightSrc.buffer = brownBuf;
      nightSrc.loop = true;

      const nightFilter = ctx.createBiquadFilter();
      nightFilter.type = 'lowpass';
      nightFilter.frequency.setValueAtTime(220, ctx.currentTime);

      const nightGain = ctx.createGain();
      nightGain.gain.setValueAtTime(0.09, ctx.currentTime);

      nightSrc.connect(nightFilter);
      nightFilter.connect(nightGain);
      nightGain.connect(masterGain);

      nightSrc.start();
      activeSources.push(nightSrc);

      // Rhythmic cricket chirping pattern
      const playCricketChirp = () => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        const pulses = 3;
        for (let p = 0; p < pulses; p++) {
          const t = now + p * 0.06;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(4800 + Math.random() * 200, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.035, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(t);
          osc.stop(t + 0.05);
        }
      };

      playCricketChirp();
      const cricketInterval = window.setInterval(() => {
        playCricketChirp();
      }, 2200);

      activeIntervals.push(cricketInterval);

    } else if (natureType === 'birds') {
      // --- 🕊️ FOREST BIRDS: Woodland breeze bed + sweet musical bird tweets ---
      const pinkBuf = createPinkNoiseBuffer(ctx, 6);
      const woodsSrc = ctx.createBufferSource();
      woodsSrc.buffer = pinkBuf;
      woodsSrc.loop = true;

      const woodsFilter = ctx.createBiquadFilter();
      woodsFilter.type = 'bandpass';
      woodsFilter.Q.setValueAtTime(0.8, ctx.currentTime);
      woodsFilter.frequency.setValueAtTime(700, ctx.currentTime);

      const woodsGain = ctx.createGain();
      woodsGain.gain.setValueAtTime(0.12, ctx.currentTime);

      woodsSrc.connect(woodsFilter);
      woodsFilter.connect(woodsGain);
      woodsGain.connect(masterGain);

      woodsSrc.start();
      activeSources.push(woodsSrc);

      // Generative Birds Song tweets
      const playBirdSong = () => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        const notesCount = 2 + Math.floor(Math.random() * 3);
        let timeOffset = 0;

        for (let i = 0; i < notesCount; i++) {
          const t = now + timeOffset;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startF = 2600 + Math.random() * 1200;
          const endF = startF + (Math.random() > 0.5 ? 400 : -400);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(startF, t);
          osc.frequency.exponentialRampToValueAtTime(Math.max(1200, endF), t + 0.08);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.04, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(t);
          osc.stop(t + 0.1);
          timeOffset += 0.11 + Math.random() * 0.05;
        }
      };

      playBirdSong();
      const birdInterval = window.setInterval(() => {
        playBirdSong();
      }, 3400);

      activeIntervals.push(birdInterval);
    }
  } catch (err) {
    console.error('Error setting up nature soundscape:', err);
  }

  return {
    stop: () => {
      activeIntervals.forEach((int) => clearInterval(int));
      activeSources.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {}
      });
      activeOscs.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      try {
        masterGain.disconnect();
      } catch (e) {}
    },
    setVolume: (vol: number) => {
      try {
        masterGain.gain.setValueAtTime(Math.max(0, Math.min(1.5, vol)), ctx.currentTime);
      } catch (e) {}
    },
  };
}
