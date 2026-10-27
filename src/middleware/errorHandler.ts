import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler — catches thrown errors and Supabase errors.
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('❌ Error:', err.message || err);

  // Supabase/PostgREST error shape
  if (err.code && err.message && err.details) {
    res.status(400).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}
