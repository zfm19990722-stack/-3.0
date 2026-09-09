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
}

export const UPLOADED_AFFIRMATION_AUDIOS: AffirmationAudioTrack[] = [
  {
    id: 'audio-01-allow-receive',
    filename: 'track_01_allow_receive.wav',
    url: '/audio/track_01_allow_receive.wav',
    title: '01. 允许接纳 (I Allow Myself to Receive)',
    titleZh: '01. 允许接纳与丰盛流淌',
    titleEn: '01. I Allow Myself to Receive',
    category: 'lifestyle',
    summary: '放下无谓的挣扎与过度付出，向宇宙的善意与丰盛完全敞开。',
    transcript: "I allow myself to receive. I don't have to give everything before I can receive something. I don't have to struggle before life can be gentle with me. I allow kindness to reach me. I allow love to reach me. I allow abundance to reach me. I let myself be cared for. I let myself be supported. I let myself be surprised by goodness. I don't push it away. I don't question it. I simply breathe and let it in. I am open. I am receptive. I am ready to receive.",
    transcriptZh: '我允许自己接纳。在得到之前，我无需掏空自己去付出。在生命温柔以待之前，我无需历经苦难。我允许善意抵达我，我允许爱意抵达我，我允许丰盛流向我。我让自己被照拂，被支持，被生命的美好所惊喜。我不推开，不怀疑，只是静静呼吸，全然接纳。我敞开，我接纳，我已准备好迎接一切美好。'
  },
  {
    id: 'audio-02-deeply-loved',
    filename: 'track_02_deeply_loved.wav',
    url: '/audio/track_02_deeply_loved.wav',
    title: '02. 深层被爱 (I Am Deeply Loved)',
    titleZh: '02. 深层被爱与天然配得',
    titleEn: '02. I Am Deeply Loved',
    category: 'love',
    summary: '非因外在成就或外貌，仅因你的存在，你已被宇宙深沉深爱。',
    transcript: "I am deeply loved. Not because of what I achieve, not because of what I give, not because of how beautiful I appear. I am loved because I exist. I let love find me. I let love reach me. I let love stay. I no longer question whether I am enough. I am enough in my softness. I am enough in my silence. I am enough in my becoming. Love does not have to be chased. It recognizes me. It feels like home. It feels like peace. I am made of love, and I allow myself to receive it.",
    transcriptZh: '我被深深地爱着。不是因为我的成就，不是因为我的付出，也不是因为我表现得多么美丽。我被爱，仅仅因为我的存在。我让爱找到我，让爱触碰我，让爱留下来。我不再怀疑自己是否足够好。在我的柔软中我已足够，在我的静默中我已足够，在我的蜕变中我已足够。爱无需追逐，它自然认得我。它如同归家，如同宁静。我本就是爱所铸就，我允许自己全然接纳它。'
  },
  {
    id: 'audio-03-not-behind',
    filename: 'track_03_not_behind.wav',
    url: '/audio/track_03_not_behind.wav',
    title: '03. 相信节奏 (I Am Not Behind)',
    titleZh: '03. 信任生命的节奏与花期',
    titleEn: '03. I Am Not Behind',
    category: 'career',
    summary: '无需与他人比较，卸下焦虑与紧绷，信任生命自身的完美时机。',
    transcript: "I am not behind. My life is not late. I don't need to compare my beginning to someone else's middle. I release the pressure to become everything at once. I am allowed to take my time. What is meant for me does not require me to betray myself. I can grow slowly. I can bloom quietly. There is no race. There is only my path. And I trust the timing of my life.",
    transcriptZh: '我没有落后，我的生命从未迟到。我无需用自己的起点去对比他人的中途。我释放掉必须一蹴而就的压力。我被允许慢慢来。真正属于我的一切，绝不需要我背叛真实的自己。我可以缓慢生长，可以静谧绽放。没有竞赛，只有属于我自己的道路。我深深信任我生命的时机与安排。'
  },
  {
    id: 'audio-04-safe-here',
    filename: 'track_04_safe_here.wav',
    url: '/audio/track_04_safe_here.wav',
    title: '04. 身心安全 (I Am Safe Here)',
    titleZh: '04. 身心安全与回归本我',
    titleEn: '04. I Am Safe Here',
    category: 'beauty',
    summary: '在身体与当下中安歇，没有追赶，没有匮乏，被生命全然托起。',
    transcript: "I am safe here. I am safe in my body. I am safe to be exactly who I am. I don't have to rush. I don't have to prove. I don't have to earn my place in this world. I am allowed to soften. I am allowed to rest. I am allowed to receive. Nothing is chasing me. Nothing is missing. I am held by life. I am supported by life. I belong here. I breathe, and I return to myself. I soften, and I remember. I am home within me.",
    transcriptZh: '我在这里很安全。我在自己的身体里感到踏实安宁。做真实的自己是全然安全的。我无需匆忙奔走，无需用力证明，无需在世间争夺立足之地。我被允许柔软下来，被允许安歇，被允许接纳。没有人在追赶我，没有任何事物缺失。我被生命深情托起，被生命全力支持。我属于这里。我深吸一口气，回归内在；我柔软下来，忆起本真：我的内在就是我永恒的家园。'
  },
  {
    id: 'audio-05-choose-myself',
    filename: 'track_05_choose_myself.wav',
    url: '/audio/track_05_choose_myself.wav',
    title: '05. 选择自己 (I Choose Myself)',
    titleZh: '05. 选择爱自己与自我忠诚',
    titleEn: '05. I Choose Myself',
    category: 'love',
    summary: '倾听身体与感受，不再自我委屈讨好，给自己无条件的深情与慈悲。',
    transcript: "I choose myself. Again and again, I choose myself. I listen to my body. I honor my feelings. I trust what I know within. I no longer abandon myself to be loved by someone else. I no longer shrink to make others comfortable. I give myself the love I once searched for everywhere. I speak to myself with tenderness. I hold myself with patience. I meet myself with compassion. I am worthy of my own devotion. I am not waiting to become someone I can finally love. I love myself now.",
    transcriptZh: '我选择我自己。一次又一次，我坚定地选择自己。我倾听身体的声音，尊重内心的感受，信任内在的知晓。我不再为了被爱而抛弃自己，不再为了迎合他人而自我矮化。我把自己曾经四处追寻的爱，全心全意地给予自己。我对自己温柔低语，耐心相待，报以慈悲。我全然配得自己的深情与珍视。我不再等待变成某个完美模样才去爱自己，此分此刻，我深深爱着现在的我。'
  },
  {
    id: 'audio-06-boundaries-freedom',
    filename: 'track_06_boundaries_freedom.wav',
    url: '/audio/track_06_boundaries_freedom.wav',
    title: '06. 边界自由 (Boundaries & Freedom)',
    titleZh: '06. 建立边界与无需讨好',
    titleEn: '06. Boundaries and Freedom',
    category: 'lifestyle',
    summary: '无需向他人表演或强行有用，清晰建立界限，纯粹做自己即是圆满。',
    transcript: "I don't have to earn love. I don't have to be useful to deserve to be here. I don't have to make everyone happy. I don't have to be everything for everyone. I am allowed to have boundaries. I am allowed to say no. I am allowed to choose what feels right for me. The right people don't require me to abandon myself. I can be loved without performing. I can be seen without pretending. I can simply be me, and that is enough.",
    transcriptZh: '我无需去赢取爱，无需证明自己有用才配立足于世。我无需让每个人都满意，无需成为所有人的依靠。我被允许拥有清晰的边界，被允许说“不”，被允许选择令我感到舒适的一切。对的人从不需要我牺牲真实的自己。无需表演我亦被深爱，无需伪装我亦被看见。我只需纯粹地做我自己，这就已足够。'
  },
  {
    id: 'audio-07-home-to-my-body',
    filename: 'track_07_home_to_my_body.wav',
    url: '/audio/track_07_home_to_my_body.wav',
    title: '07. 身体归宿 (I Come Home to My Body)',
    titleZh: '07. 身体感恩与身心和解',
    titleEn: '07. I Come Home to My Body',
    category: 'beauty',
    summary: '停止对抗身体，感恩一路的承载与守护，身体不是项目而是圣殿家园。',
    transcript: "I come home to my body. I stop fighting the way I am. My body has carried me through every version of my life. I thank it. I listen to it. I care for it. I don't need to look different to deserve love. I don't need to be perfect to feel beautiful. I let my body breathe. I let my body soften. I let my body be. There is nothing wrong with me. My body is not a project. My body is my home, and I choose to love my home.",
    transcriptZh: '我回到我的身体家园。我不再与真实的自己对抗。我的身体默默承载了我生命中的每一个阶段。我由衷感谢它，倾听它，悉心照料它。我无需改变样貌才配得被爱，无需完美无瑕才能感受美丽。我让身体舒畅呼吸，让身体松弛柔软，让身体自在存在。我没有任何缺陷，我的身体不是待修正的项目，我的身体是我神圣的家园，我选择深爱我的家。'
  },
  {
    id: 'audio-08-trust-myself',
    filename: 'track_08_trust_myself.wav',
    url: '/audio/track_08_trust_myself.wav',
    title: '08. 信任内在 (I Trust Myself)',
    titleZh: '08. 信任内在声音与直觉',
    titleEn: '08. I Trust Myself',
    category: 'wealth',
    summary: '无需理清所有未知，倾听身体微细指引，每一次向内回归都更加明晰。',
    transcript: "I trust myself. I trust the quiet voice within me. I trust my timing. I trust what my body tells me. I don't need to have everything figured out. I can move softly. I can change my mind. I can begin again. Every version of me deserves compassion. I release the need to be perfect. I release the need to be understood by everyone. I know who I am. And the more I return to myself, the clearer everything becomes. I trust my path. I trust my heart. I trust myself.",
    transcriptZh: '我信任我自己。我信任内在微弱而坚定的声音，信任自己的节奏，信任身体传达的讯息。我不需要把一切都盘算周全，我可以轻柔前行，可以改变心意，可以随时重新开始。每一个时期的我都值得温柔以待。我放下追求完美的执念，放下被所有人理解的渴望。我深知自己是谁。我越是回归内在，眼前的一切就越发澄明。我信任我的道路，信任我的心，我信任我自己。'
  },
  {
    id: 'audio-09-softness-is-power',
    filename: 'track_09_softness_is_power.wav',
    url: '/audio/track_09_softness_is_power.wav',
    title: '09. 柔韧力量 (Softness Is Power)',
    titleZh: '09. 温柔的力量与天生磁场',
    titleEn: '09. Softness Is Power',
    category: 'wealth',
    summary: '柔软非软弱，细腻非负担。无需用力追逐，做真实的自己自成强大磁场。',
    transcript: "I am soft, and I am powerful. I don't need to force. I don't need to chase. I don't need to convince. I simply allow myself to be. My softness is not weakness. My sensitivity is not a burden. My presence is enough. I move through life with grace. I attract what feels aligned. I welcome what feels nourishing. I release what no longer belongs to me. I am radiant without trying. The more I love myself, the more beautiful my life becomes. I don't become magnetic by becoming someone else. I become magnetic by fully becoming myself.",
    transcriptZh: '我既柔软，又充满力量。我无需强求，无需追赶，无需说服任何人。我只需允许自己自然存在。我的柔软不是软弱，我的敏感不是负担，我的存在本身就已足够。我优雅地穿行于生命之中，自然吸引同频的美好，欣然接纳滋养我的万物，坦然释怀不再属于我的一切。无需费力我自绽放光芒。我越是深爱自己，生命就越发瑰丽。我无需成为他人来获得吸引力，当我全然成为我自己，我就是最强大的丰盛磁场。'
  },
  {
    id: 'audio-10-unconditional-worth',
    filename: 'track_10_unconditional_worth.wav',
    url: '/audio/track_10_unconditional_worth.wav',
    title: '10. 纯粹配得 (Unconditional Worth)',
    titleZh: '10. 纯粹配得感与完整自足',
    titleEn: '10. Unconditional Worth',
    category: 'lifestyle',
    summary: '无需为配得感设立条件，无需表演伪装，本自具足，全然圆满。',
    transcript: "I don't have to earn love. I don't have to be useful to deserve to be here. I don't have to make everyone happy. I don't have to be everything for everyone. I am allowed to have boundaries. I am allowed to say no. I am allowed to choose what feels right for me. The right people don't require me to abandon myself. I can be loved without performing. I can be seen without pretending. I am worthy, whole, and complete exactly as I am.",
    transcriptZh: '我无需换取爱意，无需表现有用才配拥有这一刻。我无需迎合所有人，无需承担他人的全部期待。我有权设立界限，有权拒绝，有权选择真正滋养我的选择。对的人不会要求我牺牲真实的自己。无需表演亦能收获挚爱，无需面具亦能被真正看见。如我本然，我本自具足、完整而神圣。'
  }
];
