export interface PureMeditationTrack {
  id: string;
  url: string;
  name: string;
  nameEn: string;
  category: 'love' | 'wealth' | 'beauty' | 'career' | 'lifestyle' | 'all';
  summary: string;
  frequencyBadge: string;
}

export const PURE_MEDITATION_TRACKS: PureMeditationTrack[] = [
  {
    id: 'track-528hz-miracle',
    url: 'synth:freq=528&wave=sine&beat=theta&soundscape=ocean&natureVol=0.55',
    name: '✨ 528Hz 奇迹显化与DNA细胞修复 (纯音乐)',
    nameEn: '✨ 528Hz Miracle Manifestation & DNA Repair (Pure Tone)',
    frequencyBadge: '🌿 528Hz 纯音乐',
    category: 'lifestyle',
    summary: '528Hz 索尔菲吉奥奇迹之频，融合空灵藏传金钵与 Theta 4Hz 潜意识脑波，纯净舒缓，不带任何语音打扰。'
  },
  {
    id: 'track-432hz-cosmic',
    url: 'synth:freq=432&wave=sine&beat=alpha&soundscape=forest&natureVol=0.5',
    name: '🌌 432Hz 宇宙源头自然谐振与静心 (纯音乐)',
    nameEn: '🌌 432Hz Cosmic Source & Deep Calm (Pure Tone)',
    frequencyBadge: '🍃 432Hz 纯音乐',
    category: 'lifestyle',
    summary: '432Hz 宇宙数学黄金频段，伴随晨曦森林微风与 Alpha 8Hz 放松波，令身心自然沉静安住。'
  },
  {
    id: 'track-639hz-heart',
    url: 'synth:freq=639&wave=triangle&beat=theta&soundscape=chimes&natureVol=0.5',
    name: '💖 639Hz 心轮共鸣与爱意丰盛 (纯音乐)',
    nameEn: '💖 639Hz Heart Chakra Love & Harmony (Pure Tone)',
    frequencyBadge: '🌸 639Hz 纯音乐',
    category: 'love',
    summary: '639Hz 开启心轮能量场，皇家竖琴微光与水晶风铃空灵共鸣，激发内在全然被爱与接纳。'
  },
  {
    id: 'track-396hz-root',
    url: 'synth:freq=396&wave=sine&beat=delta&soundscape=rain&natureVol=0.5',
    name: '🪐 396Hz 释放焦虑恐惧与根轮安定 (纯音乐)',
    nameEn: '🪐 396Hz Release Fear & Root Grounding (Pure Tone)',
    frequencyBadge: '🌧️ 396Hz 纯音乐',
    category: 'wealth',
    summary: '396Hz 稳固根轮基石，深沉温润正弦波与柔和雨声，彻底融化小我匮乏与焦虑抓取。'
  },
  {
    id: 'track-741hz-intuition',
    url: 'synth:freq=741&wave=sine&beat=alpha&soundscape=stream&natureVol=0.45',
    name: '💎 741Hz 意识净化与直觉灵感 (纯音乐)',
    nameEn: '💎 741Hz Intuitive Purification & Awakening (Pure Tone)',
    frequencyBadge: '💧 741Hz 纯音乐',
    category: 'career',
    summary: '741Hz 喉轮与灵性直觉激发频段，澄澈山泉流水与纯粹音频，洗涤杂念，开启高维灵感。'
  },
  {
    id: 'track-852hz-thirdeye',
    url: 'synth:freq=852&wave=triangle&beat=theta&soundscape=wind&natureVol=0.4',
    name: '👁️ 852Hz 眉心轮神圣洞见与觉醒 (纯音乐)',
    nameEn: '👁️ 852Hz Third Eye Divine Vision (Pure Tone)',
    frequencyBadge: '🔮 852Hz 纯音乐',
    category: 'beauty',
    summary: '852Hz 唤醒内在真实觉知，高频微风与纯粹泛音，穿透表象认出本自具足的真如。'
  },
  {
    id: 'track-963hz-crown',
    url: 'synth:freq=963&wave=sine&beat=theta&soundscape=temple&natureVol=0.45',
    name: '👑 963Hz 顶轮神圣合一与源头丰盛 (纯音乐)',
    nameEn: '👑 963Hz Crown Chakra Divine Source (Pure Tone)',
    frequencyBadge: '✨ 963Hz 纯音乐',
    category: 'lifestyle',
    summary: '963Hz 宇宙源头松果体共振频率，神圣殿堂钟鸣，引领意识回归无垠整体与终极丰盛。'
  },
  {
    id: 'princess-synth',
    url: '',
    name: '✨ 圣洁公主琴音 (Web 实时合成纯乐)',
    nameEn: '✨ Sacred Princess Chords (Web Synth)',
    frequencyBadge: '🎹 智能合成',
    category: 'beauty',
    summary: '由 Web Audio 纯算法实时生成的多层和弦与水晶泛音，纯净无瑕。'
  },
  {
    id: 'track-rose',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    name: '🎵 玫瑰古堡钢琴曲 (舒适静心纯乐)',
    nameEn: '🎵 Rose Castle Piano (Comfort Meditation)',
    frequencyBadge: '🎹 纯音钢琴',
    category: 'lifestyle',
    summary: '经典舒缓古典钢琴独奏，旋律优美纯净，适合深度沉浸与放松。'
  },
  {
    id: 'track-ambient',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    name: '🎵 水晶风铃之歌 (空灵声场纯乐)',
    nameEn: '🎵 Crystal Chimes Symphony (Ethereal Sound)',
    frequencyBadge: '🎐 空灵声场',
    category: 'lifestyle',
    summary: '空灵唯美的水晶风铃与弦乐铺底，营造出殿堂般的辽阔与静谧。'
  }
];
