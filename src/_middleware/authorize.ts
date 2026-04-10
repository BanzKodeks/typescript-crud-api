import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config.json';

export function authorize(roles: string[] = []) {
    return (req: Request, res: Response, next: NextFunction): void => {

        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

        if (!token) {
            res.status(401).json({ message: 'Unauthorized - No token provided' });
            return;
        }

        try {
            const decoded = jwt.verify(token, config.jwtSecret) as unknown as { sub: number; role: string };

            
            (req as any).user = decoded;

           
            if (roles.length && !roles.includes(decoded.role)) {
                res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
                return;
            }

            next();
        } catch (err) {
            res.status(401).json({ message: 'Unauthorized - Invalid token' });
        }
    };
}