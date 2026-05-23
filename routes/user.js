const express = require('express');
const router = express.Router();
const { createHmac, randomBytes } = require("crypto");
const { eq } = require("drizzle-orm");
const db = require("../db");
const { users } = require("../models/user")
const { createTokenForUser } = require("../services/authentication");


router.get("/signin", (req, res) => {
    return res.render("signin", { error: req.query.error })
});

router.get("/signup", async (req, res) => {
    const existingAdmins = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

    return res.render("signup", {
        user: req.user,
        canCreateAdmin: existingAdmins.length === 0,
    })
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
                fullName: users.fullName,
                email: users.email,
                salt: users.salt,
                password: users.password,
                profileImageURL: users.profileImageURL,
                role: users.role,
            })
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        if (matchedUsers.length === 0) {
            return res.redirect("/user/signin?error=Invalid%20email%20or%20password");
        }

        const matchedUser = matchedUsers[0];
        const computedHash = createHmac("sha256", matchedUser.salt).update(password).digest("hex");

        if (computedHash !== matchedUser.password) {
            return res.redirect("/user/signin?error=Invalid%20email%20or%20password");
        }

        console.log("Signin successful for email:", normalizedEmail);
        const token = createTokenForUser(matchedUser);
        console.log("Signin token:", token);
        return res
            .cookie("token", token, {
                httpOnly: true,
                sameSite: "lax",
                maxAge: 60 * 60 * 1000,
                secure: process.env.NODE_ENV === "production",
            })
            .redirect("/");
    } catch (error) {
        console.error("Signin failed:", error);
        return res.status(500).send("Unable to sign in right now. Please try again.");
    }
});

router.post("/signup", async (req, res) => {
    const { fullName, email, password, role } = req.body;

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

        const existingAdmins = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.role, "admin"))
            .limit(1);

        const canCreateAdmin = existingAdmins.length === 0 || (req.user && req.user.role === "admin");
        const requestedRole = role === "admin" && canCreateAdmin ? "admin" : "user";

        const salt = randomBytes(16).toString("hex");
        const hashedPassword = createHmac("sha256", salt).update(password).digest("hex");

        await db.insert(users).values({
            fullName: fullName.trim(),
            email: normalizedEmail,
            salt,
            password: hashedPassword,
            profileImageURL: "/user avatar img.png",
            role: requestedRole,
        });

        return res.redirect("/user/signin");
    } catch (error) {
        console.error("Signup failed:", error);
        const errorMessage = error?.message || "Unable to create account right now. Please try again.";
        return res.status(500).send(`Unable to create account: ${errorMessage}`);
    }
});


router.get("/manage-users", async (req, res) => {
    if (!req.user) {
        return res.redirect("/user/signin");
    }

    if (req.user.role !== "admin") {
        return res.status(403).send("Forbidden");
    }

    const allUsers = await db
        .select({
            fullName: users.fullName,
            email: users.email,
            role: users.role,
            timestamp: users.timestamp,
            profileImageURL: users.profileImageURL,
        })
        .from(users);

    return res.render("manageUsers", {
        user: req.user,
        users: allUsers,
        errorMessage: req.query.error || "",
        successMessage: req.query.success || "",
    });
});


router.post("/make-admin", async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect("/user/signin");
        }

        if (req.user.role !== "admin") {
            return res.status(403).send("Forbidden");
        }

        const { email } = req.body || {};
        if (!email) {
            return res.redirect("/user/manage-users?error=" + encodeURIComponent("Please choose a user to promote."));
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail === req.user.email) {
            return res.redirect("/user/manage-users?error=" + encodeURIComponent("You are already an admin."));
        }

        const matchedUsers = await db
            .select({ email: users.email, role: users.role })
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        if (matchedUsers.length === 0) {
            return res.redirect("/user/manage-users?error=" + encodeURIComponent("User not found."));
        }

        if (matchedUsers[0].role === "admin") {
            return res.redirect("/user/manage-users?success=" + encodeURIComponent("User is already an admin."));
        }

        await db
            .update(users)
            .set({ role: "admin" })
            .where(eq(users.email, normalizedEmail));

        return res.redirect("/user/manage-users?success=" + encodeURIComponent(`${normalizedEmail} is now an admin.`));
    } catch (error) {
        console.error("Failed to promote user:", error);
        return res.status(500).send("Unable to update user role right now.");
    }
});


router.get("/signout", (req, res) => {
    return res
        .clearCookie("token", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        })
        .redirect("/");
});





module.exports = router;