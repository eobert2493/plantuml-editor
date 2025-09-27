import { defineConfig, type Plugin, type ConfigEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Lightweight dev-only proxy to OpenAI that logs responses to the terminal
    ({
      name: "ai-proxy-logger",
      apply: 'serve',
      configureServer(server: import('vite').ViteDevServer) {
        server.middlewares.use("/__ai_proxy", async (req: import('http').IncomingMessage & { url?: string; method?: string }, res: import('http').ServerResponse) => {
          try {
            const originalUrl = req.url || "/";
            // Map /__ai_proxy/* -> https://api.openai.com/*
            const upstreamPath = originalUrl.replace(/^\/__ai_proxy/, "");
            const upstreamUrl = `https://api.openai.com${upstreamPath}`;

            const chunks: Uint8Array[] = [];
            req.on("data", (c: Uint8Array) => chunks.push(c));
            req.on("end", async () => {
              try {
                const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
                const headers: Record<string, string> = {};
                for (const [k, v] of Object.entries(req.headers)) {
                  if (typeof v === "string") headers[k] = v;
                }
                headers["host"] = "api.openai.com";
                // Ensure JSON content-type for POSTs
                if (req.method && req.method !== "GET" && !headers["content-type"]) {
                  headers["content-type"] = "application/json";
                }

                const upstream = await fetch(upstreamUrl, {
                  method: req.method,
                  headers,
                  // Forward raw body (Buffer is a Uint8Array)
                  body: req.method && ["GET", "HEAD"].includes(req.method) ? undefined : (body as unknown as Uint8Array),
                } as RequestInit);

                const text = await upstream.text();
                // Basic terminal logging (status + first chars of body)
                console.log(`\n[AI PROXY] ${req.method} ${upstreamPath} -> ${upstream.status}`);
                console.log(text.slice(0, 4000));

                res.statusCode = upstream.status;
                upstream.headers.forEach((val, key) => {
                  if (key.toLowerCase() === "transfer-encoding") return;
                  try { res.setHeader(key, val); } catch (err) {
                    // ignore header set failures
                  }
                });
                res.end(text);
              } catch (err: unknown) {
                console.error("[AI PROXY] Forward error:", err);
                res.statusCode = 500;
                res.setHeader("content-type", "application/json");
                const msg = (err && (err as Error).message) ? (err as Error).message : String(err);
                res.end(JSON.stringify({ error: "ai_proxy_failed", message: msg }));
              }
            });
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "ai_proxy_failed" }));
          }
        });
      },
    } as Plugin),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
