import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Parse command line arguments if provided (e.g. --port 3000 --host 0.0.0.0)
  const portArgIdx = process.argv.indexOf('--port');
  const cliPort = portArgIdx !== -1 ? Number(process.argv[portArgIdx + 1]) : NaN;
  const hostArgIdx = process.argv.indexOf('--host');
  const cliHost = hostArgIdx !== -1 ? process.argv[hostArgIdx + 1] : undefined;

  // In AI Studio / Cloud Run, PORT=8080 is used by Nginx reverse proxy.
  // The Node application must bind to DEFAULT_APP_PORT (3000), never 8080.
  const PORT = !isNaN(cliPort)
    ? cliPort
    : Number(process.env.DEFAULT_APP_PORT || process.env.APP_PORT || 3000);
  const HOST = cliHost || '0.0.0.0';

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'FinReview API',
      timestamp: new Date().toISOString(),
    });
  });

  // Server-side Gemini API proxy route (protects API keys from client exposure)
  app.post('/api/analyst/query', async (req: Request, res: Response) => {
    try {
      const { query, prompt, toolExecutions } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server',
          fallbackNeeded: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const userQuestion = query || prompt || '';
      const promptContent = `You are FinReview AI Financial Analyst. You must adhere to a strict rule:
EVERY SINGLE NUMBER, DOLLAR FIGURE, PERCENTAGE, AND TRANSACTION ID YOU MENTION MUST ORIGINATE DIRECTLY FROM THE PROVIDED TOOL RESULTS.
NEVER calculate, estimate, extrapolate, or invent any number. If a figure is not present, state that you cannot determine it.

User Question: "${userQuestion}"

Tool Results:
${JSON.stringify(toolExecutions || [], null, 2)}

Provide a concise, professional, CFO-ready executive explanation referencing the verified figures and transaction IDs:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptContent,
      });

      res.json({
        text: response.text ? response.text.trim() : '',
        model: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.error('Server Gemini Error:', err);
      res.status(500).json({
        error: err.message || 'Gemini inference failed',
        fallbackNeeded: true,
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Mounted Vite dev middlewares.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`Serving static production build from ${distPath}`);
  }

  app.listen(PORT, HOST, () => {
    console.log(`FinReview dev server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting FinReview server:', err);
  process.exit(1);
});
