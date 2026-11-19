import { ArrowRight, BookOpen, Compass, Heart, Sparkles, Wind } from 'lucide-react';
import EditorialImage from '../EditorialImage';
import AffirmationCard from '../AffirmationCard';
import homeHeroImg from '../../assets/images/home_sanctuary_light_1794884028469.jpg';
import templeHallImg from '../../assets/images/temple_modern_hall_1794884029399.jpg';

export type PrimaryViewId = 'home' | 'wisdom' | 'temple' | 'stillness' | 'manifestation' | 'myspace';

interface HomePageProps {
  language: 'zh' | 'en';
  onNavigate: (view: PrimaryViewId) => void;
  onEnterStillness: () => void;
  onSpeak: (text: string) => Promise<void>;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

export default function HomePage({
  language,
  onNavigate,
  onEnterStillness,
  onSpeak,
  isSpeaking,
  onStopSpeaking,
}: HomePageProps) {
  const isEn = language === 'en';

  const coreExperiences: {
    index: string;
    id: string;
    title: string;
    subtitle: string;
    desc: string;
    targetView: PrimaryViewId;
    cta: string;
  }[] = [
    {
      index: '01',
      id: 'home-portal-learning',
      title: isEn ? 'Learning' : '学习 · Learning',
      subtitle: isEn ? 'Wisdom & Chapters' : '认知沉淀与阅读',
      desc: isEn
        ? 'Read core chapters of 《Abundance》, annotate insights, and explore mindful reframing.'
        : '阅读《丰盛》八章节核心要义，记录阅读笔记并梳理清晰认知。',
      targetView: 'wisdom',
      cta: isEn ? 'Open Wisdom' : '进入智慧空间',
    },
    {
      index: '02',
      id: 'home-portal-awareness',
      title: isEn ? 'Awareness' : '觉察 · Awareness',
      subtitle: isEn ? 'Observation & Notes' : '观照情绪与当下状态',
      desc: isEn
        ? 'Practice mindset alchemy, grounding cues, and quiet personal reflections in one space.'
        : '借助转念练习、一分钟身体着陆与个人记录，温和观察当下内在状态。',
      targetView: 'myspace',
      cta: isEn ? 'Open My Space' : '查看我的空间',
    },
    {
      index: '03',
      id: 'home-portal-stillness',
      title: isEn ? 'Stillness' : '静心 · Stillness',
      subtitle: isEn ? 'Breath & Soundscapes' : '呼吸节律与声景静坐',
      desc: isEn
        ? 'Settle into 5, 10, or 15 minute stillness sessions with SoHum breathwork and curated acoustics.'
        : '通过 5 / 10 / 15 分钟静坐、SoHum 呼吸与自然声景，让注意力回到当下。',
      targetView: 'stillness',
      cta: isEn ? 'Enter Stillness' : '进入静心空间',
    },
    {
      index: '04',
      id: 'home-portal-manifestation',
      title: isEn ? 'Manifestation' : '显化 · Manifestation',
      subtitle: isEn ? 'Intentions & Action' : '愿望、感恩与践行',
      desc: isEn
        ? 'Articulate clear wishes, record gratitude and what to let go, and cultivate grounded action.'
        : '写下清晰的愿望与感官画面，记录感恩与放下，把认知化为温和行动。',
      targetView: 'manifestation',
      cta: isEn ? 'Open Manifestation' : '进入显化空间',
    },
  ];

  const dailyPractices = [
    {
      id: 'practice-read',
      title: isEn ? 'Read a Passage of Wisdom' : '阅读一段智慧内容',
      detail: isEn
        ? 'Open 《Abundance》 chapters or daily quotes to clarify thought.'
        : '打开《丰盛》章节或每日语录，沉淀今日认知与阅读笔记。',
      actionLabel: isEn ? 'Go to Wisdom' : '前往智慧',
      icon: BookOpen,
      onClick: () => onNavigate('wisdom'),
    },
    {
      id: 'practice-sit',
      title: isEn ? 'Complete a Quiet Sit' : '完成一次呼吸静坐',
      detail: isEn
        ? 'Choose 5, 10, or 15 minutes with calm breath pacing and natural audio.'
        : '选择 5、10 或 15 分钟静坐时长，跟随呼吸光环安住当下。',
      actionLabel: isEn ? 'Begin Session' : '前往静心',
      icon: Wind,
      onClick: () => onNavigate('stillness'),
    },
    {
      id: 'practice-gratitude',
      title: isEn ? 'Record Gratitude & Intention' : '记录一件感恩或心愿',
      detail: isEn
        ? 'Write down one genuine moment of gratitude, release, or clear intention.'
        : '在显化或个人空间中，写下此刻的感恩事项或一件想放下的事。',
      actionLabel: isEn ? 'Write Today' : '前往显化',
      icon: Heart,
      onClick: () => onNavigate('manifestation'),
    },
  ];

  return (
    <div className="space-y-12 md:space-y-16 animate-fadeIn" id="home-page">
      {/* A. Brand Hero Visual */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch pt-1">
        <div className="lg:col-span-5 flex flex-col justify-between p-6 md:p-8 amnd-surface text-left space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo-hero.png"
                alt="AMND Manifestation"
                className="w-12 h-12 object-contain shrink-0 select-none"
              />
              <div className="min-w-0">
                <p className="text-xs text-[var(--amnd-text-muted)] tracking-wide">
                  AMND Manifestation
                </p>
                <p className="font-serif text-sm font-semibold text-[var(--amnd-text-primary)] truncate">
                  {isEn ? "Amanda's Digital Sanctuary" : 'Amanda 的学海魔法屋'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--amnd-text-primary)] tracking-tight leading-tight text-balance">
                {isEn ? 'Learn, and Magic Manifests.' : '学习了，魔法会显化。'}
              </h2>
              <p className="text-sm text-[var(--amnd-text-secondary)] leading-relaxed max-w-md">
                {isEn
                  ? 'A space to learn, reflect, find stillness and turn intentions into action.'
                  : '一个连接智慧阅读、精神文化、静心练习与个人记录的现代数字精神生活空间。'}
              </p>
              <p className="text-xs text-[var(--amnd-text-muted)] font-sans">
                {isEn
                  ? 'Learning → Awareness → Stillness → Manifestation'
                  : '学习 → 觉察 → 静心 → 显化'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onEnterStillness}
              id="home-hero-stillness-btn"
              className="px-5 py-3 amnd-btn-primary text-xs sm:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <span>{isEn ? 'Begin Stillness' : '开启静心练习'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('manifestation')}
              id="home-hero-manifest-btn"
              className="px-5 py-3 amnd-btn-secondary text-xs sm:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <span>{isEn ? 'My Intentions' : '进入显化空间'}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 flex">
          <EditorialImage
            src={homeHeroImg}
            alt={isEn ? 'Warm sunlight inside minimalist living sanctuary' : '自然晨光照拂的现代极简精神生活空间'}
            aspectClassName="aspect-[16/10] lg:aspect-auto lg:h-full min-h-[240px]"
            fallbackTitle="AMND Manifestation"
            fallbackSubtitle={isEn ? 'Learning · Awareness · Stillness · Manifestation' : '学习 · 觉察 · 静心 · 显化'}
          />
        </div>
      </section>

      {/* B. Core Experience Entry Grid */}
      <section className="space-y-5" aria-labelledby="home-core-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[var(--amnd-border)] pb-3">
          <div>
            <p className="text-xs text-[var(--amnd-text-muted)]">
              {isEn ? 'Practice Architecture' : '核心体验路径'}
            </p>
            <h3 id="home-core-heading" className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)] mt-0.5">
              {isEn ? 'Four Dimensions of Practice' : '从学习到显化的日常节律'}
            </h3>
          </div>
          <p className="text-xs text-[var(--amnd-text-muted)]">
            {isEn ? 'Learning · Awareness · Stillness · Manifestation' : '循序进入，可持续使用的日常工具'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coreExperiences.map((item) => (
            <button
              key={item.id}
              type="button"
              id={item.id}
              onClick={() => onNavigate(item.targetView)}
              className="p-5 amnd-surface text-left flex flex-col justify-between gap-5 hover:border-[var(--amnd-wood)] transition-colors cursor-pointer group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[var(--amnd-text-muted)] font-mono tabular-nums">
                  <span>{item.index}.</span>
                  <span>{item.subtitle}</span>
                </div>
                <h4 className="font-serif text-lg font-semibold text-[var(--amnd-text-primary)] group-hover:text-[var(--amnd-wood)] transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--amnd-wood)] pt-1">
                <span>{item.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* C. Temple Experience Entrance */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch amnd-surface p-5 md:p-7" id="home-temple-spotlight">
        <div className="lg:col-span-7 flex">
          <EditorialImage
            src={templeHallImg}
            alt={isEn ? 'Yixiu Little Temple modern architectural space illuminated by natural light' : '自然天光与石材构成的一休小庙现代静观空间'}
            aspectClassName="aspect-[16/9] lg:aspect-auto lg:h-full min-h-[220px]"
            fallbackTitle={isEn ? 'Yixiu Little Temple' : '一休小庙'}
            fallbackSubtitle={isEn ? 'A little place to pause and return to yourself.' : '累了，就回来歇一歇。'}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col justify-between text-left space-y-5 py-1 lg:pl-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
              <Compass className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
              <span>{isEn ? 'AMND Manifestation · Sanctuary Space' : 'AMND Manifestation · 精神栖息空间'}</span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--amnd-text-primary)] text-balance">
              {isEn ? 'Yixiu Little Temple' : '一休小庙'}
            </h3>
            <p className="text-sm text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn ? 'A little place to pause and return to yourself.' : '累了，就回来歇一歇。'}
            </p>
            <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'Explore contemporary architectural stillness, respectful Buddha statue curation, quiet contemplation, and intention setting without visual clutter.'
                : '以现代建筑空间与克制光影呈现佛教文化与静观体验。在这里安放祈愿、静坐沉淀，并以平静之心连接文化底蕴。'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('temple')}
              id="home-enter-temple-btn"
              className="w-full sm:w-auto px-6 py-3 amnd-btn-primary text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <span>{isEn ? 'Enter Yixiu Little Temple' : '进入一休小庙'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* D. Daily Wisdom & E. Daily Practice */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--amnd-text-muted)]">
                {isEn ? 'Daily Wisdom' : '今日智慧'}
              </p>
              <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'Today’s Affirmation & Insight' : '每日智慧语录与肯定语'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('wisdom')}
              id="home-goto-wisdom-btn"
              className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap min-h-[40px] px-2"
            >
              <span>{isEn ? 'Explore Wisdom' : '进入智慧空间'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <AffirmationCard
            language={language}
            onSpeak={onSpeak}
            isSpeaking={isSpeaking}
            onStopSpeaking={onStopSpeaking}
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div>
            <p className="text-xs text-[var(--amnd-text-muted)]">
              {isEn ? 'Daily Practice' : '今日实践'}
            </p>
            <h3 className="font-serif text-xl font-semibold text-[var(--amnd-text-primary)]">
              {isEn ? 'Gentle Steps for Today' : '三个温和的今日入口'}
            </h3>
          </div>

          <div className="amnd-surface-stone divide-y divide-[var(--amnd-border)] overflow-hidden">
            {dailyPractices.map((practice) => {
              const Icon = practice.icon;
              return (
                <button
                  key={practice.id}
                  type="button"
                  id={practice.id}
                  onClick={practice.onClick}
                  className="w-full p-5 text-left hover:bg-[var(--amnd-bg-elevated)]/70 transition-colors flex items-start justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] flex items-center justify-center shrink-0 text-[var(--amnd-wood)] mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[var(--amnd-text-primary)] group-hover:text-[var(--amnd-wood)] transition-colors">
                        {practice.title}
                      </p>
                      <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
                        {practice.detail}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--amnd-wood)] inline-flex items-center gap-1 shrink-0 pt-1 whitespace-nowrap">
                    <span>{practice.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-5 amnd-surface text-left space-y-2">
            <div className="flex items-center gap-2 text-xs text-[var(--amnd-text-muted)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
              <span>{isEn ? 'Your Personal Archive' : '个人成长档案'}</span>
            </div>
            <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              {isEn
                ? 'All wishes, reading notes, and personal entries remain safely stored on your device with JSON backup support.'
                : '你的愿望、读书笔记与个人感悟均私密保存于本地设备，可在「我的空间」查看与备份。'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('myspace')}
              className="text-xs font-medium text-[var(--amnd-wood)] hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
            >
              <span>{isEn ? 'Visit My Space' : '前往我的空间'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
