import jwt from 'jsonwebtoken';
import config from '../../config.json';

export function generateToken(user: { id: number; role: string }): string {
    return jwt.sign(
        { sub: user.id, role: user.role },
        config.jwtSecret,
        { expiresIn: '7d' }
    );
}