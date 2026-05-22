const {Router} = require("express");
const router = Router();
const db = require("../db");

const { blogs } = require("../models/blogs");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '';
        const name = `${file.fieldname}-${Date.now()}${ext}`;
        cb(null, name);
    }
});

const upload = multer({ storage });


router.get("/add-new", (req, res) => {
    return res.render("addBlog",{
        user: req.user
    });
});

router.post("/add", upload.single("coverImage"), async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect("/user/signin");
        }
        const { title, content } = req.body || {};
        console.log("POST /blogs/add headers:", req.headers);
        console.log("POST /blogs/add body:", req.body);
        console.log("POST /blogs/add file:", req.file);
        if (!title || !content) {
            return res.redirect("/blogs/add-new");
        }

        const coverImageURL = req.file ? `/uploads/${req.file.filename}` : undefined;

        await db.insert(blogs).values({
            title: title.trim(),
            body: content.trim(),
            createdBy: req.user.email,
            ...(coverImageURL ? { coverImageURL } : {}),
        });

        return res.redirect("/");
    } catch (error) {
        console.error("Failed to create blog:", error);
        return res.status(500).send("Unable to create blog right now.");
    }
});


router.get("/view", async (req, res) => {
    const title = req.query.title;
    if (!title) return res.redirect("/");
    const { eq } = require("drizzle-orm");
    const { comments } = require("../models/comment");
    const matched = await db.select().from(blogs).where(eq(blogs.title, title)).limit(1);
    if (!matched || matched.length === 0) return res.redirect("/");
    const blog = matched[0];
    let blogComments = [];
    try {
        blogComments = await db.select().from(comments).where(eq(comments.blogTitle, title)).orderBy(comments.timestamp);
    } catch (err) {
        console.error('Comments query failed, retrying without orderBy:', err);
        try {
            blogComments = await db.select().from(comments).where(eq(comments.blogTitle, title));
        } catch (err2) {
            console.error('Comments query retry failed:', err2);
            blogComments = [];
        }
    }
    return res.render("blog", {
        user: req.user,
        blog,
        comments: blogComments,
    });
});

router.get("/:blogId", async (req, res) => {
    return res.redirect('/blogs');
});

module.exports = router;