import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { connectDB } from "./db";

/**
 * Safely exit the process after ensuring logs are flushed.
 * In containerized environments (Railway, Docker), process.exit() may terminate
 * before stdout/stderr buffers are flushed, causing logs to disappear.
 * This function ensures logs are written before exit.
 */
function safeExit(code: number, message: string): void {
  // Write directly to stderr (unbuffered) to ensure it's visible
  process.stderr.write(`\n[FATAL] ${message}\n`);
  process.stderr.write(`[FATAL] Exiting with code ${code}\n`);
  
  // Flush stdout and stderr explicitly
  if (process.stdout.writable) {
    process.stdout.end();
  }
  if (process.stderr.writable) {
    process.stderr.end();
  }
  
  // Give a small delay to ensure buffers are flushed before exit
  // This is critical in containerized environments
  setTimeout(() => {
    process.exit(code);
  }, 100);
}

// CRITICAL: Validate JWT_SECRET at startup before any routes are registered
// This prevents runtime crashes when JWT operations are attempted
if (!process.env.JWT_SECRET) {
  safeExit(
    1,
    "JWT_SECRET missing at startup. Please set JWT_SECRET in your Railway environment variables."
  );
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// CORS configuration - allow requests from frontend
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Connect to MongoDB
  try {
    await connectDB();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    safeExit(1, `Failed to connect to MongoDB: ${errorMessage}`);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Don't crash the process on handled errors (especially important in production).
    // Log for observability; upstream process managers can still restart on fatal errors.
    console.error(err);
  });

  // In production with separate frontend hosting, don't serve static files
  // Only serve static files if FRONTEND_HOSTED_SEPARATELY is not set
  if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_HOSTED_SEPARATELY) {
    serveStatic(app);
  } else if (process.env.NODE_ENV !== "production") {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
