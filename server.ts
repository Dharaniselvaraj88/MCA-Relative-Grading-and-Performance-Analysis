import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import compression from "compression";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Enable gzip/deflate response compression for fast HTTP downloads
  app.use(compression() as unknown as express.RequestHandler);

  app.use(express.json({ limit: "5mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", institution: "COIMBATORE INSTITUTE OF TECHNOLOGY" });
  });

  // AI-enhanced Cognitive Insights route using Gemini 3.6 Flash
  app.post("/api/cognitive-ai-enrichment", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          message: "Gemini API key not configured. Using rule-based cognitive engine."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const { student, scores, sectionScores, difficultyStats, behavioralMetrics } = req.body;

      const prompt = `Act as a senior Cognitive Scientist and Career Strategist at Coimbatore Institute of Technology (CIT).
Analyze the following postgraduate cognitive assessment data:

Student Name: ${student.name}
Register Number: ${student.registerNo}
Department: ${student.department}

Overall Score: ${scores.overallScore} / 50 (${scores.percentage}%)
Accuracy by Difficulty:
- Easy (15 Qs): ${difficultyStats.easy.score}/15 (${difficultyStats.easy.accuracy}%)
- Medium (15 Qs): ${difficultyStats.medium.score}/15 (${difficultyStats.medium.accuracy}%)
- Hard (20 Qs): ${difficultyStats.hard.score}/20 (${difficultyStats.hard.accuracy}%)

Section Scores:
- Numerical Reasoning: ${sectionScores.numerical}/10
- Verbal & Logical Inference: ${sectionScores.verbal}/10
- Algorithmic & Computational Thinking: ${sectionScores.algorithmic}/10
- Working Memory & Reflective Response: ${sectionScores.workingMemory}/10
- Abstract & Logical Reasoning: ${sectionScores.abstract}/10

Behavioral Metrics:
- Total Time Used: ${behavioralMetrics.totalTimeFormatted}
- Average Time per Question: ${behavioralMetrics.avgTimePerQuestion}s
- Reflective Pause Ratio: ${behavioralMetrics.reflectivePauseRatio}
- Marked for Review Count: ${behavioralMetrics.reviewCount}

Provide a high-level executive summary (3 paragraphs) covering:
1. Executive Cognition Level & Thinking Rigor
2. Deep Behavioral Traits & Problem-Solving Archetype
3. Recommended Specialized PG Research / Career Path & Strategic Growth Plan for this candidate at CIT.

Keep tone professional, encouraging, analytical, and tailored to post-graduate engineering / technology students. Format in clean markdown with bold points.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

      return res.json({
        success: true,
        aiSummary: response.text
      });
    } catch (error: any) {
      console.error("Gemini AI Enrichment error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to generate AI cognitive enrichment"
      });
    }
  });

  // Route to download or view discussion PDF with forced attachment disposition
  const handlePdfDownload = (_req: express.Request, res: express.Response) => {
    const publicPdfPath = path.join(process.cwd(), "public", "CIT_Portal_Discussion_Document.pdf");
    const rootPdfPath = path.join(process.cwd(), "CIT_Portal_Discussion_Document.pdf");
    const filePath = fs.existsSync(publicPdfPath) ? publicPdfPath : rootPdfPath;

    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=\"CIT_Portal_Discussion_Document.pdf\"");
      res.sendFile(filePath);
    } else {
      res.status(404).send("Discussion PDF file not found.");
    }
  };

  app.get("/CIT_Portal_Discussion_Document.pdf", handlePdfDownload);
  app.get("/api/download-discussion-pdf", handlePdfDownload);

  // Route to view / download SVG image of Homepage
  const handleSvgDownload = (req: express.Request, res: express.Response) => {
    const publicSvgPath = path.join(process.cwd(), "public", "CIT_Cognitive_Portal_Homepage.svg");
    const rootSvgPath = path.join(process.cwd(), "CIT_Cognitive_Portal_Homepage.svg");
    const filePath = fs.existsSync(publicSvgPath) ? publicSvgPath : rootSvgPath;

    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "image/svg+xml");
      if (req.query.inline !== "1") {
        res.setHeader("Content-Disposition", "attachment; filename=\"CIT_Cognitive_Portal_Homepage.svg\"");
      }
      res.sendFile(filePath);
    } else {
      res.status(404).send("SVG Image file not found.");
    }
  };

  app.get("/CIT_Cognitive_Portal_Homepage.svg", handleSvgDownload);
  app.get("/api/download-homepage-svg", handleSvgDownload);

  // Route to view / download JPEG image of Homepage
  const handleJpgDownload = (req: express.Request, res: express.Response) => {
    const publicJpgPath = path.join(process.cwd(), "public", "CIT_Cognitive_Portal_Homepage.jpg");
    const rootJpgPath = path.join(process.cwd(), "CIT_Cognitive_Portal_Homepage.jpg");
    const filePath = fs.existsSync(publicJpgPath) ? publicJpgPath : rootJpgPath;

    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "image/jpeg");
      if (req.query.inline !== "1") {
        res.setHeader("Content-Disposition", "attachment; filename=\"CIT_Cognitive_Portal_Homepage.jpg\"");
      }
      res.sendFile(filePath);
    } else {
      res.status(404).send("JPEG Image file not found.");
    }
  };

  app.get("/CIT_Cognitive_Portal_Homepage.jpg", handleJpgDownload);
  app.get("/CIT_Cognitive_Portal_Homepage.jpeg", handleJpgDownload);
  app.get("/api/download-homepage-jpg", handleJpgDownload);

  // Serve public directory statically
  app.use(express.static(path.join(process.cwd(), "public"), { maxAge: "1d" }));

  // Vite middleware in dev mode or static serving in production
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProd = process.env.NODE_ENV === "production" || (hasDist && process.env.NODE_ENV !== "development");

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(distPath, { maxAge: "1y", etag: true }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`CIT Cognitive Assessment Server running on http://localhost:${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is currently in use. Exiting process so supervisor can restart cleanly...`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
    }
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);
}

startServer().catch((err) => {
  console.error("Failed to start CIT Cognitive Assessment Server:", err);
});
