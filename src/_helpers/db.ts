import config from '../../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';

export interface Database {
    User: any;
}

export const db: Database = {} as Database;

export async function initialize(): Promise<void> {

    const { host, port, user, password, database } = config.database;

    // Step 1: Create database if it doesn't exist
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end();

    // Step 2: Connect Sequelize to the database
    const sequelize = new Sequelize(database, user, password, {
        host,
        dialect: 'mysql'
    });

    // Step 3: Import model

    const { default: userModel } = await import('../users/user.model');

    // Step 4: Initialize model
    db.User = userModel(sequelize);

    // Step 5: Sync database
    await sequelize.sync({ alter: true });

    console.log('Database initialized and models synchronized.');
}