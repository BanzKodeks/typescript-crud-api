import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: Error | string,
    req: Request,
    res: Response,
    next: NextFunction
): Response | void {
    if (typeof err === 'string') {
        // Treat "not found" strings as 404, everything else as 400
        const is404 = err.toLowerCase().endsWith('not found');
        const statusCode = is404 ? 404 : 400;
        return res.status(statusCode).json({ message: err });
    }

    if (err instanceof Error) {
        // Surface known business-logic errors as 400 instead of 500
        const knownErrors = [
            'not found',
            'already registered',
            'incorrect',
            'do not match',
        ];
        const isKnown = knownErrors.some(e => err.message.toLowerCase().includes(e));
        const statusCode = isKnown ? 400 : 500;
        return res.status(statusCode).json({ message: err.message });
    }

    // Fixed: was "Message" (capital M) — now consistent lowercase
    return res.status(500).json({ message: 'Internal server error' });
}