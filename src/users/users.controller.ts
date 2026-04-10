import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import Joi from 'joi';
import { Role } from '../_helpers/role';
import { validateRequest } from '../_middleware/validateRequest';
import { userService } from './user.service';
import { authorize } from '../_middleware/authorize';

const router = Router();


router.post('/authenticate', authenticateSchema, authenticate);


router.get('/',     authorize([Role.Admin]), getAll);
router.get('/:id',  authorize(),             getById);
router.post('/',    createSchema,            create);        
router.put('/:id',  authorize(), updateSchema, update);
router.delete('/:id', authorize([Role.Admin]), _delete);

export default router;

// ─── Handlers ────────────────────────────────────────────────────────────────

function getAll(req: Request, res: Response, next: NextFunction): void {
    userService.getAll()
        .then((users) => res.json(users))
        .catch(next);
}

function getById(req: Request, res: Response, next: NextFunction): void {
    userService.getById(Number(req.params.id))
        .then((user) => res.json(user))
        .catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
    userService.create(req.body)
        .then(() => res.status(201).json({ message: 'User created successfully' }))
        .catch(next);
}

function update(req: Request, res: Response, next: NextFunction): void {
    userService.update(Number(req.params.id), req.body)
        .then(() => res.json({ message: 'User updated successfully' }))
        .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction): void {
    userService.delete(Number(req.params.id))
        .then(() => res.json({ message: 'User deleted successfully' }))
        .catch(next);
}

function authenticate(req: Request, res: Response, next: NextFunction): void {
    userService.authenticate(req.body)
        .then((user) => res.json(user))
        .catch(next);
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

function createSchema(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        role: Joi.string().valid(Role.Admin, Role.User).default(Role.User),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required()
            .messages({ 'any.only': 'Passwords do not match' }),
    });
    validateRequest(req, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
        title: Joi.string().empty(''),
        firstName: Joi.string().empty(''),
        lastName: Joi.string().empty(''),
        role: Joi.string().valid(Role.Admin, Role.User).empty(''),
        email: Joi.string().email().empty(''),
        password: Joi.string().min(6).empty(''),
        confirmPassword: Joi.string().valid(Joi.ref('password')).empty('')
            .messages({ 'any.only': 'Passwords do not match' }),
    }).with('password', 'confirmPassword');
    validateRequest(req, next, schema);
}

function authenticateSchema(req: Request, res: Response, next: NextFunction): void {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    validateRequest(req, next, schema);
}