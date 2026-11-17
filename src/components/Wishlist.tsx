import { useState, FormEvent } from 'react';
import { Wish } from '../types';
import { Sparkles, Heart, DollarSign, Sparkle, Briefcase, Sofa, Plus, Trash2, Eye, EyeOff, Edit3, Save, X, ChevronDown, ChevronUp, Trash, Wand2, Radio, Compass } from 'lucide-react';
import AiSensoryChannelingModal from './AiSensoryChannelingModal';
import ManualEditWishModal from './ManualEditWishModal';

interface WishlistProps {
  wishes: Wish[];
  onAddWish: (wish: Omit<Wish, 'id' | 'createdAt' | 'isManifested'>) => void;
  onDeleteWish: (id: string) => void;
  onGenerateDetails: (id: string, mode?: 'overwrite' | 'append', refinePrompt?: string) => Promise<void>;
  onStartSession: (wish: Wish) => void;
  isGeneratingMap: Record<string, boolean>;
  onUpdateWish: (id: string, updatedFields: Partial<Wish>) => void;
  language?: 'zh' | 'en';
}

export default function Wishlist({
  wishes,
  onAddWish,
  onDeleteWish,
  onGenerateDetails,
  onStartSession,
  isGeneratingMap,
  onUpdateWish,
  language = 'zh',
}: WishlistProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<Record<string, 'zh' | 'en'>>({});
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'love' | 'wealth' | 'beauty' | 'career' | 'lifestyle'>('love');
  const [details, setDetails] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [expandedDetailsMap, setExpandedDetailsMap] = useState<Record<string, boolean>>({});
  const [expandedVisualDetailsMap, setExpandedVisualDetailsMap] = useState<Record<string, boolean>>({});

  // Manual Edit Modal states
  const [manualEditWish, setManualEditWish] = useState<Wish | null>(null);

  // AI Sensory Channeling & Auto-Scribe Modal states
  const [channelingModalOpen, setChannelingModalOpen] = useState<boolean>(false);
  const [channelingTarget, setChannelingTarget] = useState<{
    wishId?: string;
    title: string;
    category: 'love' | 'wealth' | 'beauty' | 'career' | 'lifestyle';
    currentText: string;
  } | null>(null);

  // Refinement, direct editing and stacking states
  const [refineInputs, setRefineInputs] = useState<Record<string, string>>({});
  const [isEditingAll, setIsEditingAll] = useState<Record<string, boolean>>({});
  const [editingText, setEditingText] = useState<Record<string, string>>({});
  const [editingTextEn, setEditingTextEn] = useState<Record<string, string>>({});
  const [isRefinementOpen, setIsRefinementOpen] = useState<Record<string, boolean>>({});

  const handleOpenChannelingForNewWish = () => {
    setChannelingTarget({
      title: title || (language === 'en' ? 'My Manifestation Wish' : '我的显化愿望'),
      category: category,
      currentText: details,
    });
    setChannelingModalOpen(true);
  };

  const handleOpenChannelingForWish = (wish: Wish) => {
    setChannelingTarget({
      wishId: wish.id,
      title: wish.title,
      category: wish.category,
      currentText: wish.details || '',
    });
    setChannelingModalOpen(true);
  };

  const handleApplyChanneledDetails = (detailsText: string, visualizationText?: string, visualizationTextEn?: string) => {
    if (channelingTarget?.wishId) {
      onUpdateWish(channelingTarget.wishId, {
        details: detailsText,
        ...(visualizationText ? { visualizationDetails: visualizationText } : {}),
        ...(visualizationTextEn ? { visualizationDetailsEn: visualizationTextEn } : {}),
      });
    } else {
      setDetails(detailsText);
    }
  };

  // Splits text by double newlines and deletes the selected paragraph segment
  const handleDeleteSegment = (wishId: string, indexToDelete: number, lang: 'zh' | 'en') => {
    const targetWish = wishes.find(w => w.id === wishId);
    if (!targetWish) return;

    if (lang === 'zh') {
      const currentText = targetWish.visualizationDetails || '';
      const paragraphs = currentText.split('\n\n').filter(p => p.trim() !== '');
      const updatedParagraphs = paragraphs.filter((_, idx) => idx !== indexToDelete);
      onUpdateWish(wishId, { visualizationDetails: updatedParagraphs.join('\n\n') });
    } else {
      const currentText = targetWish.visualizationDetailsEn || '';
      const paragraphs = currentText.split('\n\n').filter(p => p.trim() !== '');
      const updatedParagraphs = paragraphs.filter((_, idx) => idx !== indexToDelete);
      onUpdateWish(wishId, { visualizationDetailsEn: updatedParagraphs.join('\n\n') });
    }
  };

  const handleStartEditAll = (wishId: string) => {
    const targetWish = wishes.find(w => w.id === wishId);
    if (!targetWish) return;
    setIsEditingAll(prev => ({ ...prev, [wishId]: true }));
    setEditingText(prev => ({ ...prev, [wishId]: targetWish.visualizationDetails || '' }));
    setEditingTextEn(prev => ({ ...prev, [wishId]: targetWish.visualizationDetailsEn || '' }));
  };

  const handleSaveEditAll = (wishId: string) => {
    onUpdateWish(wishId, {
      visualizationDetails: editingText[wishId] || '',
      visualizationDetailsEn: editingTextEn[wishId] || '',
    });
    setIsEditingAll(prev => ({ ...prev, [wishId]: false }));
  };

  const handleCancelEditAll = (wishId: string) => {
    setIsEditingAll(prev => ({ ...prev, [wishId]: false }));
  };

  const categoryIcons = {
    love: <Heart className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />,
    wealth: <DollarSign className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />,
    beauty: <Sparkle className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />,
    career: <Briefcase className="w-3.5 h-3.5 text-[var(--amnd-text-secondary)]" />,
    lifestyle: <Sofa className="w-3.5 h-3.5 text-[var(--amnd-success)]" />,
  };

  const categoryLabels = {
    love: language === 'en' ? 'Love & Harmony' : '浪漫情缘',
    wealth: language === 'en' ? 'Abundance & Wealth' : '丰盛财富',
    beauty: language === 'en' ? 'Beauty & Glow' : '健康焕颜',
    career: language === 'en' ? 'Graceful Career' : '优雅事业',
    lifestyle: language === 'en' ? 'Royal Lifestyle' : '理想生活',
  };

  // High-vibration preset templates for structural guidance
  const MANIFESTATION_TEMPLATES = language === 'en' ? {
    love: [
      { title: "Soulmate Connection", text: "【My Ultimate Manifestation State】\nAttract and nurture a soulmate relationship filled with deep understanding, tenderness, and loyalty.\n\n【Immersive Sensory Imagery】\nWe sit in a living room bathed in golden sunlight, holding warm cups of Darjeeling tea, with a subtle scent of white lilies in the air, smiling at each other.\n\n【My Affirmation of Deservedness】\nI naturally deserve the truest, most unconditional and sacred love in this life." },
      { title: "Elegant Harmony", text: "【My Ultimate Manifestation State】\nMaintain an open, romantic connection where every thought is met with care and appreciation.\n\n【Immersive Sensory Imagery】\nWaking up to a beautiful bouquet of white roses and a delicate breakfast, feeling absolute peace, pampered joy, and deep trust.\n\n【My Affirmation of Deservedness】\nI am a precious soul worthy of the world's finest care. I radiate noble, attracting magnetism." }
    ],
    wealth: [
      { title: "Flowing Abundance", text: "【My Ultimate Manifestation State】\nMoney and infinite abundance flow easily and unimpeded into my life.\n\n【Immersive Sensory Imagery】\nResting on a soft velvet chaise lounge, watching account balances steadily grow, feeling complete relaxation and financial freedom.\n\n【My Affirmation of Deservedness】\nWealth flows to me in the most effortless and honorable ways. I am always in harmony with the cosmos." },
      { title: "Lakeside Villa", text: "【My Ultimate Manifestation State】\nOwn a refined, tranquil garden estate overlooking a serene lake.\n\n【Immersive Sensory Imagery】\nWalking barefoot on warm plush rugs, watching sunlight scatter rainbows through a crystal chandelier, listening to soft piano notes.\n\n【My Affirmation of Deservedness】\nI fully deserve to live a life of comfort, elegance, and pristine leisure." }
    ],
    beauty: [
      { title: "Radiant Health", text: "【My Ultimate Manifestation State】\nRadiate flawless health, glowing skin, bright eyes, and a light, energized body.\n\n【Immersive Sensory Imagery】\nStanding before a carved baroque mirror, seeing a rosy, clear, collagen-rich reflection that glows with vibrant energy.\n\n【My Affirmation of Deservedness】\nMy body naturally renews its sacred beauty and vitality every day. I am a masterpiece." },
      { title: "Graceful Poise", text: "【My Ultimate Manifestation State】\nEmbody effortless posture and an elegant aura that inspires confidence.\n\n【Immersive Sensory Imagery】\nWearing a cream silk dress, walking confidently under soft warm lights, skin looking radiant, moving with timeless grace.\n\n【My Affirmation of Deservedness】\nI hold the deepest reverence for my own life. My beauty and confidence are natural birthrights." }
    ],
    career: [
      { title: "Joyful Success", text: "【My Ultimate Manifestation State】\nCreate amazing impact in my chosen field, completely free of anxiety or burnout.\n\n【Immersive Sensory Imagery】\nSitting at a clean, solid wood desk, reviewing inspired collaboration proposals, feeling deeply respected and supported.\n\n【My Affirmation of Deservedness】\nI achieve remarkable things in the most comfortable, self-assured way. My career nourishes my soul." },
      { title: "Aesthetic Brand", text: "【My Ultimate Manifestation State】\nSuccessfully run a premium aesthetic brand that brings artistic value and absolute financial freedom.\n\n【Immersive Sensory Imagery】\nInside a beautifully scented private gallery, welcoming guests who deeply admire our work, turning pure ideas into reality.\n\n【My Affirmation of Deservedness】\nI am a channel for infinite creative power. The universe supports all my dreams and decisions." }
    ],
    lifestyle: [
      { title: "Chateau Tea Party", text: "【My Ultimate Manifestation State】\nLive a peaceful, luxurious life filled with quiet afternoons and beautiful tea gatherings.\n\n【Immersive Sensory Imagery】\nA breeze sweeps in from a crystal-blue lake outside the castle balcony. Pouring fine tea from a silver pot, enjoying flowers in bloom.\n\n【My Affirmation of Deservedness】\nI don't need to struggle or rush. My life is naturally built on ease, dignity, and gentle beauty." },
      { title: "Nourished by Nature", text: "【My Ultimate Manifestation State】\nLive a life fully cherished and nurtured by nature and the cosmos.\n\n【Immersive Sensory Imagery】\nLooking up at a starry sky from an outdoor bath, breathing the scent of wild lilies and orange blossoms, feeling pure water on skin.\n\n【My Affirmation of Deservedness】\nThe universe is always arranging things perfectly for me. I welcome the magic of life." }
    ]
  } : {
    love: [
      { title: "灵魂契合相拥", text: "【我期望显化的终极状态】\n吸引并拥有一位灵魂契合、极尽温柔专一的伴侣。\n\n【令我身临其境的感官画面】\n我们坐在洒满金色阳光的起居室，手捧暖热的红茶，空气里浮动着淡淡的栀子花香，彼此温暖对视。\n\n【我的高配得感誓言】\n我天生配得享有这世间最真挚、无条件且神圣的宠溺与爱护。" },
      { title: "浪漫包容关系", text: "【我期望显化的终极状态】\n拥有一段充满包容与浪漫的宿命情缘，事事有回应。\n\n【令我身临其境的感官画面】\n清晨醒来收到精美的白色玫瑰花束与贴心早餐，内心充满全然的宁静、被偏爱的喜悦与信任。\n\n【我的高配得感誓言】\n我是值得被全世界温柔对待的纯真公主，我散发着高贵、温润的吸引磁场。" }
    ],
    wealth: [
      { title: "财富轻松流淌", text: "【我期望显化的终极状态】\n金钱与无限丰盛源源不断、无阻碍地流向我的生命。\n\n【令我身临其境的感官画面】\n半躺在柔软的天鹅绒榻椅上，看着专属信件与理财账户数字每天稳步增长，身心安适舒展。\n\n【我的高配得感誓言】\n金钱以最轻松、最尊贵的方式流向我，我和宇宙财富丰足磁场时刻完美同频。" },
      { title: "考究庄园洋房", text: "【我期望显化的终极状态】\n拥有一栋开满鲜花、考究惬意的专属花园大宅。\n\n【令我身临其境的感官画面】\n赤脚踏在温软的羊绒地毯上，看阳光洒在剔透水晶吊灯上折射出虹光，耳畔飘来轻柔钢琴声。\n\n【我的高配得感誓言】\n我全然配得享有奢华、安闲与至高无上的舒适享受。" }
    ],
    beauty: [
      { title: "神圣无瑕焕颜", text: "【我期望显化的终极状态】\n由内而外散发健康极致的亮白容颜、透亮双眸与轻盈体态。\n\n【令我身临其境的感官画面】\n立在巴洛克雕花等身镜前，看到镜中红润、无瑕、充满胶原蛋白的精致面容，神采奕奕。\n\n【我的高配得感誓言】\n我的身体每天都在自然焕发极致的青春与圣洁美感，我是不可替代的杰作。" },
      { title: "高贵公主体态", text: "【我期望显化的终极状态】\n拥有优雅挺拔的体态与绝妙温润的公主气场。\n\n【令我身临其境的感官画面】\n身穿奶油色丝缎长裙，在柔和的聚光灯下自信前行，皮肤自带细腻柔光，举手投足尽皆瞩目。\n\n【我的高配得感誓言】\n我充满对自我生命的最高崇敬，我的美丽与自信与生俱来，永不磨灭。" }
    ],
    career: [
      { title: "智慧无压事业", text: "【我期望显化的终极状态】\n在热爱的领域创造奇迹，没有半分焦虑与内耗。\n\n【令我身临其境的感官画面】\n优雅地坐在一尘不染的实木办公桌前，批阅富有远见的合作案，受到万众发自内心的尊重。\n\n【我的高配得感誓言】\n我以最舒适、最自信的方式取得骄人成就，工作是滋养我高贵灵魂的圣殿。" },
      { title: "高尚自主品牌", text: "【我期望显化的终极状态】\n轻松建立并运营属于自己的高端美学品牌，财务极致自由。\n\n【令我身临其境的感官画面】\n在充满艺术品香氛的私人展厅内，收获贵宾们由衷的赞叹，将每一个灵感化作闪耀的现实。\n\n【我的高配得感誓言】\n我是无穷创造力的源泉，宇宙完美承载着我的一切梦想与卓越决策。" }
    ],
    lifestyle: [
      { title: "城堡法式茶会", text: "【我期望显化的终极状态】\n过着没有任何世俗喧嚣、闲散尊贵的法式悠长下午茶人生。\n\n【令我身临其境的感官画面】\n古堡阳台外是如蓝宝石透亮的湖泊。微风拂过，手执银茶具，品尝极品大吉岭茶，花香四溢。\n\n【我的高配得感誓言】\n我不必辛勤追赶，我的生活生来便由闲适、尊贵与一切美好温柔筑起。" },
      { title: "宇宙极宠滋养", text: "【我期望显化的终极状态】\n被大自然与宇宙星辰全力宠溺、无条件包容的一生。\n\n【令我身临其境的感官画面】\n在露天温泉中仰望闪耀星空，呼吸间尽是野百合与初绽橙花的芬芳，享受纯粹的水波触感。\n\n【我的高配得感誓言】\n宇宙时时刻刻在温柔为我妥帖安排，我安享每一刻生命的奇迹，万物在爱我。" }
    ]
  };

  const applyTemplate = (tpl: { title: string, text: string }) => {
    setTitle(tpl.title);
    setDetails(tpl.text);
  };

  const insertFramework = () => {
    if (language === 'en') {
      setDetails(
        "【My Ultimate Manifestation State】\n" +
        "（e.g., Attracting a soulmate who truly loves me/轻松收获十万财富...）\n\n" +
        "【Immersive Sensory Imagery】\n" +
        "（Please describe visual, sound, smell, and touch details: e.g. morning sun, aroma of black tea, soft breeze...）\n\n" +
        "【My Affirmation of Deservedness】\n" +
        "（e.g., I am fully worthy of the world's most beautiful and overflowing love and luxury!）"
      );
    } else {
      setDetails(
        "【我期望显化的终极状态】\n" +
        "（举例：吸引到灵魂深处极度偏爱、无条件懂我的伴侣/轻松收获十万财富...）\n\n" +
        "【令我身临其境的感官画面】\n" +
        "（请描述视觉、声场、香气和触感细节：如晨光、大吉岭红茶的清香、温柔风铃...）\n\n" +
        "【我的高配得感宣言】\n" +
        "（举例：我完全配享有世间最温柔、尊贵、无限丰盛的宠爱与至美！）"
      );
    }
  };

  const handleExpandDetails = async () => {
    if (!details.trim()) {
      setExpandError(language === 'en' 
        ? "Please write some wish inspirations or keywords below first (e.g. drinking coffee by the beach, good mood every day)" 
        : "请先在下方输入框中写下您的一些心愿灵感/提示词（例如：在海边喝咖啡，每天都有好心情）");
      setTimeout(() => setExpandError(null), 4000);
      return;
    }

    setIsExpanding(true);
    setExpandError(null);
    try {
      const response = await fetch('/api/wish/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: details,
          category,
          language, // Pass language to API so it returns English if requested!
        }),
      });

      if (!response.ok) {
        throw new Error(language === 'en' ? 'AI expansion failed, please try again' : '智能描绘失败，请稍后重试');
      }

      const data = await response.json();
      if (data.expandedText) {
        setDetails(data.expandedText);
      }
    } catch (err: any) {
      console.error(err);
      setExpandError(err.message || (language === 'en' ? 'AI expansion failed' : '扩写失败，请稍后重试'));
      setTimeout(() => setExpandError(null), 4000);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddWish({
      title,
      category,
      details,
    });

    setTitle('');
    setDetails('');
    setShowAddForm(false);
  };

  return (
    <div className="amnd-surface p-6 md:p-7 space-y-6" id="manifestation-wishlist-module">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--amnd-text-primary)]">
            {language === 'en' ? 'Wish & Intention Journal' : '心愿与显化记录'}
          </h2>
          <p className="text-xs text-[var(--amnd-text-muted)] mt-0.5">
            {language === 'en' ? 'Clarity of Intention · Daily Manifestation Board' : '澄清意图 · 写下具体生动的感官画卷'}
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2 amnd-btn-primary font-sans text-xs font-medium cursor-pointer whitespace-nowrap"
          id="toggle-add-wish-btn"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'en' ? 'New Wish' : '写下新愿望'}</span>
        </button>
      </div>

      {/* Add Wish Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 md:p-6 amnd-surface-stone space-y-4 animate-fadeIn"
          id="add-wish-form"
        >
          <div className="p-3 bg-[var(--amnd-bg-elevated)] rounded-xl border border-[var(--amnd-border)] text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
            {language === 'en' ? (
              <>
                <span className="font-semibold text-[var(--amnd-wood)]">Guide</span>: Manifestation begins with calm presence rather than anxious striving. Pick a template below or click <strong>"Import 3D Framework"</strong> to compose sensory details.
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--amnd-wood)]">觉察提示</span>：显化并非焦虑地“向外抓取”，而是在当下清晰地“安住与体验”。可在下方挑选参考范本，或点击 <strong>“导入三维显化框架”</strong>，用具体的感官、温度与气息描绘场景。
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--amnd-text-primary)] block">
                {language === 'en' ? 'Wish Theme' : '愿望主题'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'en' ? 'e.g., Attract a soulmate companion' : '例如：收获灵魂契合的伴侣 / 平和丰足的生活'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 amnd-input"
                id="wish-title-input"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--amnd-text-primary)] block">
                {language === 'en' ? 'Wish Category' : '愿望分类'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 amnd-input appearance-none"
                id="wish-category-select"
              >
                <option value="love">{language === 'en' ? 'Love & Harmony' : '浪漫情缘 (Love & Harmony)'}</option>
                <option value="wealth">{language === 'en' ? 'Abundance & Wealth' : '丰盛财富 (Abundance & Wealth)'}</option>
                <option value="beauty">{language === 'en' ? 'Beauty & Glow' : '健康焕颜 (Beauty & Glow)'}</option>
                <option value="career">{language === 'en' ? 'Graceful Career' : '优雅事业 (Graceful Career)'}</option>
                <option value="lifestyle">{language === 'en' ? 'Peaceful Lifestyle' : '理想生活 (Peaceful Lifestyle)'}</option>
              </select>
            </div>
          </div>

          {/* Quick High Vibration Seed Templates based on active Category */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[var(--amnd-text-muted)] block">
              {language === 'en' ? 'Reference Templates (Click to fill)' : '参考显化范本（点击一键填入并微调）'}
            </span>
            <div className="flex flex-wrap gap-2">
              {MANIFESTATION_TEMPLATES[category].map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-subtle)] border border-[var(--amnd-border-strong)] text-[var(--amnd-text-primary)] transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <span>{tpl.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Raw Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-medium text-[var(--amnd-text-primary)] block">
                {language === 'en' ? 'Describe Your Intention' : '心愿描绘（越具象真实越好）'}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenChannelingForNewWish}
                  className="text-[11px] font-medium text-[var(--amnd-wood)] hover:text-[var(--amnd-text-primary)] flex items-center gap-1 bg-[var(--amnd-bg-elevated)] hover:bg-[var(--amnd-bg-subtle)] px-2.5 py-1 rounded-lg border border-[var(--amnd-border-strong)] transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3 h-3 text-[var(--amnd-gold)]" />
                  <span>{language === 'en' ? 'AI Sensory Studio' : 'AI 辅助五感工坊'}</span>
                </button>
                <button
                  type="button"
                  onClick={insertFramework}
                  className="text-[11px] font-medium text-[var(--amnd-text-secondary)] hover:text-[var(--amnd-text-primary)] flex items-center gap-1 bg-[var(--amnd-bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--amnd-border)] transition-colors cursor-pointer"
                >
                  <span>{language === 'en' ? 'Import 3D Framework' : '导入三维显化框架'}</span>
                </button>
              </div>
            </div>
            <textarea
              placeholder={language === 'en' ? "Please describe the fine canvas of your heart. It is recommended to include the ultimate state and sensory details..." : "请描述您内心深处的精细画卷。建议包含期望达到的状态，以及声音、光线、气息与心境细节..."}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={6}
              className="w-full text-xs p-3.5 amnd-input resize-none font-sans"
              id="wish-details-textarea"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenChannelingForNewWish}
                  className="text-[11px] font-medium px-3.5 py-1.5 amnd-btn-primary flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{language === 'en' ? 'AI Multi-Sensory Scribe' : 'AI 五感感应与书写'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExpandDetails}
                  disabled={isExpanding}
                  className="text-[11px] font-medium px-3 py-1.5 amnd-btn-secondary flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isExpanding ? (language === 'en' ? 'Expanding...' : '正在扩写细节...') : (language === 'en' ? 'Fast AI Expand' : '智能扩写细节')}</span>
                </button>
              </div>
              <span className="text-[11px] text-[var(--amnd-text-muted)] text-right">
                {language === 'en' ? 'AI can help organize sensory details' : '支持 AI 辅助整理五感与意象'}
              </span>
            </div>
            {expandError && (
              <p className="text-xs text-[var(--amnd-danger)] font-medium mt-1.5 bg-[var(--amnd-danger-soft)] px-3 py-1.5 rounded-xl border border-[var(--amnd-danger)]/20">{expandError}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 amnd-btn-secondary text-xs font-medium cursor-pointer"
              id="cancel-add-wish-btn"
            >
              {language === 'en' ? 'Cancel' : '取消'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 amnd-btn-primary text-xs font-medium cursor-pointer"
              id="submit-wish-btn"
            >
              {language === 'en' ? 'Save Wish' : '存入心愿记录'}
            </button>
          </div>
        </form>
      )}

      {/* Wishes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {wishes.length === 0 ? (
          <div className="col-span-1 md:col-span-2 py-14 text-center bg-[var(--amnd-bg-secondary)]/60 border border-dashed border-[var(--amnd-border-strong)] rounded-2xl">
            <p className="text-sm text-[var(--amnd-text-muted)] font-serif">
              {language === 'en' ? 'Your intention journal is empty. Click New Wish above to begin.' : '尚未写下心愿记录，可点击右上方「写下新愿望」开始。'}
            </p>
          </div>
        ) : (
          wishes.map((wish) => {
            const isGenerating = isGeneratingMap[wish.id] || false;
            const isDetailsExpanded = expandedDetailsMap[wish.id] || false;
            const isVisualDetailsExpanded = expandedVisualDetailsMap[wish.id] || false;
            return (
              <div
                key={wish.id}
                className="p-5 rounded-2xl bg-[var(--amnd-bg-primary)] hover:border-[var(--amnd-border-strong)] border border-[var(--amnd-border)] transition-colors duration-200 relative group flex flex-col justify-between min-h-[240px]"
                id={`wish-card-${wish.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--amnd-text-secondary)]">
                      {categoryIcons[wish.category]}
                      <span>{categoryLabels[wish.category]}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setManualEditWish(wish)}
                        className="p-1.5 rounded-lg hover:bg-[var(--amnd-bg-secondary)] text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] transition-colors cursor-pointer"
                        title={language === 'en' ? "Manually edit and record wish details" : "手动修改与记录心愿细节"}
                        id={`manual-edit-wish-${wish.id}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteWish(wish.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--amnd-danger-soft)] text-[var(--amnd-text-muted)] hover:text-[var(--amnd-danger)] transition-colors cursor-pointer"
                        title={language === 'en' ? "Delete this wish" : "清除此心愿"}
                        id={`delete-wish-${wish.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-serif font-semibold text-base text-[var(--amnd-text-primary)] leading-snug group-hover:text-[var(--amnd-wood)] transition-colors">
                    <span>{wish.title}</span>
                  </h3>

                  <div className="relative mt-2.5">
                    <div className={`text-xs text-[var(--amnd-text-secondary)] leading-relaxed font-sans bg-[var(--amnd-bg-elevated)] p-3 rounded-xl border border-[var(--amnd-border)] transition-all duration-300 overflow-y-auto custom-scrollbar ${isDetailsExpanded ? 'max-h-[250px]' : 'max-h-[85px]'}`}>
                      {wish.details || (language === 'en' ? '（No initial description written yet...）' : '（未写下初始描述，等待补充细节...）')}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      {wish.details && wish.details.length > 80 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedDetailsMap(prev => ({ ...prev, [wish.id]: !isDetailsExpanded }))}
                          className="text-[11px] text-[var(--amnd-wood)] hover:underline font-medium flex items-center gap-0.5 cursor-pointer"
                        >
                          {isDetailsExpanded ? (language === 'en' ? 'Collapse' : '收起描述') : (language === 'en' ? 'Show full description' : '展开全部描述')}
                        </button>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => setManualEditWish(wish)}
                        className="text-[11px] text-[var(--amnd-wood)] hover:underline font-medium flex items-center gap-1 ml-auto cursor-pointer"
                        title={language === 'en' ? 'Edit description' : '手动修改描述'}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{language === 'en' ? 'Edit' : '修改描述'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Details */}
                  {wish.visualizationDetails ? (
                    <div className="mt-3.5 p-3.5 rounded-xl bg-[var(--amnd-bg-secondary)] border border-[var(--amnd-border)]">
                      <div className="flex items-center justify-between gap-1 border-b border-[var(--amnd-border)] pb-2 mb-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--amnd-text-primary)]">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
                          <span>{language === 'en' ? 'Sensory Details' : '感官与觉察细节'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditAll(wish.id)}
                            className="p-1 text-[var(--amnd-wood)] hover:bg-[var(--amnd-bg-elevated)] rounded-md border border-transparent hover:border-[var(--amnd-border)] transition-colors flex items-center gap-1 font-medium cursor-pointer"
                            title={language === 'en' ? 'Directly edit all texts' : '直接修改全部文本'}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span className="text-[10px] hidden sm:inline">{language === 'en' ? 'Edit All' : '修改全部'}</span>
                          </button>
                          
                          <div className="flex items-center gap-0.5 bg-[var(--amnd-bg-elevated)] p-0.5 rounded-lg border border-[var(--amnd-border)]">
                            <button
                              type="button"
                              onClick={() => setSelectedLangs(prev => ({ ...prev, [wish.id]: 'zh' }))}
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                                (selectedLangs[wish.id] || 'zh') === 'zh'
                                  ? 'bg-[var(--amnd-wood-soft)] text-[var(--amnd-text-primary)] font-semibold'
                                  : 'text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)]'
                              }`}
                            >
                              中文
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedLangs(prev => ({ ...prev, [wish.id]: 'en' }))}
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                                selectedLangs[wish.id] === 'en'
                                  ? 'bg-[var(--amnd-wood-soft)] text-[var(--amnd-text-primary)] font-semibold'
                                  : 'text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)]'
                              }`}
                            >
                              EN
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {isEditingAll[wish.id] ? (
                        <div className="space-y-3 p-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--amnd-text-primary)] block">
                              {language === 'en' ? 'Chinese Scenario Content' : '中文场景内容'}
                            </label>
                            <textarea
                              value={editingText[wish.id] || ''}
                              onChange={(e) => setEditingText(prev => ({ ...prev, [wish.id]: e.target.value }))}
                              rows={5}
                              className="w-full text-xs p-2.5 amnd-input"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--amnd-text-primary)] block">
                              {language === 'en' ? 'English Scenario Content' : '英文场景内容'}
                            </label>
                            <textarea
                              value={editingTextEn[wish.id] || ''}
                              onChange={(e) => setEditingTextEn(prev => ({ ...prev, [wish.id]: e.target.value }))}
                              rows={5}
                              className="w-full text-xs p-2.5 amnd-input"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleCancelEditAll(wish.id)}
                              className="px-3 py-1.5 text-[11px] font-medium amnd-btn-secondary cursor-pointer"
                            >
                              {language === 'en' ? 'Cancel' : '取消'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditAll(wish.id)}
                              className="px-3 py-1.5 text-[11px] font-medium amnd-btn-primary flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>{language === 'en' ? 'Save Changes' : '保存修改'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`space-y-2.5 overflow-y-auto custom-scrollbar transition-all duration-300 pr-1 ${isVisualDetailsExpanded ? 'max-h-[350px]' : 'max-h-[140px]'}`}>
                            {((selectedLangs[wish.id] || 'zh') === 'zh' 
                              ? (wish.visualizationDetails || '')
                              : (wish.visualizationDetailsEn || (language === 'en' ? '【Please click Activate Sensory Details below to generate the English scenario with Gemini】' : '【点击下方“极速重绘”即可补充对应英文内容】'))
                            ).split('\n\n').filter(p => p.trim() !== '').map((para, paraIdx) => {
                              const hasHeader = para.startsWith('【') && para.indexOf('】') !== -1;
                              let headerText = '';
                              let bodyText = para;
                              if (hasHeader) {
                                const closeBracket = para.indexOf('】');
                                headerText = para.substring(0, closeBracket + 1);
                                bodyText = para.substring(closeBracket + 1).trim();
                              }

                              return (
                                <div 
                                  key={paraIdx} 
                                  className="relative group/para p-2.5 rounded-lg bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] transition-colors duration-200"
                                >
                                  {/* Hover Delete Button */}
                                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/para:opacity-100 transition-opacity duration-200 flex gap-1 z-10">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSegment(wish.id, paraIdx, selectedLangs[wish.id] || 'zh')}
                                      className="p-1 rounded bg-[var(--amnd-danger-soft)] text-[var(--amnd-danger)] border border-[var(--amnd-danger)]/20 hover:opacity-90 transition-opacity cursor-pointer"
                                      title={language === 'en' ? "Delete this segment" : "删除此段落"}
                                    >
                                      <Trash className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {headerText && (
                                    <div className="text-[11px] font-semibold text-[var(--amnd-wood)] mb-1">
                                      <span>{headerText}</span>
                                    </div>
                                  )}
                                  <p className="text-xs text-[var(--amnd-text-secondary)] leading-relaxed font-sans whitespace-pre-line">
                                    {bodyText}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          {wish.visualizationDetails && (
                            <button
                              type="button"
                              onClick={() => setExpandedVisualDetailsMap(prev => ({ ...prev, [wish.id]: !isVisualDetailsExpanded }))}
                              className="text-[11px] text-[var(--amnd-wood)] hover:underline font-medium mt-2 flex items-center gap-0.5 cursor-pointer"
                            >
                              {isVisualDetailsExpanded ? (language === 'en' ? 'Collapse details' : '收起感官细节') : (language === 'en' ? 'Show all details' : '展开全部感官细节')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3.5 text-center py-3.5 bg-[var(--amnd-bg-secondary)]/50 border border-dashed border-[var(--amnd-border-strong)] rounded-xl">
                      <p className="text-xs text-[var(--amnd-text-muted)]">
                        {language === 'en' ? 'Sensory details not yet added. Click below to generate.' : '感官细节尚未生成，可点击下方按钮激活'}
                      </p>
                    </div>
                  )}

                  {/* Stacking & Multiple Generations Panel */}
                  {wish.visualizationDetails && (
                    <div className="mt-3.5 border-t border-[var(--amnd-border)] pt-3 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => setIsRefinementOpen(prev => ({ ...prev, [wish.id]: !isRefinementOpen[wish.id] }))}
                        className="flex items-center justify-between w-full text-[11px] font-medium text-[var(--amnd-text-primary)] bg-[var(--amnd-bg-secondary)] hover:bg-[var(--amnd-bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--amnd-border)] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Wand2 className="w-3 h-3 text-[var(--amnd-gold)]" />
                          <span>
                            {language === 'en' ? 'Layer & Refine Sensory Details' : '场景多次叠加与微调'}
                          </span>
                        </span>
                        {isRefinementOpen[wish.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isRefinementOpen[wish.id] && (
                        <div className="mt-2 p-3 rounded-xl bg-[var(--amnd-bg-elevated)] border border-[var(--amnd-border)] space-y-2.5">
                          <div className="text-[11px] text-[var(--amnd-text-secondary)] leading-normal">
                            {language === 'en' ? (
                              <>
                                Write additional details below and click <strong>"Stack Append"</strong> to weave them into the end.
                              </>
                            ) : (
                              <>
                                在下方写下希望追加的感官细节（如“微风拂过窗帘、桌上温热的清茶”），点击<strong>“叠加生成”</strong>拼接到现有场景末尾。
                              </>
                            )}
                          </div>

                          <textarea
                            placeholder={language === 'en' ? "(Optional) Describe additional feelings or elements..." : "（选填）写下希望追加的心境或感官意象..."}
                            value={refineInputs[wish.id] || ''}
                            onChange={(e) => setRefineInputs(prev => ({ ...prev, [wish.id]: e.target.value }))}
                            rows={2}
                            className="w-full text-xs p-2.5 amnd-input resize-none font-sans"
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onGenerateDetails(wish.id, 'overwrite', refineInputs[wish.id]);
                                setRefineInputs(prev => ({ ...prev, [wish.id]: '' }));
                              }}
                              disabled={isGenerating}
                              className="px-3 py-1.5 text-[11px] font-medium amnd-btn-secondary cursor-pointer disabled:opacity-50"
                            >
                              <span>{language === 'en' ? 'Overwrite Generate' : '覆盖生成'}</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                onGenerateDetails(wish.id, 'append', refineInputs[wish.id]);
                                setRefineInputs(prev => ({ ...prev, [wish.id]: '' }));
                              }}
                              disabled={isGenerating}
                              className="px-3 py-1.5 text-[11px] font-medium amnd-btn-primary cursor-pointer disabled:opacity-50"
                            >
                              <span>{language === 'en' ? 'Stack Append' : '叠加生成'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3.5 border-t border-[var(--amnd-border)] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setManualEditWish(wish)}
                      className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[var(--amnd-border-strong)] bg-[var(--amnd-bg-elevated)] text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-bg-secondary)] transition-colors flex items-center gap-1 cursor-pointer"
                      title={language === 'en' ? 'Manually edit and record all details' : '手动输入、修改并记录心愿细节'}
                    >
                      <Edit3 className="w-3 h-3 text-[var(--amnd-wood)]" />
                      <span>{language === 'en' ? 'Manual Edit' : '手动修改'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenChannelingForWish(wish)}
                      className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[var(--amnd-gold)]/35 bg-[var(--amnd-gold-soft)] text-[var(--amnd-text-primary)] hover:bg-[var(--amnd-gold)]/20 transition-colors flex items-center gap-1 cursor-pointer"
                      title={language === 'en' ? 'AI Sensory Channeling' : 'AI 五感辅助感应'}
                    >
                      <Wand2 className="w-3 h-3 text-[var(--amnd-wood)]" />
                      <span>{language === 'en' ? 'AI Channeling' : 'AI 五感感应'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onGenerateDetails(wish.id, 'overwrite')}
                      disabled={isGenerating}
                      className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[var(--amnd-border-strong)] bg-[var(--amnd-bg-elevated)] text-[var(--amnd-wood)] hover:bg-[var(--amnd-bg-secondary)] transition-colors disabled:opacity-50 cursor-pointer"
                      id={`generate-details-btn-${wish.id}`}
                    >
                      {isGenerating ? (
                        <span className="flex items-center gap-1">
                          <span>{language === 'en' ? 'Generating...' : '生成中...'}</span>
                        </span>
                      ) : wish.visualizationDetails ? (
                        language === 'en' ? 'Regenerate' : '重新生成'
                      ) : (
                        language === 'en' ? 'Fast Activate' : '快速激活细节'
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!wish.visualizationDetails}
                    onClick={() => onStartSession(wish)}
                    className="text-xs font-medium px-4 py-1.5 amnd-btn-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    id={`start-session-btn-${wish.id}`}
                  >
                    {language === 'en' ? 'Enter Stillness' : '进入沉浸冥想'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Edit & Record Wish Details Modal */}
      {manualEditWish && (
        <ManualEditWishModal
          isOpen={Boolean(manualEditWish)}
          onClose={() => setManualEditWish(null)}
          wish={manualEditWish}
          language={language}
          onSave={onUpdateWish}
        />
      )}

      {/* AI Sensory Channeling & Auto-Scribe Modal */}
      {channelingModalOpen && channelingTarget && (
        <AiSensoryChannelingModal
          isOpen={channelingModalOpen}
          onClose={() => {
            setChannelingModalOpen(false);
            setChannelingTarget(null);
          }}
          wishTitle={channelingTarget.title}
          category={channelingTarget.category}
          initialText={channelingTarget.currentText}
          language={language}
          onApplyDetails={handleApplyChanneledDetails}
        />
      )}
    </div>
  );
}
