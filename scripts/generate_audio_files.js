import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const AUDIO_TRACKS = [
  {
    filename: 'track_01_allow_receive.wav',
    title: 'I Allow Myself to Receive',
    titleZh: '01. 允许接纳 (I Allow Myself to Receive)',
    text: "I allow myself to receive. I don't have to give everything before I can receive something. I don't have to struggle before life can be gentle with me. I allow kindness to reach me. I allow love to reach me. I allow abundance to reach me. I let myself be cared for. I let myself be supported. I let myself be surprised by goodness. I don't push it away. I don't question it. I simply breathe and let it in. I am open. I am receptive. I am ready to receive."
  },
  {
    filename: 'track_02_deeply_loved.wav',
    title: 'I Am Deeply Loved',
    titleZh: '02. 深层被爱 (I Am Deeply Loved)',
    text: "I am deeply loved. Not because of what I achieve, not because of what I give, not because of how beautiful I appear. I am loved because I exist. I let love find me. I let love reach me. I let love stay. I no longer question whether I am enough. I am enough in my softness. I am enough in my silence. I am enough in my becoming. Love does not have to be chased. It recognizes me. It feels like home. It feels like peace. I am made of love, and I allow myself to receive it."
  },
  {
    filename: 'track_03_not_behind.wav',
    title: 'I Am Not Behind',
    titleZh: '03. 相信生命节奏 (I Am Not Behind)',
    text: "I am not behind. My life is not late. I don't need to compare my beginning to someone else's middle. I release the pressure to become everything at once. I am allowed to take my time. What is meant for me does not require me to betray myself. I can grow slowly. I can bloom quietly. There is no race. There is only my path. And I trust the timing of my life."
  },
  {
    filename: 'track_04_safe_here.wav',
    title: 'I Am Safe Here',
    titleZh: '04. 身心安全与回归本我 (I Am Safe Here)',
    text: "I am safe here. I am safe in my body. I am safe to be exactly who I am. I don't have to rush. I don't have to prove. I don't have to earn my place in this world. I am allowed to soften. I am allowed to rest. I am allowed to receive. Nothing is chasing me. Nothing is missing. I am held by life. I am supported by life. I belong here. I breathe, and I return to myself. I soften, and I remember. I am home within me."
  },
  {
    filename: 'track_05_choose_myself.wav',
    title: 'I Choose Myself',
    titleZh: '05. 选择爱自己 (I Choose Myself)',
    text: "I choose myself. Again and again, I choose myself. I listen to my body. I honor my feelings. I trust what I know within. I no longer abandon myself to be loved by someone else. I no longer shrink to make others comfortable. I give myself the love I once searched for everywhere. I speak to myself with tenderness. I hold myself with patience. I meet myself with compassion. I am worthy of my own devotion. I am not waiting to become someone I can finally love. I love myself now."
  },
  {
    filename: 'track_06_boundaries_freedom.wav',
    title: 'Boundaries & Freedom',
    titleZh: '06. 建立边界与自由 (Boundaries & Freedom)',
    text: "I don't have to earn love. I don't have to be useful to deserve to be here. I don't have to make everyone happy. I don't have to be everything for everyone. I am allowed to have boundaries. I am allowed to say no. I am allowed to choose what feels right for me. The right people don't require me to abandon myself. I can be loved without performing. I can be seen without pretending. I can simply be me, and that is enough."
  },
  {
    filename: 'track_07_home_to_my_body.wav',
    title: 'I Come Home to My Body',
    titleZh: '07. 身体感恩与接纳 (I Come Home to My Body)',
    text: "I come home to my body. I stop fighting the way I am. My body has carried me through every version of my life. I thank it. I listen to it. I care for it. I don't need to look different to deserve love. I don't need to be perfect to feel beautiful. I let my body breathe. I let my body soften. I let my body be. There is nothing wrong with me. My body is not a project. My body is my home, and I choose to love my home."
  },
  {
    filename: 'track_08_trust_myself.wav',
    title: 'I Trust Myself',
    titleZh: '08. 信任内在指引 (I Trust Myself)',
    text: "I trust myself. I trust the quiet voice within me. I trust my timing. I trust what my body tells me. I don't need to have everything figured out. I can move softly. I can change my mind. I can begin again. Every version of me deserves compassion. I release the need to be perfect. I release the need to be understood by everyone. I know who I am. And the more I return to myself, the clearer everything becomes. I trust my path. I trust my heart. I trust myself."
  },
  {
    filename: 'track_09_softness_is_power.wav',
    title: 'Softness Is Power',
    titleZh: '09. 温柔的力量与磁场 (Softness Is Power)',
    text: "I am soft, and I am powerful. I don't need to force. I don't need to chase. I don't need to convince. I simply allow myself to be. My softness is not weakness. My sensitivity is not a burden. My presence is enough. I move through life with grace. I attract what feels aligned. I welcome what feels nourishing. I release what no longer belongs to me. I am radiant without trying. The more I love myself, the more beautiful my life becomes. I don't become magnetic by becoming someone else. I become magnetic by fully becoming myself."
  },
  {
    filename: 'track_10_unconditional_worth.wav',
    title: 'Unconditional Worth',
    titleZh: '10. 纯粹配得感与完整自足 (Unconditional Worth)',
    text: "I don't have to earn love. I don't have to be useful to deserve to be here. I don't have to make everyone happy. I don't have to be everything for everyone. I am allowed to have boundaries. I am allowed to say no. I am allowed to choose what feels right for me. The right people don't require me to abandon myself. I can be loved without performing. I can be seen without pretending. I am worthy, whole, and complete exactly as I am."
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

async function generateTrack(track, index) {
  const outPath = path.join(process.cwd(), 'public', 'audio', track.filename);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    console.log(`Track ${index + 1} (${track.filename}) already exists. Skipping.`);
    return;
  }

  console.log(`Generating track ${index + 1}/${AUDIO_TRACKS.length}: ${track.title}...`);
  const prompt = `Read this in an incredibly gentle, soothing, calm, and serene female voice with high emotional warmth and slow, peaceful pacing for meditation affirmation:\n\n"${track.text}"`;

  let attempts = 0;
  while (attempts < 5) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error(`Failed to get audio data for ${track.title}`);
      }

      const pcmBuffer = Buffer.from(base64Audio, 'base64');
      const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);

      fs.writeFileSync(outPath, wavBuffer);
      console.log(`Saved ${outPath} (${wavBuffer.length} bytes)`);
      return;
    } catch (err) {
      attempts++;
      console.warn(`Attempt ${attempts} for track ${index + 1} failed: ${err.message}. Retrying in 12s...`);
      await new Promise(r => setTimeout(r, 12000));
    }
  }
}

async function main() {
  const dir = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (let i = 0; i < AUDIO_TRACKS.length; i++) {
    await generateTrack(AUDIO_TRACKS[i], i);
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("All audio generation tasks completed!");
}

main();
