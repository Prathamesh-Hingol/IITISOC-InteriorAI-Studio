import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  console.log(`[HTTP] START ${method} ${originalUrl}`);

  // We hook into the response 'finish' event to log when the request completes
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    if (statusCode >= 400) {
      console.warn(`[HTTP] FAILURE ${method} ${originalUrl} - Status: ${statusCode} (${duration}ms)`);
    } else {
      console.log(`[HTTP] SUCCESS ${method} ${originalUrl} - Status: ${statusCode} (${duration}ms)`);
    }
  });

  // Also hook into 'close' in case the connection is aborted prematurely
  res.on("close", () => {
    if (!res.writableEnded) {
      const duration = Date.now() - start;
      console.warn(`[HTTP] CLOSED ${method} ${originalUrl} - Connection aborted prematurely after ${duration}ms`);
    }
  });

  next();
}
