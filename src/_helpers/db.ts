import config from '../../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';


export interface Database {
    User: any;
}


export const db: Database = {} as Database;

// initialize() connects to MySQL and sets up our Sequelize models
export async function initialize(): Promise<void> {

    const { host, port, user, password, database } = config.database;


    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end();


    const sequelize = new Sequelize(database, user, password, {
        host,
        dialect: 'mysql',
        logging: false, // Set to console.log if you want to see all SQL queries
    });


    const { default: userModel } = await import('../users/user.model');


    db.User = userModel(sequelize);

    // force: false means "create the table if it doesn't exist, don't drop existing data"
    await sequelize.sync({ force: false });

    console.log('Database initialized and models synchronized.');
}