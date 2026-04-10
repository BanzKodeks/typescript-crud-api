import bcrypt from 'bcryptjs';
import { db } from '../_helpers/db';
import { Role } from '../_helpers/role';
import { User, UserCreationAttributes } from './user.model';
import { generateToken } from '../_helpers/jwt';

export const userService = {
    authenticate,
    getAll,
    getById,
    create,
    update,
    delete: _delete,
};

async function getAll(): Promise<User[]> {
    return await db.User.findAll();
}

async function getById(id: number): Promise<User> {
    return await getUser(id);
}

async function create(params: UserCreationAttributes & { password: string; confirmPassword?: string }): Promise<void> {
    const existingUser = await db.User.findOne({ where: { email: params.email } });
    if (existingUser) {
        throw new Error(`Email "${params.email}" is already registered`); // fixed typo
    }

    const passwordHash = await bcrypt.hash(params.password, 10);

    // Strip confirmPassword — not stored in DB
    const { confirmPassword, password, ...rest } = params;

    await db.User.create({
        ...rest,
        passwordHash,
        role: params.role || Role.User,
    } as UserCreationAttributes);
}

async function update(id: number, params: Partial<UserCreationAttributes> & { password?: string; confirmPassword?: string }): Promise<void> {
    const user = await getUser(id);

    if (params.password) {
        params.passwordHash = await bcrypt.hash(params.password, 10);
    }

    // Strip fields not stored in DB
    delete params.password;
    delete params.confirmPassword;

    await user.update(params as Partial<UserCreationAttributes>);
}

async function _delete(id: number): Promise<void> {
    const user = await getUser(id);
    await user.destroy();
}

async function getUser(id: number): Promise<User> {
    const user = await db.User.scope('withHash').findByPk(id);
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}

async function authenticate(params: { email: string; password: string }) {
    const user = await db.User.scope('withHash').findOne({ where: { email: params.email } });

    if (!user) throw new Error('Email or password is incorrect');

    const isMatch = await bcrypt.compare(params.password, user.passwordHash);
    if (!isMatch) throw new Error('Email or password is incorrect');

    const token = generateToken({ id: user.id, role: user.role });

    const { passwordHash, ...userWithoutHash } = user.get({ plain: true });
    return { ...userWithoutHash, token };
}