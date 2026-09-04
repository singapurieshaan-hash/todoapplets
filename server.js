const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
    path: path.join(__dirname, ".env.local")
});

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { db, initializeDatabase } = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;


app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// SIGNUP
app.post("/signup", async (req, res, next) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required."
        });
    }

    try {
        const existingUser = await db.query(`
            SELECT id FROM users
            WHERE email = $1
        `, [email]);

        if (existingUser.rowCount > 0) {
            return res.status(400).json({
                message: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(`
            INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
        `, [name, email, hashedPassword]);

        res.json({
            message: "Account created successfully."
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({
                message: "Email already registered."
            });
        }

        next(error);
    }
});


// LOGIN
app.post("/login", async (req, res, next) => {

    const { email, password } = req.body;

    try {
        const result = await db.query(`
            SELECT * FROM users
            WHERE email = $1
        `, [email]);

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordMatches =
            await bcrypt.compare(password, user.password);

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
    } catch (error) {
        next(error);
    }
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
app.get("/todos", authenticate, async (req, res, next) => {

    try {
        const result = await db.query(`
            SELECT id, task, done, user_id
            FROM todos
            WHERE user_id = $1
            ORDER BY id
        `, [req.user.userId]);

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});


// CREATE TODO FOR LOGGED-IN USER
app.post("/todos", authenticate, async (req, res, next) => {

    const task = req.body.task;

    try {
        await db.query(`
            INSERT INTO todos (task, user_id)
            VALUES ($1, $2)
        `, [task, req.user.userId]);

        res.json({
            message: "Todo added."
        });
    } catch (error) {
        next(error);
    }
});


// COMPLETE TODO
app.patch("/todos/:id", authenticate, async (req, res, next) => {

    const id = req.params.id;

    try {
        await db.query(`
            UPDATE todos
            SET done = 1
            WHERE id = $1
            AND user_id = $2
        `, [id, req.user.userId]);

        res.json({
            message: "Todo completed."
        });
    } catch (error) {
        next(error);
    }
});


// DELETE TODO
app.delete("/todos/:id", authenticate, async (req, res, next) => {

    const id = req.params.id;

    try {
        await db.query(`
            DELETE FROM todos
            WHERE id = $1
            AND user_id = $2
        `, [id, req.user.userId]);

        res.json({
            message: "Todo deleted."
        });
    } catch (error) {
        next(error);
    }
});

  
initializeDatabase()
    .then(() => {

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    })
    .catch(error => {

        console.error("Failed to connect to database:", error);

    });