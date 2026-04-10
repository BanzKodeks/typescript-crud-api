import express, { Application } from 'express';
import cors from 'cors';
import { errorHandler } from './_middleware/errorHandler';
import { initialize } from './_helpers/db';
import userController from './users/users.controller';

const app: Application = express();


// Allows the app to read JSON request bodies
app.use(express.json());

// Allows the app to read URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Allows the frontend (running on a different port) to call this API
// Without this, browsers will block cross-origin requests
app.use(cors());


// All user-related routes are handled by the users controller
// e.g. GET /users, POST /users/authenticate, DELETE /users/:id
app.use('/users', userController);




app.use(errorHandler);



const PORT = process.env.PORT || 4000;


initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });