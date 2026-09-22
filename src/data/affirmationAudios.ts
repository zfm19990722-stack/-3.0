export interface AffirmationAudioTrack {
  id: string;
  filename: string;
  url: string;
  title: string;
  titleZh: string;
  titleEn: string;
  category: 'love' | 'wealth' | 'beauty' | 'career' | 'lifestyle';
  transcript: string;
  transcriptZh: string;
  summary: string;
  frequencyBadge: string;
}

export const UPLOADED_AFFIRMATION_AUDIOS: AffirmationAudioTrack[] = [
  {
    id: 'audio-01-allow-receive',
    filename: 'track_01_allow_receive.wav',
    url: '/audio/track_01_allow_receive.wav',
    title: '01. 允许接纳 (纯净原声)',
    titleZh: '01. 允许接纳与丰盛流淌',
    titleEn: '01. I Allow Myself to Receive',
    frequencyBadge: '🎙️ 纯净原声',
    category: 'lifestyle',
    summary: '100% 纯净高保真原声录音。放下无谓的挣扎与过度付出，向宇宙的善意与丰盛完全敞开。',
    transcript: "I allow myself to receive. I don't have to give everything before I can receive something. I don't have to struggle before life can be gentle with me. I allow kindness to reach me. I allow love to reach me. I allow abundance to reach me. I let myself be cared for. I let myself be supported. I let myself be surprised by goodness. I don't push it away. I don't question it. I simply breathe and let it in. I am open. I am receptive. I am ready to receive.",
    transcriptZh: '我允许自己接纳。在得到之前，我无需掏空自己去付出。在生命温柔以待之前，我无需历经苦难。我允许善意抵达我，我允许爱意抵达我，我允许丰盛流向我。我让自己被照拂，被支持，被生命的美好所惊喜。我不推开，不怀疑，只是静静呼吸，全然接纳。我敞开，我接纳，我已准备好迎接一切美好。'
  },
  {
    id: 'audio-02-deeply-loved',
    filename: 'track_02_deeply_loved.wav',
    url: '/audio/track_02_deeply_loved.wav',
    title: '02. 深层被爱 (纯净原声)',
    titleZh: '02. 深层被爱与天然配得',
    titleEn: '02. I Am Deeply Loved',
    frequencyBadge: '🎙️ 纯净原声',
    category: 'love',
    summary: '100% 纯净高保真原声录音。非因外在成就或外貌，仅因你的存在，你已被宇宙深沉深爱。',
    transcript: "I am deeply loved. Not because of what I achieve, not because of what I give, not because of how beautiful I appear. I am loved because I exist. I let love find me. I let love reach me. I let love stay. I no longer question whether I am enough. I am enough in my softness. I am enough in my silence. I am enough in my becoming. Love does not have to be chased. It recognizes me. It feels like home. It feels like peace. I am made of love, and I allow myself to receive it.",
    transcriptZh: '我被深深地爱着。不是因为我的成就，不是因为我的付出，也不是因为我表现得多么美丽。我被爱，仅仅因为我的存在。我让爱找到我，让爱触碰我，让爱留下来。我不再怀疑自己是否足够好。在我的柔软中我已足够，在我的静默中我已足够，在我的蜕变中我已足够。爱无需追逐，它自然认得我。它如同归家，如同宁静。我本就是爱所铸就，我允许自己全然接纳它。'
  },
  {
    id: 'audio-03-not-behind',
    filename: 'track_03_not_behind.wav',
    url: '/audio/track_03_not_behind.wav',
    title: '03. 相信节奏 (纯净原声)',
    titleZh: '03. 信任生命的节奏与花期',
    titleEn: '03. I Am Not Behind',
    frequencyBadge: '🎙️ 纯净原声',
    category: 'career',
    summary: '100% 纯净高保真原声录音。无需与他人比较，卸下焦虑与紧绷，信任生命自身的完美时机。',
    transcript: "I am not behind. My life is not late. I don't need to compare my beginning to someone else's middle. I release the pressure to become everything at once. I am allowed to take my time. What is meant for me does not require me to betray myself. I can grow slowly. I can bloom quietly. There is no race. There is only my path. And I trust the timing of my life.",
    transcriptZh: '我没有落后，我的生命从未迟到。我无需用自己的起点去对比他人的中途。我释放掉必须一蹴而就的压力。我被允许慢慢来。真正属于我的一切，绝不需要我背叛真实的自己。我可以缓慢生长，可以静谧绽放。没有竞赛，只有属于我自己的道路。我深深信任我生命的时机与安排。'
  },
  {
    id: 'audio-04-safe-here',
    filename: 'track_04_safe_here.wav',
    url: '/audio/track_04_safe_here.wav',
    title: '04. 身心安全 (纯净原声)',
    titleZh: '04. 身心安全与回归本我',
    titleEn: '04. I Am Safe Here',
    frequencyBadge: '🎙️ 纯净原声',
    category: 'beauty',
    summary: '100% 纯净高保真原声录音。在身体与当下中安歇，没有追赶，没有匮乏，被生命全然托起。',
    transcript: "I am safe here. I am safe in my body. I am safe to be exactly who I am. I don't have to rush. I don't have to prove. I don't have to earn my place in this world. I am allowed to soften. I am allowed to rest. I am allowed to receive. Nothing is chasing me. Nothing is missing. I am held by life. I am supported by life. I belong here. I breathe, and I return to myself. I soften, and I remember. I am home within me.",
    transcriptZh: '我在这里很安全。我在自己的身体里感到踏实安宁。做真实的自己是全然安全的。我无需匆忙奔走，无需用力证明，无需在世间争夺立足之地。我被允许柔软下来，被允许安歇，被允许接纳。没有人在追赶我，没有任何事物缺失。我被生命深情托起，被生命全力支持。我属于这里。我深吸一口气，回归内在；我柔软下来，忆起本真：我的内在就是我永恒的家园。'
  },
  {
    id: 'audio-05-choose-myself',
    filename: 'track_05_choose_myself.wav',
    url: '/audio/track_05_choose_myself.wav',
    title: '05. 选择自己 (纯净原声)',
    titleZh: '05. 选择爱自己与自我忠诚',
    titleEn: '05. I Choose Myself',
    frequencyBadge: '🎙️ 纯净原声',
    category: 'love',
    summary: '100% 纯净高保真原声录音。倾听身体与感受，不再自我委屈讨好，给自己无条件的深情与慈悲。',
    transcript: "I choose myself. Again and again, I choose myself. I listen to my body. I honor my feelings. I trust what I know within. I no longer abandon myself to be loved by someone else. I no longer shrink to make others comfortable. I give myself the love I once searched for everywhere. I speak to myself with tenderness. I hold myself with patience. I meet myself with compassion. I am worthy of my own devotion. I am not waiting to become someone I can finally love. I love myself now.",
    transcriptZh: '我选择我自己。一次又一次，我坚定地选择自己。我倾听身体的声音，尊重内心的感受，信任内在的知晓。我不再为了被爱而抛弃自己，不再为了迎合他人而自我矮化。我把自己曾经四处追寻的爱，全心全意地给予自己。我对自己温柔低语，耐心相待，报以慈悲。我全然配得自己的深情与珍视。我不再等待变成某个完美模样才去爱自己，此分此刻，我深深爱着现在的我。'
  },
  {
    id: 'audio-06-boundaries-freedom',
    filename: 'track_06_boundaries_freedom.wav',
    url: '/audio/track_06_boundaries_freedom.wav',
    title: '06. 边界自由 (纯净原声)',
    titleZh: '06. 建立边界与无需讨好',
    titleEn: '06. Boundaries and Freedom',
    frequencyBadge: '🎙️ 纯净原声',
    category: 'lifestyle',
    summary: '100% 纯净高保真原声录音。无需向他人表演或强行有用，清晰建立界限，纯粹做自己即是圆满。',
    transcript: "I don't have to earn love. I don't have to be useful to deserve to be here. I don't have to make everyone happy. I don't have to be everything for everyone. I am allowed to have boundaries. I am allowed to say no. I am allowed to choose what feels right for me. The right people don't require me to abandon myself. I can be loved without performing. I can be seen without pretending. I can simply be me, and that is enough.",
    transcriptZh: '我无需去赢取爱，无需证明自己有用才配立足于世。我无需让每个人都满意，无需成为所有人的依靠。我被允许拥有清晰的边界，被允许说“不”，被允许选择令我感到舒适的一切。对的人从不需要我牺牲真实的自己。无需表演我亦被深爱，无需伪装我亦被看见。我只需纯粹地做我自己，这就已足够。'
  }
];
