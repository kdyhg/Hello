import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다. 설정 메뉴 > Secrets에서 키를 등록해주세요.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Route: Daily Box Office proxy
  app.get("/api/boxoffice", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date || !/^\d{8}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Expected YYYYMMDD." });
      }

      const apiKey = process.env.KOBIS_API_KEY || "a397153ff7aa6baa83f67d2ebac7baa5";
      const url = `http://kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${apiKey}&targetDt=${date}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KOBIS API responded with status ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching daily box office:", error);
      res.status(500).json({ error: error.message || "Failed to reach Kobis API" });
    }
  });

  // API Route: Movie Detail proxy
  app.get("/api/movie", async (req, res) => {
    try {
      const movieCd = req.query.movieCd as string;
      if (!movieCd) {
        return res.status(400).json({ error: "movieCd parameter is required" });
      }

      const apiKey = process.env.KOBIS_API_KEY || "a397153ff7aa6baa83f67d2ebac7baa5";
      const url = `http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json?key=${apiKey}&movieCd=${movieCd}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KOBIS API responded with status ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching movie info:", error);
      res.status(500).json({ error: error.message || "Failed to reach Kobis API" });
    }
  });

  // API Route: Generate rich cinematic review using Gemini
  app.post("/api/review/generate", async (req, res) => {
    try {
      const { movieNm, userThoughts, directors, genres, releaseDate } = req.body;
      if (!movieNm) {
        return res.status(400).json({ error: "movieNm (영화 제목)이 제공되어야 합니다." });
      }
      if (!userThoughts || !userThoughts.trim()) {
        return res.status(400).json({ error: "감상평 초안(userThoughts)을 작성해 주세요." });
      }

      const ai = getGeminiClient();

      // Construct a detailed prompt
      const prompt = `
영화 가이드 및 전문 영화 평론가 페르소나를 부여합니다.
다음 영화 정보와 사용자의 거친 한 줄 감상을 토대로, 깊이 있고 정제된 250자~450자 내외의 고급 국문 극평(영화 감상평)을 작성해 주세요.

[영화 정보]
- 제목: ${movieNm}
${directors ? `- 감독: ${directors}` : ''}
${genres ? `- 장르: ${genres}` : ''}
${releaseDate ? `- 개봉 정보: ${releaseDate}` : ''}

[사용자의 간단한 한 줄 생각/감상]
"${userThoughts}"

[작성 지침]
1. 관객의 흥미를 단번에 자극할 멋지고 은유적인 국문 영화 리뷰 헤드라인(제목)을 작성하십시오.
2. 사용자가 남긴 생각("${userThoughts}")을 중심 메시지로 삼으되, 영화의 감동이나 서사 구성을 비평적으로 살려 매우 매끄럽게 문장을 넓히십시오.
3. 영화 전반의 매력, 배우의 조화, 영상미 혹은 사운드 분위기 등을 품격 있는 단어로 묘사하여 한 폭의 비평 칼럼처럼 구성하십시오. 너무 어렵지 않으나 지적이고 수려한 문체여야 합니다. (문단은 자연스럽게 분리)
4. 이 영화에 어울리는 완성형 평점(1.0~5.0점 만점)을 제안하십시오. (예: "★ 4.5 / 5.0")
5. 리뷰의 핵심 키워드를 한 단어로 뽑아주십시오 (예: "압도적영상미", "뜨거운감동", "식지않는열정", "숨막히는반전" 등).
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: "감동적이고 감각적인 극평의 한 줄 제목",
              },
              review: {
                type: Type.STRING,
                description: "체계적이고 부드러운 평론가 풍의 상세 감상평 본문",
              },
              rating: {
                type: Type.STRING,
                description: "예상 별점 (예: ★ 4.5 / 5.0)",
              },
              keyword: {
                type: Type.STRING,
                description: "이 감상평의 핵심 소감 키워드 1단어",
              },
            },
            required: ["headline", "review", "rating", "keyword"],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini API로부터 비어있는 응답을 받았습니다.");
      }

      const result = JSON.parse(text);
      res.json(result);
    } catch (error: any) {
      console.error("Error generating film review:", error);
      res.status(500).json({ error: error.message || "상세 감상평 생성 과정에서 장애가 발생했습니다." });
    }
  });

  // Serve Vite app in dev, or static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
