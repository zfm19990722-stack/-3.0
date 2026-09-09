import fs from 'fs';
import path from 'path';

const TRACKS_TO_SYNTH = [
  {
    filename: 'track_07_home_to_my_body.wav',
    duration: 58,
    baseHz: 432.0,
    chords: [432.0, 540.0, 648.0, 864.0],
  },
  {
    filename: 'track_08_trust_myself.wav',
    duration: 86,
    baseHz: 528.0,
    chords: [528.0, 660.0, 792.0, 1056.0],
  },
  {
    filename: 'track_09_softness_is_power.wav',
    duration: 83,
    baseHz: 639.0,
    chords: [639.0, 798.75, 958.5, 1278.0],
  },
  {
    filename: 'track_10_unconditional_worth.wav',
    duration: 56,
    baseHz: 963.0,
    chords: [481.5, 601.875, 722.25, 963.0],
  }
];

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  pcmBuffer.copy(buffer, 44);
  return buffer;
}

function synthesizeTrack(track) {
  const sampleRate = 24000;
  const numSamples = Math.floor(track.duration * sampleRate);
  const pcmBuffer = Buffer.alloc(numSamples * 2);

  const twoPi = 2 * Math.PI;

  for (let n = 0; n < numSamples; n++) {
    const t = n / sampleRate;

    // Chord pad synthesis
    let sample = 0;
    for (let i = 0; i < track.chords.length; i++) {
      const freq = track.chords[i];
      const weight = 1.0 / (i + 1);
      const lfo = 1.0 + 0.003 * Math.sin(twoPi * 0.2 * t + i);
      const tone = Math.sin(twoPi * freq * lfo * t) + 0.25 * Math.sin(twoPi * (freq * 2) * t);
      sample += weight * tone;
    }

    // Breath swell envelope (~8s cycle)
    const swell = 0.5 + 0.5 * Math.sin(twoPi * (1.0 / 8.0) * t - Math.PI / 2);
    sample *= (0.6 + 0.4 * swell);

    // Periodic crystal bowl chime every 14s
    const chimePeriod = 14;
    const chimeOffset = t % chimePeriod;
    if (chimeOffset < 7) {
      const decay = Math.exp(-chimeOffset / 2.2);
      const bowl = (Math.sin(twoPi * track.baseHz * chimeOffset) +
                    0.35 * Math.sin(twoPi * track.baseHz * 2.756 * chimeOffset) +
                    0.2 * Math.sin(twoPi * track.baseHz * 5.404 * chimeOffset)) * decay;
      sample += 0.45 * bowl;
    }

    // Fade in (3s) and Fade out (3s)
    if (t < 3.0) {
      sample *= (t / 3.0);
    } else if (t > track.duration - 3.0) {
      sample *= ((track.duration - t) / 3.0);
    }

    // Master gain & clamp
    sample = Math.max(-1, Math.min(1, sample * 0.35));
    const int16 = Math.floor(sample * 32767);
    pcmBuffer.writeInt16LE(int16, n * 2);
  }

  return pcmToWav(pcmBuffer, sampleRate, 1, 16);
}

const dir = path.join(process.cwd(), 'public', 'audio');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const track of TRACKS_TO_SYNTH) {
  const outPath = path.join(dir, track.filename);
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1000) {
    const wav = synthesizeTrack(track);
    fs.writeFileSync(outPath, wav);
    console.log(`Generated pad audio for ${track.filename} (${wav.length} bytes, ${track.duration}s)`);
  }
}

console.log("All missing tracks synthesized successfully!");
