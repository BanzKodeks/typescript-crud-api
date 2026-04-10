Prerequisites

Make sure you have the following installed before starting:

Tool
Node.js 
XAMPP (MySQL)


Note: This project uses XAMPP for MySQL. Make sure XAMPP is running with Apache and MySQL started before running the API.


Setup Instructions

Step 1 — Start MySQL via XAMPP

1. Open XAMPP Control Panel
2. Click start next to MySQL
3. Optionally click Start next to Apache if you want to use phpMyAdmin
4. 
The database `typescript_crud_api` will be created automatically when you first run the API. You don't need to create it manually.

Step 2 — Configure the Database

Open `config.json` in the root of the API project and verify the settings match your XAMPP setup:

```
json
{
    "database": {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "",
        "database": "typescript_crud_api"
    },
    "jwtSecret": "change-this-in-production-123!"
}
```

> Default XAMPP settings: user = `root`, password = ` ` (blank). If you set a MySQL password in XAMPP, update `"password"` here.


Step 3 — Install Dependencies

Open a terminal inside the `typescript-crud-api/` folder and run:

```
npm install
```

---

tep 4 — Start the API

```

npm run start:dev
```

Expected output:
```
Database initialized and models synchronized.
Server running on http://localhost:4000

```

> If you see a `ER_TOO_MANY_KEYS` error: open phpMyAdmin, drop the `users` table, and restart the server. This happens when `alter: true` is used repeatedly — the project uses `force: false` to prevent this.

---

Step 5 — Open the Frontend

Open `index.html` directly in your browser (double-click it or drag it into Chrome/Firefox).

> Make sure the API is running on port 4000 before using the frontend — the page shows a reminder at the top.



Testing the API with Postman

Base URL
```
http://localhost:4000

```

---

1. Create a User (Register)

POST `/users`

```
json
{
    "title": "Mr",
    "firstName": "System",
    "lastName": "Admin",
    "role": "Admin",
    "email": "admin@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!"
}
```

**Expected response (201):**
```
json
{ "message": "User created successfully" }
```

---

2. Login (Authenticate)

POST `/users/authenticate`

```
json
{
    "email": "admin@example.com",
    "password": "Password123!"
}
```

Expected response (200):
```
json
{
    "id": 1,
    "title": "Mr",
    "firstName": "System",
    "lastName": "Admin",
    "email": "admin@example.com",
    "role": "Admin",
    "createdAt": "...",
    "updatedAt": "...",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> Copy the `token` value** — you'll need it for all protected routes below.


3. Get All Users (Admin only — requires token)

GET `/users`

Add this to the **Headers** tab in Postman:
```
Key:   Authorization
Value: Bearer <paste your token here>
```

Expected response (200):
```
json
[
    {
        "id": 1,
        "firstName": "System",
        "lastName": "Admin",
        "email": "admin@example.com",
        "role": "Admin",
        ...
    }
]
```

Without a token — expected response (401):
```
json
{ "message": "Unauthorized - No token provided" }
```

---

4. Get One User by ID

GET `/users/1`

Headers: `Authorization: Bearer <token>`

Expected response (200):
```
json
{
    "id": 1,
    "firstName": "System",
    ...
}
```
