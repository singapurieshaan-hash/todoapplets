const Database = require("better-sqlite3");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const path = require("path");

const db = new Database("todos.db");
const app = express();

const JWT_SECRET = "my-super-secret-key";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// USERS TABLE
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`).run();


// TODOS TABLE
db.prepare(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        done INTEGER DEFAULT 0,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`).run();

console.log(
    "TODO TABLE:",
    db.prepare("PRAGMA table_info(todos)").all()
);

console.log(
    "USERS TABLE:",
    db.prepare("PRAGMA table_info(users)").all()
);

// SIGNUP
app.post("/signup", (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required."
        });
    }

    const existingUser = db.prepare(`
        SELECT * FROM users
        WHERE email = ?
    `).get(email);

    if (existingUser) {
        return res.status(400).json({
            message: "Email already registered."
        });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
    `).run(name, email, hashedPassword);

    res.json({
        message: "Account created successfully."
    });
});


// LOGIN
app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const user = db.prepare(`
        SELECT * FROM users
        WHERE email = ?
    `).get(email);

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    const passwordMatches =
        bcrypt.compareSync(password, user.password);

    if (!passwordMatches) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    const token = jwt.sign(
        {
            userId: user.id,
            name: user.name
        },
        JWT_SECRET,
        {
            expiresIn: "2h"
        }
    );

    res.json({
        token: token,
        name: user.name
    });
});


// AUTH MIDDLEWARE
function authenticate(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "No token provided."
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        const user = jwt.verify(
            token,
            JWT_SECRET
        );

        req.user = user;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token."
        });

    }
}


// GET TODOS FOR LOGGED-IN USER
app.get("/todos", authenticate, (req, res) => {

    const todos = db.prepare(`
        SELECT * FROM todos
        WHERE user_id = ?
    `).all(req.user.userId);

    res.json(todos);
});


// CREATE TODO FOR LOGGED-IN USER
app.post("/todos", authenticate, (req, res) => {

    const task = req.body.task;

    db.prepare(`
        INSERT INTO todos (task, user_id)
        VALUES (?, ?)
    `).run(task, req.user.userId);

    res.json({
        message: "Todo added."
    });
});


// COMPLETE TODO
app.patch("/todos/:id", authenticate, (req, res) => {

    const id = req.params.id;

    db.prepare(`
        UPDATE todos
        SET done = 1
        WHERE id = ?
        AND user_id = ?
    `).run(id, req.user.userId);

    res.json({
        message: "Todo completed."
    });
});


// DELETE TODO
app.delete("/todos/:id", authenticate, (req, res) => {

    const id = req.params.id;

    db.prepare(`
        DELETE FROM todos
        WHERE id = ?
        AND user_id = ?
    `).run(id, req.user.userId);

    res.json({
        message: "Todo deleted."
    });
});

app.get("/login-page", authenticate, (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "login.html")
    );
}); 

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
