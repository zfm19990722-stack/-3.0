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

const REMAINING_TRACKS = [
  {
    filename: 'track_07_home_to_my_body.wav',
    title: 'I Come Home to My Body',
    text: "I come home to my body. I stop fighting the way I am. My body has carried me through every version of my life. I thank it. I listen to it. I care for it. I don't need to look different to deserve love. I don't need to be perfect to feel beautiful. I let my body breathe. I let my body soften. I let my body be. There is nothing wrong with me. My body is not a project. My body is my home, and I choose to love my home."
  },
  {
    filename: 'track_08_trust_myself.wav',
    title: 'I Trust Myself',
    text: "I trust myself. I trust the quiet voice within me. I trust my timing. I trust what my body tells me. I don't need to have everything figured out. I can move softly. I can change my mind. I can begin again. Every version of me deserves compassion. I release the need to be perfect. I release the need to be understood by everyone. I know who I am. And the more I return to myself, the clearer everything becomes. I trust my path. I trust my heart. I trust myself."
  },
  {
    filename: 'track_09_softness_is_power.wav',
    title: 'Softness Is Power',
    text: "I am soft, and I am powerful. I don't need to force. I don't need to chase. I don't need to convince. I simply allow myself to be. My softness is not weakness. My sensitivity is not a burden. My presence is enough. I move through life with grace. I attract what feels aligned. I welcome what feels nourishing. I release what no longer belongs to me. I am radiant without trying. The more I love myself, the more beautiful my life becomes. I don't become magnetic by becoming someone else. I become magnetic by fully becoming myself."
  },
  {
    filename: 'track_10_unconditional_worth.wav',
    title: 'Unconditional Worth',
    text: "I don't have to earn love. I don't have to be useful to deserve to be here. I don't have to make everyone happy. I don't have to be everything for everyone. I am allowed to have boundaries. I am allowed to say no. I am allowed to choose what feels right for me. The right people don't require me to abandon myself. I can be loved without performing. I can be seen without pretending. I am worthy, whole, and complete exactly as I am."
  }
];

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  pcmBuffer.copy(buffer, 44);
  return buffer;
}

async function generateWithRetry(track) {
  console.log(`Starting voice narration for ${track.title}...`);
  const prompt = `Read this in an incredibly gentle, soothing, calm, and serene female voice with high emotional warmth and slow, peaceful pacing for meditation affirmation:\n\n"${track.text}"`;

  for (let attempt = 1; attempt <= 10; attempt++) {
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
      if (base64Audio) {
        const pcmBuffer = Buffer.from(base64Audio, 'base64');
        const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
        const outPath = path.join(process.cwd(), 'public', 'audio', track.filename);
        fs.writeFileSync(outPath, wavBuffer);
        console.log(`Successfully generated and saved voice narration for ${track.filename} (${wavBuffer.length} bytes)`);
        return true;
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} for ${track.title} failed: ${err.message}. Waiting 15s...`);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
  return false;
}

async function main() {
  for (const track of REMAINING_TRACKS) {
    await generateWithRetry(track);
    // Add delay between requests to stay within rate limits
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log("Completed voice generation for tracks 7-10!");
}

main();
