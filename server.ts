import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini SDK initialized successfully on server-side.");
  } else {
    console.warn("Warning: GEMINI_API_KEY environment variable is not defined.");
  }

  // Safe wrapper for Gemini API calls with automatic retry/exponential backoff for transient 503 and 429 errors
  async function safeGenerateContent(modelName: string, params: { contents: any; config?: any }, retriesLeft = 2, delayMs = 500): Promise<any> {
    if (!ai) throw new Error("GoogleGenAI instance not initialized");
    try {
      return await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config
      });
    } catch (err: any) {
      const errMsg = String(err.message || err);
      const isQuotaExceeded = errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exceeded");
      if (isQuotaExceeded) {
        // Hard quota exceeded error (e.g. 20 requests per day limit on free tier).
        // Let's immediately throw without wasting retries.
        throw err;
      }

      const is503 = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("demand");
      const is429 = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("rate limit");
      
      if ((is503 || is429) && retriesLeft > 0) {
        console.warn(`[Gemini API Warning] Model ${modelName} returned temporary error: ${errMsg}. Retrying in ${delayMs}ms... (Retries left: ${retriesLeft})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return safeGenerateContent(modelName, params, retriesLeft - 1, delayMs * 2);
      }
      throw err;
    }
  }

  // 1. Generate detailed luxurious manifestation scenario and affirmation sentences
  app.post("/api/affirmations/generate", async (req, res) => {
    try {
      const { title, details, category, mode, existingDetails, existingDetailsEn, refinePrompt } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Wish title is required." });
      }

      if (!ai) {
        // Mock a wonderful offline response if key is missing
        const offlineScenarios: Record<string, any> = {
          love: {
            visualizationText: "【追加视觉景象】\n温暖的日光穿透层叠的奶油色镂空窗帘。我看见案前新换上了一束带有晨露的白玫瑰，香气扑鼻。\n\n【追加声场与气息】\n耳畔有小鸟在枝头温柔地啼鸣，空气里弥漫着淡淡的白玫瑰与温热香草精油的奢华芬芳。\n\n【追加身心能量】\n我轻抚着触感细腻的纯白餐巾，浑身充满着被宇宙深爱与周全保护的绝对配得感，无比放松。",
            visualizationTextEn: "【Additional Visual Scene】\nWarm solar rays filter through layered cream lace drapes. I see a fresh bouquet of morning-dew white roses newly set upon the table, dispersing sweet light.\n\n【Additional Acoustics & Aroma】\nGentle birds chirp tenderly on high branches as the air holds the luxury fragrance of fresh roses and warm vanilla essences.\n\n【Additional Body & Mind Energy】\nTouching the fine linen napkin, I feel completely immersed in the safe, protective, and loving field of the universe with profound worthiness.",
            affirmations: ["我感到极大的安全与温暖", "我的能量与宇宙的至美频率完全交融", "每一刻都是大自然对我的极致款待"]
          },
          wealth: {
            visualizationText: "【追加视觉景象】\n庄园书房里闪烁着红木的温润色泽。壁炉里炉火跳动，温暖的火光映照在考究的烫金皮质账簿上。\n\n【追加声场与气息】\n壁炉中木柴燃烧发出轻微舒适的噼啪声，空气中弥漫着沉香木与温暖琥珀的尊贵气息。\n\n【追加身心能量】\n我的身心舒展极了，宇宙所有的资粮、灵感和金钱正在从四面八方轻松无碍地汇入我的生命，我是无尽的磁铁。",
            visualizationTextEn: "【Additional Visual Scene】\nThe mahogany shelves in my private study gleam warmly under the dancing flames from the fireplace, lighting up elegant leather journals.\n\n【Additional Acoustics & Aroma】\nThe gentle, soothing crackle of pine logs harmonizes with a comforting, noble fragrance of rich agarwood and warm amber.\n\n【Additional Body & Mind Energy】\nMy physical form feels entirely relaxed. Cosmic provisions and financial abundance flow effortlessly to me from every corner of the world.",
            affirmations: ["财富正如潮水般向我涌来", "我天然地被宇宙富足的一切完美包裹", "金钱以极高雅舒适的形式源源不断地融入我的生活"]
          },
          beauty: {
            visualizationText: "【追加视觉景象】\n精巧的水晶盛器盛装着晨曦采摘的花瓣。水波在巴洛克雕花洗漱台前泛着清亮剔透的柔光。\n\n【追加声场与气息】\n空气中流淌着刚拆封的初绽百合与极度解压的雨后森林香，耳边有圣洁空灵的水晶罄音，洗涤一切紧绷。\n\n【追加身心能量】\n水珠在肌肤上滑过，带走最后一丝疲惫。我的身体细胞都在喜悦欢呼，我本就拥有极致的圣洁与晶莹美感。",
            visualizationTextEn: "【Additional Visual Scene】\nDelicate crystal basins hold fresh petals picked at dawn. Transparent water shimmers with crystalline light inside the hand-carved washstand.\n\n【Additional Acoustics & Aroma】\nThe pure scent of fresh lilies and relaxing rain-forest mist drifts gracefully, backed by the sacred sound of crystal bowls.\n\n【Additional Body & Mind Energy】\nEach drop of water on my skin rinses away stress. Every cell rejoices, returning to its innate divine brilliance and youth.",
            affirmations: ["我的容颜时刻散发着水润、无瑕的高贵光泽", "我深深爱着并接纳我纯净美丽的身体", "神圣的青春能量在我身体中完美流淌"]
          },
          career: {
            visualizationText: "【追加视觉景象】\n宽阔明亮的露台前，一杯新调配的拿铁咖啡正散发着浓郁纯正的奶香。精美的合作案上正盖上神圣尊贵的金色印章。\n\n【追加声场与气息】\n耳畔流淌着舒缓宁静的巴洛克大提琴协奏曲，空气中弥漫着考究而专注的浓郁咖啡香与鼠尾草的清香。\n\n【追加身心能量】\n我思路清晰，笔下生花。我深深知晓，我无需任何无谓的自我证明，我的每一次表达都是智慧之泉的优雅显露。",
            visualizationTextEn: "【Additional Visual Scene】\nOn the spacious terrace, a freshly brewed latte emits a rich, velvety aroma next to prestigious contracts sealed with a elegant gold stamp.\n\n【Additional Acoustics & Aroma】\nThe smooth chimes of a Baroque cello concerto blend with the focusing aroma of roasted beans and cleansing white sage.\n\n【Additional Body & Mind Energy】\nMy thoughts are incredibly clear. I know deeply that I do not need to struggle; my natural presence is a majestic expression of pure wisdom.",
            affirmations: ["我的创作与决策轻而易举，优雅自如", "我所做的一切皆在神圣指引下圆满发生", "我优雅的事业是宇宙丰盛源泉的缩影"]
          },
          lifestyle: {
            visualizationText: "【追加视觉景象】\n落日时分，天空如莫奈的调色盘般，染上了极度温柔的玫瑰粉与暖橘金色。远处精美城堡高塔的轮廓分外柔和。\n\n【追加声场与气息】\n风中传来远处林间古老风琴的悠扬音色，呼吸中都是漫山野蔷薇与湿润松针的静谧之香，醉人至极。\n\n【追加身心能量】\n我全身心地融入到这片梦幻而深沉的静谧中。此时此刻，全宇宙都在为我停驻，我彻底融化在无条件的爱与无限宠爱中。",
            visualizationTextEn: "• 【Additional Visual Scene】\nAt sunset, the sky transforms into Monet's pastel palette with warm rose and glowing peach gold, framing the distant castle turrets.\n\n• 【Additional Acoustics & Aroma】\nThe gentle, distant hum of a forest organ carries on the wind, filled with the aroma of wild berries and damp pine needles.\n\n• 【Additional Body & Mind Energy】\nI merge into this vast, celestial silence. The entire universe is holding its breath for me, wrapping me in absolute, unconditional love.",
            affirmations: ["落日与微风都是宇宙送给我的极致浪漫", "我的生活充满了不可思议 of 宁静、富裕与温柔", "我完全活在奇迹之中，万物都在宠爱着我"]
          }
        };

        const fallback = offlineScenarios[category] || offlineScenarios.lifestyle;
        if (mode === "append" && existingDetails) {
          return res.json({
            visualizationText: `【追加视觉景象】\n${fallback.visualizationText.replace(/【追加视觉景象】\n|【追加声场与气息】\n|【追加身心能量】\n/g, "")}`,
            visualizationTextEn: fallback.visualizationTextEn,
            affirmations: fallback.affirmations,
            isOffline: true
          });
        }

        return res.json({
          visualizationText: `【离线预览模式 - 请配置 API 密钥以体验 Gemini 专属定制细节】\n\n${fallback.visualizationText}`,
          visualizationTextEn: fallback.visualizationTextEn,
          affirmations: fallback.affirmations,
          isOffline: true
        });
      }

      const categoryMap: Record<string, string> = {
        love: "浪漫情缘（深层灵魂伴侣、被全心全意呵护、甜蜜和谐）",
        wealth: "丰盛财富（金钱轻松涌入、奢华闲适的生活、物质极其丰足）",
        beauty: "健康焕颜（容光焕发、优雅体态、由内而外的神圣自信）",
        career: "优雅事业（充满智慧的无压力决策、才华备受尊重、轻松取得卓越成就）",
        lifestyle: "理想生活（奢华安逸、充满花香与温暖、每天都被宇宙温柔宠爱）"
      };

      let prompt = "";
      if (mode === "append" && existingDetails) {
        prompt = `你是一位专门引导人们进行潜意识显化（Manifestation）的心理学导师与灵性美学专家。
用户当前已经有一个关于愿望 "${title}" 的显化场景：
现有中文场景：
"${existingDetails}"

现有英文场景：
"${existingDetailsEn || ""}"

现在，用户希望在此场景上**进行多次生成和叠加，从而丰富和完善这个显化场景**。
他们补充指定的追加细节/意图/感官灵感是："${refinePrompt || "在原有场景的基础上，增加一些更深入、充满诗意且极度舒适安祥的细节描述"}"

请为用户专属定制一个**全新的、互补的显化场景段落**，用来与现有场景进行完美叠加。该段落需要完全延续原本“公主风、舒适、奢华、惬意、高贵”的氛围。
请注意以下写作要点：
1. 【中文可视化场景描写】 (visualizationText)：
   - 必须使用第一人称「我」来写，作为对前一个场景的后续和补充。
   - 必须采用以下三个固定维度，并严格使用 【...】 标签进行分段包装：
     【追加视觉景象】描述额外补充的、优雅奢华的视觉细节。
     【追加声场与气息】描述额外补充的声音、香气、温度等。
     【追加身心能量】描述身体的触觉、内心进一步升华的配得感、彻底的松弛、被宠爱感。
2. 【英文可视化场景描写】 (visualizationTextEn)：
   - 它是中文追加版的完美英文翻译与润色，用词极其优雅高端、充满诗意（e.g. sanctuary, whisper, divine, radiant）。
   - 必须采用以下三个英文标签进行分段包装，代表追加的三维细节：
     【Additional Visual Scene】
     【Additional Acoustics & Aroma】
     【Additional Body & Mind Energy】
3. 【3句正向暗示肯定句】 (affirmations)：
   - 简短具有音乐般的美感，以“我”字开头，提供3句全新的、与补充场景高度契合的潜意识暗示。

必须严格返回 JSON 格式，包含以下字段（不需要任何 markdown wrap，只返回合法的 JSON 对象）：
{
  "visualizationText": "【追加视觉景象】\\n...\\n【追加声场与气息】\\n...\\n【追加身心能量】\\n...",
  "visualizationTextEn": "【Additional Visual Scene】\\n...\\n【Additional Acoustics & Aroma】\\n...\\n【Additional Body & Mind Energy】\\n...",
  "affirmations": ["新肯定句1", "新肯定句2", "新肯定句3"]
}`;
      } else {
        prompt = `你是一位专门引导人们进行潜意识显化（Manifestation）的心理学导师与灵性美学专家。
用户写下了一个愿望：
主题: "${title}"
分类: "${categoryMap[category] || category}"
细节描述: "${details || "渴望实现最美满的显化状态"}"

请为用户专属定制一个充满“公主风、舒适、奢华、惬意、高贵”氛围的【中文版显化可视化场景描写】、【高雅唯美的英文版显化场景描写】和【3句中文潜意识肯定暗示句】。

请注意以下写作要点：
1. 【中文可视化场景描写】 (visualizationText)：
   - 必须使用第一人称「我」来写，让用户一瞬间身临其境。
   - 必须采用以下三个固定维度，并严格使用 【...】 标签进行分段包装：
     【视觉景象】描述周围奢华、优雅 of 公主风视觉细节。
     【声场与气息】描述周围的声音和香气细节。
     【身心能量】描述身体的触觉和内心的配得感与彻底的松弛富足。
2. 【英文可视化场景描写】 (visualizationTextEn)：
   - 它是中文版的完美英文翻译与润色，用词极其优雅高端、充满诗意（e.g. sanctuary, whisper, divine, radiant）。
   - 必须采用以下三个英文标签进行分段包装，代表三维细节：
     【Visual Scene】
     【Acoustics & Aroma】
     【Body & Mind Energy】
3. 【3句正向暗示肯定句】 (affirmations)：
   - 简短富有旋律美，以“我”字开头，灌注强大的显化磁场。

必须严格返回 JSON 格式，包含以下字段（不需要任何 markdown wrap，只返回合法的 JSON 对象）：
{
  "visualizationText": "【视觉景象】\\n...\\n【声场与气息】\\n...\\n【身心能量】\\n...",
  "visualizationTextEn": "【Visual Scene】\\n...\\n【Acoustics & Aroma】\\n...\\n【Body & Mind Energy】\\n...",
  "affirmations": ["肯定句1", "肯定句2", "肯定句3"]
}`;
      }

      // Robust helper to clean and parse JSON from API response
      const cleanAndParseJson = (text: string) => {
        let cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
          cleaned = cleaned.substring(0, cleaned.length - 3);
        }
        cleaned = cleaned.trim();
        return JSON.parse(cleaned);
      };

      const extractAndParseJson = (text: string) => {
        const cleaned = text.trim();
        try {
          return cleanAndParseJson(cleaned);
        } catch (err) {
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const candidate = cleaned.substring(firstBrace, lastBrace + 1);
            try {
              return cleanAndParseJson(candidate);
            } catch (innerErr) {
              throw new Error(`Failed to parse JSON. Response was: ${text}`);
            }
          }
          throw err;
        }
      };

      let responseText = "";
      let lastError: any = null;

      // Attempt 1: Try gemini-3.1-flash-lite with strict responseSchema first (extremely cost-effective and has separate higher quota)
      try {
        const response = await safeGenerateContent("gemini-3.1-flash-lite", {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                visualizationText: {
                  type: Type.STRING,
                  description: "以第一人称描绘的具有三维结构（视觉景象、声场与气息、身心能量）的公主风奢华显化可视化场景中文文本"
                },
                visualizationTextEn: {
                  type: Type.STRING,
                  description: "English luxury manifestation visualization text matching the exact three-dimensional structure (Visual Scene, Acoustics & Aroma, Body & Mind Energy) with ultimate literary beauty"
                },
                affirmations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3句正向暗示肯定句"
                }
              },
              required: ["visualizationText", "visualizationTextEn", "affirmations"]
            }
          }
        });
        if (response && response.text) {
          responseText = response.text;
        }
      } catch (err1: any) {
        console.warn("Attempt 1 with gemini-3.1-flash-lite failed:", err1.message || err1);
        lastError = err1;
      }

      // Attempt 2: Try gemini-3.5-flash with strict responseSchema as second fallback
      if (!responseText) {
        try {
          const response = await safeGenerateContent("gemini-3.5-flash", {
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  visualizationText: {
                    type: Type.STRING,
                    description: "以第一人称描绘的具有三维结构（视觉景象、声场与气息、身心能量）的公主风奢华显化可视化场景中文文本"
                  },
                  visualizationTextEn: {
                    type: Type.STRING,
                    description: "English luxury manifestation visualization text matching the exact three-dimensional structure (Visual Scene, Acoustics & Aroma, Body & Mind Energy) with ultimate literary beauty"
                  },
                  affirmations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3句正向暗示肯定句"
                  }
                },
                required: ["visualizationText", "visualizationTextEn", "affirmations"]
              }
            }
          });
          if (response && response.text) {
            responseText = response.text;
          }
        } catch (err2: any) {
          console.warn("Attempt 2 with gemini-3.5-flash failed:", err2.message || err2);
          lastError = err2;
        }
      }

      // Attempt 3: Try gemini-3.1-flash-lite with plain-text JSON response (relaxed schema)
      if (!responseText) {
        try {
          const response = await safeGenerateContent("gemini-3.1-flash-lite", {
            contents: prompt + "\n\nCRITICAL: You must return a valid JSON object matching the requested fields structure. Do not return any additional explanations or markdown boxes.",
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response && response.text) {
            responseText = response.text;
          }
        } catch (err3: any) {
          console.error("Attempt 3 with gemini-3.1-flash-lite failed:", err3.message || err3);
          lastError = err3;
        }
      }

      if (!responseText) {
        throw new Error(lastError ? `Gemini API Error: ${lastError.message || lastError}` : "No response received from any model attempts.");
      }

      const result = extractAndParseJson(responseText);
      res.json(result);

    } catch (error: any) {
      console.error("Generate Affirmations Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate custom manifestation." });
    }
  });

  // 1.5 Expand brief user keywords into a beautiful detailed manifestation script
  app.post("/api/wish/expand", async (req, res) => {
    try {
      const { text, category } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Brief cue words/prompts are required." });
      }

      const categoryMap: Record<string, string> = {
        love: "浪漫情缘",
        wealth: "丰盛财富",
        beauty: "健康焕颜",
        career: "优雅事业",
        lifestyle: "理想生活"
      };

      if (!ai) {
        // High quality offline expander
        const catName = categoryMap[category] || "优雅愿望";
        const expandedText = `【我期望显化的终极状态】\n在我的「${catName}」愿望中，我全然拥有了：${text}。\n\n【令我身临其境的感官画面】\n在一个充满暖光与雅致芬芳的午后，微风轻拂。我身着极为轻软舒适的奶油色羊绒裙，手执精巧的骨瓷杯。耳畔是若有若无的治愈琴音，空气中弥漫着清新的栀子花香与红茶暖意。我沉浸在这一幕高度安详、被宇宙全然托起并爱着的时刻。\n\n【我的高配得感誓言】\n我本自具足，我天生便值得拥有这世间最温柔、奢华、无条件且神圣的宠爱与无限美好。`;

        return res.json({ expandedText, isOffline: true });
      }

      const prompt = `你是一位专门引导人们进行潜意识显化（Manifestation）的心理学导师与灵性美学专家。
用户提供了他们心愿的简短提示词/灵感线索：
提示词/简短描述: "${text}"
所属类别: "${categoryMap[category] || category}"

请根据这几个提示词，帮用户“扩写/细节化描绘”成一段极具画面感、极具“公主风、舒适、奢华、惬意、高贵”氛围的【三维细节显化描绘】。

请严格采用以下格式进行输出，字句要极其优雅、唯美、令人心旷神怡（第一人称「我」口吻）：

【我期望显化的终极状态】
（根据用户提示词，描绘最丰盛、圆满、无后顾之忧的终极状态）

【令我身临其境的感官画面】
（描绘周围的视觉景象如晨光、水晶杯；周围的声场与香气如温热红茶香、静谧风铃；以及松弛高贵的细节体验，控制在3句话内，文字极富感染力）

【我的高配得感誓言】
（1句充满高贵感、笃定感、宇宙宠溺感的第一人称潜意识肯定句）

请直接返回该扩写后的纯文本，不需要任何其他的引导词。`;

      let responseText = "";
      let lastError: any = null;

      try {
        const response = await safeGenerateContent("gemini-3.1-flash-lite", {
          contents: prompt,
        });
        if (response && response.text) {
          responseText = response.text;
        }
      } catch (err1: any) {
        console.warn("Attempt 1 with gemini-3.1-flash-lite failed in expand:", err1.message || err1);
        lastError = err1;
      }

      if (!responseText) {
        try {
          const response = await safeGenerateContent("gemini-3.5-flash", {
            contents: prompt,
          });
          if (response && response.text) {
            responseText = response.text;
          }
        } catch (err2: any) {
          console.error("Attempt 2 with gemini-3.5-flash failed in expand:", err2.message || err2);
          lastError = err2;
        }
      }

      if (!responseText) {
        throw new Error(lastError ? `Gemini API Error: ${lastError.message || lastError}` : "No response from Gemini API for expansion.");
      }

      res.json({ expandedText: responseText.trim() });
    } catch (error: any) {
      console.error("Expand Wish Error:", error);
      res.status(500).json({ error: error.message || "Failed to expand wish details." });
    }
  });

  // 1.6 AI Multi-Sensory Intuitive Channeling & Auto-Writing (AI 辅助五感细节感应与自动书写)
  app.post("/api/wish/sense", async (req, res) => {
    try {
      const {
        title,
        category = 'lifestyle',
        currentText = '',
        sensoryDimensions = ['visual', 'acoustic', 'aroma', 'tactile', 'worthiness'],
        vibeTone = 'princess_royal',
        language = 'zh'
      } = req.body;

      const categoryMap: Record<string, string> = {
        love: "浪漫情缘（灵魂伴侣、被无条件深爱与娇宠）",
        wealth: "丰盛财富（财富轻松流淌、资产丰足、金钱磁吸）",
        beauty: "健康焕颜（神圣容光、优雅体态、细胞年轻活力）",
        career: "优雅事业（从容取得卓越成果、才华受敬仰、无压力创造）",
        lifestyle: "理想生活（奢华安宁、花香暖阳、被宇宙极尽宠溺）"
      };

      const toneMap: Record<string, string> = {
        princess_royal: "高贵公主庄园风格（水晶、丝缎、金边骨瓷、玫瑰花香、优雅从容）",
        nature_zen: "大自然静心空灵风格（山林清泉、晨雾、阳光丁达尔效应、微风松针）",
        modern_luxury: "现代轻奢摩登风格（顶层景观大平层、纯白极简、柔和暖光、高定质感）",
        cosmic_ethereal: "高维宇宙光能风格（金粉色星芒、星际安宁、本自具足、神圣同频）"
      };

      if (!ai) {
        // High quality offline fallback for sensory channeling
        const offlineSensoryData: Record<string, any> = {
          visual: "金色温暖的晨曦透过复古拱形窗洒在天鹅绒地毯上，空气中折射出剔透如水晶般柔和的光晕。眼前是一处毫无杂质的至美空间，每一处细节都在诉说着高贵与安宁。",
          acoustic: "耳畔回响着舒缓纯净的自然白噪音与若有若无的大提琴和弦，微风轻拂过窗外的花树，发出极度放松的沙沙轻响，让整个神经系统彻底松弛下来。",
          aroma: "空气中漫溢着初绽大马士革玫瑰与清甜大吉岭红茶的温润气息，伴随着阳光晒暖的淡淡香草芬芳，每一次呼吸都是生命深层的滋养。",
          tactile: "肌肤触碰着极细腻柔软的奶油色羊绒毛毯，指尖传来温热茶杯的踏实暖意。肩颈彻底沉降放松，心轮处升起一团温润充盈的金光。",
          worthiness: "我深深知晓：我不必用力证明，我天生便被宇宙的无尽丰盛与至高慈爱所包裹。我全然配得拥有一切最优雅美好的人事物。"
        };

        const autoNarrativeZh = `【我期望显化的终极状态】\n在「${title || '美好愿望'}」的实相中，我全然拥有了最丰盛、最从容的圆满体验。\n\n【令我身临其境的五感画卷】\n${offlineSensoryData.visual}\n${offlineSensoryData.acoustic}\n${offlineSensoryData.aroma}\n${offlineSensoryData.tactile}\n\n【我的高配得感誓言】\n${offlineSensoryData.worthiness}`;
        const autoNarrativeEn = `【My Ultimate Manifestation State】\nIn the sacred reality of "${title || 'Divine Wish'}", I am living the most effortless, radiant, and fulfilled manifestation.\n\n【Immersive Multi-Sensory Canvas】\nSoft morning sunlight filters through arched windows onto plush velvet carpets, scattering gentle crystal rainbows. Distant soothing strings and a gentle breeze ease every nerve into profound relaxation. The air carries the delicate aroma of fresh roses and warm vanilla tea, while warm cashmere softly cradles my skin.\n\n【Affirmation of Absolute Worthiness】\nI am timelessly worthy. The infinite universe naturally orchestrates everything for my highest joy, dignity, and abundance.`;

        return res.json({
          sensoryChanneling: offlineSensoryData,
          autoWrittenNarrative: autoNarrativeZh,
          autoWrittenNarrativeEn: autoNarrativeEn,
          isOffline: true
        });
      }

      const prompt = `你是一位专门引导人们进行潜意识潜能显化（Manifestation）与高维感官描绘的艺术大师与意识导师。
用户提出了一个愿望：
- 愿望主题: "${title || '我的丰盛显化愿望'}"
- 所属分类: "${categoryMap[category] || category}"
- 已有描述或灵感线索: "${currentText || '希望获得最圆满、舒心、丰盛的终极状态'}"
- 氛围基调: "${toneMap[vibeTone] || toneMap.princess_royal}"
- 需要重点感应的感官维度: ${sensoryDimensions.join(', ')}

请运用高度细腻、富有诗意与极致沉浸感的艺术笔触，为用户进行【AI 五感全息感应与自动书写】。
请以第一人称「我」或最深切的身临其境沉浸口吻进行感应输出。

请严格返回合法的 JSON 格式，结构如下：
{
  "sensoryChanneling": {
    "visual": "（视觉景象感应：细腻描绘光影、色彩、空间陈设、服饰质感、眼前的景致，约50-80字）",
    "acoustic": "（声场律动感应：细腻描绘周围环境的背景声、风声、琴音、鸟鸣、水波或深沉宁静，约40-60字）",
    "aroma": "（香气温度感应：细腻描绘空气中弥漫的花香、茶香、精油、阳光温度与微风触感，约40-60字）",
    "tactile": "（触觉体感感应：细腻描绘身体肌肤触感、放松程度、心轮温热感、呼吸深长与松弛，约40-60字）",
    "worthiness": "（潜意识高配得誓言：一句极具力量、高贵笃定、直击潜意识深处消除匮乏感的显化宣言，约25-45字）"
  },
  "autoWrittenNarrative": "（将上述五感感应融汇成一段一气呵成、可以直接作为愿望详情或显化画卷的自动书写中文文本，包含【我期望显化的终极状态】、【令我身临其境的感官画面】、【我的高配得感誓言】三部分）",
  "autoWrittenNarrativeEn": "（The above auto-written narrative translated into highly elegant, poetic, and luxurious English with [My Ultimate Manifestation State], [Immersive Sensory Imagery], and [Affirmation of Absolute Worthiness]）"
}`;

      let responseText = "";
      try {
        const response = await safeGenerateContent("gemini-3.1-flash-lite", {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sensoryChanneling: {
                  type: Type.OBJECT,
                  properties: {
                    visual: { type: Type.STRING },
                    acoustic: { type: Type.STRING },
                    aroma: { type: Type.STRING },
                    tactile: { type: Type.STRING },
                    worthiness: { type: Type.STRING },
                  },
                  required: ["visual", "acoustic", "aroma", "tactile", "worthiness"]
                },
                autoWrittenNarrative: { type: Type.STRING },
                autoWrittenNarrativeEn: { type: Type.STRING }
              },
              required: ["sensoryChanneling", "autoWrittenNarrative", "autoWrittenNarrativeEn"]
            }
          }
        });
        if (response && response.text) {
          responseText = response.text;
        }
      } catch (err: any) {
        console.warn("AI Sensory Channeling attempt 1 failed:", err);
      }

      if (!responseText) {
        try {
          const response = await safeGenerateContent("gemini-3.5-flash", {
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response && response.text) {
            responseText = response.text;
          }
        } catch (err2: any) {
          console.warn("AI Sensory Channeling attempt 2 failed:", err2);
        }
      }

      if (!responseText) {
        throw new Error("Failed to generate sensory channeling response from Gemini.");
      }

      const parsed = JSON.parse(responseText.trim().replace(/^```json/, '').replace(/```$/, ''));
      res.json(parsed);
    } catch (error: any) {
      console.error("Sensory Channeling API Error:", error);
      res.status(500).json({ error: error.message || "Failed to channel sensory details." });
    }
  });

  // 1.8 AI-powered Wei-Shi Mindset Transmutation (唯识转念炼金术) based on Dr. Jan Ding-I
  app.post("/api/wisdom/alchemize", async (req, res) => {
    try {
      const { limitingThought } = req.body;
      if (!limitingThought || !limitingThought.trim()) {
        return res.status(400).json({ error: "Limiting thought text is required." });
      }

      if (!ai) {
        // High quality offline fallback
        return res.json({
          scarcityFilter: "把当下的局限当成了永恒的实体，以为外界的得失定义了自我的价值。",
          surrenderRelease: "对不起，请原谅我，谢谢你，我爱你。放手不再紧抓抗拒，将所有紧绷交付给整体。",
          abundanceReality: "你的存在本身就是无限生命最圆满的展现。没有任何外在事物能剥夺或削弱属于你的神圣丰盛。",
          mantra: "我退后一步，让大我做主。一切都是最好的安排，我本自具足。",
          quote: "“真正的丰盛不是占有什么，而是认出你本自具足的生命本质。” —— 杨定一《丰盛》",
          isOffline: true
        });
      }

      const prompt = `你是一位深度精通杨定一博士《全部生命系列》（特别是《丰盛》《唯识》《活在当下》《奇迹》）的意识觉醒导师。
用户提出了一个他们在世俗生活中感到焦虑、匮乏或受困的【限制性信念/匮乏念头】：
"${limitingThought}"

请基于杨定一博士的「唯识转念」与「全部生命实相」理论，对这一念头进行高维度的剖析与深层转化。

请输出 JSON 格式，严格包含以下 5 个字段：
1. scarcityFilter: (string) 【小我匮乏幻象与认知滤镜】简明深刻剖析这个念头背后的妄念与执着（约40-60字）。
2. surrenderRelease: (string) 【承认与臣服心法】指导如何放下抗拒、向生命整体交付与原谅（约40-60字）。
3. abundanceReality: (string) 【唯识真如丰盛实相】用极其深邃、安抚且赋能的语言，揭示生命无限充盈的本质真相（约60-80字）。
4. mantra: (string) 【即刻转化真言】一句适合在心中默念的极简强效转念口诀（约15-25字）。
5. quote: (string) 【杨定一原著智慧金句】对应的一句典藏指引金句。`;

      let responseText = "";
      try {
        const response = await safeGenerateContent("gemini-3.1-flash-lite", {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scarcityFilter: { type: Type.STRING },
                surrenderRelease: { type: Type.STRING },
                abundanceReality: { type: Type.STRING },
                mantra: { type: Type.STRING },
                quote: { type: Type.STRING }
              },
              required: ["scarcityFilter", "surrenderRelease", "abundanceReality", "mantra", "quote"]
            }
          }
        });
        if (response && response.text) {
          responseText = response.text;
        }
      } catch (err: any) {
        console.warn("Alchemize Gemini API attempt failed, using fallback:", err);
      }

      if (!responseText) {
        return res.json({
          scarcityFilter: "小我将局部的暂时现象当成了生命的全部，产生了‘我不够’或‘资源匮乏’的认知错觉。",
          surrenderRelease: "闭上眼睛，深深呼吸。对自己说：谢谢你，我放下抗拒，全然交托给更高的宇宙智慧。",
          abundanceReality: "宇宙在每一个瞬间都在无条件地滋养着你。从心底深处认出丰盛，外在的丰足便会自然显化与涌流。",
          mantra: "我放手，我允许，我在本自圆满的丰盛中安歇。",
          quote: "“当你退一步，放手并安住在喜悦中，生命自然会为你推开最完美的门扉。” —— 杨定一《丰盛》",
          isOffline: true
        });
      }

      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Wisdom Alchemize Error:", error);
      res.status(500).json({ error: error.message || "Failed to alchemize mindset." });
    }
  });

  // 2. Text to Speech API using Gemini TTS
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName = 'Zephyr' } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required for TTS." });
      }

      if (!ai) {
        return res.status(501).json({ error: "Gemini API key is missing. Speech synthesis requires GEMINI_API_KEY." });
      }

      // Determine if the text is primarily English to guide pronunciation and emotion
      let instructionText = "";
      const isEnglish = /[a-zA-Z]{4,}/.test(text);

      if (isEnglish) {
        if (voiceName === 'Kore') {
          instructionText = `Read this in an incredibly beautiful, gentle, highly elegant, and noble female voice of a royal princess. Speak with an extremely slow, calm, majestic, and graceful poise. Each word should carry royal dignity, deep comforting warmth, and peaceful authority:\n\n"${text}"`;
        } else if (voiceName === 'Zephyr') {
          instructionText = `Read this deeply soothing, luxurious, and divine manifestation scenario in an incredibly serene, warm, mature, elegant, and majestic female voice with a slow, calming, and comforting British or standard elite tone, perfect for deep manifestation meditation. Speak with absolute serenity and majestic warmth:\n\n"${text}"`;
        } else if (voiceName === 'Charon') {
          instructionText = `Read this in a highly magnetic, rich, warm, and sophisticated mature male voice with a gentle, slow, and steady aristocratic tone, creating a deep sense of divine protection, cosmic wisdom, and inner calm:\n\n"${text}"`;
        } else if (voiceName === 'Fenrir') {
          instructionText = `Read this in a deep, grounding, resonant, and low-frequency masculine voice with an incredibly slow, rhythmic, and peaceful tempo, perfect for deep grounding and sleep meditation:\n\n"${text}"`;
        } else {
          instructionText = `Read this deeply soothing, luxurious, and divine manifestation scenario in an incredibly beautiful, elegant, soothing, and hypnotic voice. Speak with high emotion and absolute serenity:\n\n"${text}"`;
        }
      } else {
        if (voiceName === 'Kore') {
          instructionText = `你是一位出身高贵、温婉知性且极具皇室威仪感的公主殿下。请用最温柔、优雅、从容且不失庄重高贵的女性声音，以极其平缓舒慢、字正腔圆且充满安抚力量的语气，朗读以下显化语。让声音字里行间流露出无上的尊贵、从容与宇宙对听者的极致呵护与爱意：\n\n"${text}"`;
        } else if (voiceName === 'Zephyr') {
          instructionText = `你是一位极具宇宙智慧与温柔慈悲的女性神圣导师。请用极其静谧、深沉、平缓且高贵的磁性女声，声情并茂地朗读以下显化语。带着一贯的宠爱与笃定，在描绘丰盛与尊贵时，让语调充满温暖安宁的宇宙安抚力量，每个字都直击潜意识深处：\n\n"${text}"`;
        } else if (voiceName === 'Charon') {
          instructionText = `你是一位高维宇宙的古雅守护者与大智慧导师。请用极其沉稳、温润、磁性、充满儒雅魅力且极其优雅的成熟男声，带着沉静与无限包容的力量，平缓地朗读以下显化语。让声音在空间中形成温暖舒缓的声场，带来极致的安全感与配得感：\n\n"${text}"`;
        } else if (voiceName === 'Fenrir') {
          instructionText = `你是一位专注于身心疗愈与冥想引导的大师。请用一种极具安全感、低沉、浑厚、充满大自然和大地般宽广力量的低频男声，平缓而有节奏地朗读以下显化语。字句间留有静谧的呼吸与停顿，帮助听者彻底放松，将意识扎根于大地与丰盛之中：\n\n"${text}"`;
        } else {
          instructionText = `你是一位极具同理心的专业心理疗愈师。请用极其温柔、深沉、平缓且富有韵律感的声音，声情并茂地朗读以下显化语，带来静谧与幸福感：\n\n"${text}"`;
        }
      }

      const response = await safeGenerateContent("gemini-3.1-flash-tts-preview", {
        contents: [{ parts: [{ text: instructionText }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName as any },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: "No audio stream returned from Gemini TTS." });
      }

      res.json({ audio: base64Audio });
    } catch (error: any) {
      const isQuotaExceeded = error.status === 'RESOURCE_EXHAUSTED' || 
                              error.message?.includes('429') || 
                              error.message?.includes('quota') || 
                              error.status === 429;
      if (isQuotaExceeded) {
        console.warn("Gemini TTS Quota Exceeded (429). Triggering browser client-side SpeechSynthesis fallback.");
        return res.status(429).json({ error: "Gemini TTS quota exceeded. Local SpeechSynthesis fallback active." });
      }
      console.error("TTS API Error:", error);
      res.status(500).json({ error: error.message || "Speech synthesis failed." });
    }
  });

  // 3. Mount Vite server in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted on Express.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
