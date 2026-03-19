import { Request, Response, NextFunction } from 'express';
import { AccessTokenPayload } from '../utils/jwt';
declare global {
    namespace Express {
        interface Request {
            user?: AccessTokenPayload;
        }
    }
}
/** Middleware: exige autenticação via Bearer token no header Authorization */
export declare function requireAuth(req: Request, _res: Response, next: NextFunction): void;
/** Middleware: exige uma das roles listadas */
export declare function requireRole(...roles: string[]): (req: Request, _res: Response, next: NextFunction) => void;
/** Middleware: autenticação opcional — não falha se não houver token */
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map