const express = require('express');
const router = express.Router();
const { createHmac, randomBytes } = require("crypto");
const { eq } = require("drizzle-orm");
const db = require("../db");
const { users } = require("../models/user")


router.get("/signin", (req, res) => {
    return res.render("signin")
});

router.get("/signup", (req, res) => {
    return res.render("signup")
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("email and password are required");
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const matchedUsers = await db
            .select({
                email: users.email,
                salt: users.salt,
                password: users.password,
            })
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        if (matchedUsers.length === 0) {
            return res.status(401).send("Invalid email or password");
        }

        const matchedUser = matchedUsers[0];
        const computedHash = createHmac("sha256", matchedUser.salt).update(password).digest("hex");

        if (computedHash !== matchedUser.password) {
            return res.status(401).send("Invalid email or password");
        }

        console.log("Signin successful for email:", normalizedEmail);
        return res.redirect("/");
    } catch (error) {
        console.error("Signin failed:", error);
        return res.status(500).send("Unable to sign in right now. Please try again.");
    }
});

router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).send("fullName, email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const existingUser = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        if (existingUser.length > 0) {
            return res.status(409).send("Email already exists. Please sign in.");
        }

        const salt = randomBytes(16).toString("hex");
        const hashedPassword = createHmac("sha256", salt).update(password).digest("hex");

        await db.insert(users).values({
            fullName: fullName.trim(),
            email: normalizedEmail,
            salt,
            password: hashedPassword,
            profileImageURL: "/user avatar img.png",
            role: "user",
        });

        return res.redirect("/user/signin");
    } catch (error) {
        console.error("Signup failed:", error);
        const errorMessage = error?.message || "Unable to create account right now. Please try again.";
        return res.status(500).send(`Unable to create account: ${errorMessage}`);
    }
});





module.exports = router;