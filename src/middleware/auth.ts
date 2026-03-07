import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { JWT_CONFIG } from '../config/constants';

export interface AuthRequest extends Request {
  user?: { id: string };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      const error: AppError = new Error('Token não fornecido. Faça login para acessar.');
      error.statusCode = 401;
      error.status = 'unauthorized';
      return next(error);
    }
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET) as { id: string };
    req.user = { id: decoded.id };
    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'JsonWebTokenError') {
        const e: AppError = new Error('Token inválido');
        e.statusCode = 401;
        e.status = 'unauthorized';
        return next(e);
      }
      if (error.name === 'TokenExpiredError') {
        const e: AppError = new Error('Token expirado');
        e.statusCode = 401;
        e.status = 'unauthorized';
        return next(e);
      }
    }
    const e: AppError = new Error('Erro ao verificar token');
    e.statusCode = 401;
    e.status = 'unauthorized';
    return next(e);
  }
};
