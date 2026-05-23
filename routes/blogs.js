const {Router} = require("express");
const router = Router();
const db = require("../db");

const { blogs } = require("../models/blogs");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { resolveCoverImageURL } = require("../utils/coverImage");
const { users } = require("../models/user");

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
        const mimeExtensionMap = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/bmp": ".bmp",
            "image/svg+xml": ".svg",
        };
        const inferredExt = ext || mimeExtensionMap[file.mimetype] || "";
        const name = `${file.fieldname}-${Date.now()}${inferredExt}`;
        cb(null, name);
    }
});

const upload = multer({ storage });


router.get("/add-new", (req, res) => {
    return res.render("addBlog",{
        user: req.user,
        errorMessage: req.query.error || ""
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
        if (req.file && !req.file.mimetype.startsWith("image/")) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error("Failed to remove non-image upload:", unlinkError);
            }
            return res.redirect("/blogs/add-new?error=" + encodeURIComponent("Please upload an image file for the cover image."));
        }
        if (!title || !content) {
            return res.redirect("/blogs/add-new?error=" + encodeURIComponent("Title and content are required."));
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


router.get("/edit", async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect("/user/signin");
        }

        const title = req.query.title;
        if (!title) {
            return res.redirect("/");
        }

        const { eq } = require("drizzle-orm");
        const { comments } = require("../models/comment");

        const matched = await db
            .select({
                title: blogs.title,
                body: blogs.body,
                createdBy: blogs.createdBy,
                coverImageURL: blogs.coverImageURL,
                timestamp: blogs.timestamp,
                authorFullName: users.fullName,
                authorProfileImageURL: users.profileImageURL,
            })
            .from(blogs)
            .innerJoin(users, eq(blogs.createdBy, users.email))
            .where(eq(blogs.title, title))
            .limit(1);

        if (!matched || matched.length === 0) {
            return res.redirect("/");
        }

        const blog = {
            ...matched[0],
            resolvedCoverImageURL: resolveCoverImageURL(matched[0].coverImageURL),
        };

        if (req.user.email !== blog.createdBy) {
            return res.status(403).send("Forbidden");
        }

        return res.render("editBlog", {
            user: req.user,
            blog,
            errorMessage: req.query.error || "",
        });
    } catch (error) {
        console.error("Failed to load blog edit page:", error);
        return res.status(500).send("Unable to load blog editor right now.");
    }
});


router.post("/update", upload.single("coverImage"), async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect("/user/signin");
        }

        const { oldTitle, title, content } = req.body || {};
        if (!oldTitle || !title || !content) {
            return res.redirect("/blogs/edit?title=" + encodeURIComponent(oldTitle || "") + "&error=" + encodeURIComponent("Title and content are required."));
        }

        const { eq } = require("drizzle-orm");
        const { comments } = require("../models/comment");

        const matchedBlog = await db
            .select({
                title: blogs.title,
                createdBy: blogs.createdBy,
                coverImageURL: blogs.coverImageURL,
            })
            .from(blogs)
            .where(eq(blogs.title, oldTitle))
            .limit(1);

        if (!matchedBlog || matchedBlog.length === 0) {
            return res.redirect("/");
        }

        const existingBlog = matchedBlog[0];
        if (req.user.email !== existingBlog.createdBy) {
            return res.status(403).send("Forbidden");
        }

        if (req.file && !req.file.mimetype.startsWith("image/")) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error("Failed to remove non-image upload:", unlinkError);
            }
            return res.redirect("/blogs/edit?title=" + encodeURIComponent(oldTitle) + "&error=" + encodeURIComponent("Please upload an image file for the cover image."));
        }

        const coverImageURL = req.file ? `/uploads/${req.file.filename}` : existingBlog.coverImageURL;
        const nextTitle = title.trim();
        const nextContent = content.trim();

        await db
            .update(blogs)
            .set({
                title: nextTitle,
                body: nextContent,
                ...(req.file ? { coverImageURL } : {}),
            })
            .where(eq(blogs.title, oldTitle));

        if (oldTitle !== nextTitle) {
            await db
                .update(comments)
                .set({ blogTitle: nextTitle })
                .where(eq(comments.blogTitle, oldTitle));
        }

        if (req.file && existingBlog.coverImageURL && existingBlog.coverImageURL.startsWith("/uploads/")) {
            const oldImagePath = path.resolve("./public", existingBlog.coverImageURL.slice(1));
            if (fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (unlinkError) {
                    console.error("Failed to remove previous cover image:", unlinkError);
                }
            }
        }

        return res.redirect(`/blogs/view?title=${encodeURIComponent(nextTitle)}`);
    } catch (error) {
        console.error("Failed to update blog:", error);
        return res.status(500).send("Unable to update blog right now.");
    }
});


router.post("/delete", async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect("/user/signin");
        }

        if (req.user.role !== "admin") {
            return res.status(403).send("Forbidden");
        }

        const { title } = req.body || {};
        if (!title) {
            return res.redirect("/");
        }

        const { eq } = require("drizzle-orm");
        const { comments } = require("../models/comment");

        const matchedBlog = await db
            .select({ coverImageURL: blogs.coverImageURL })
            .from(blogs)
            .where(eq(blogs.title, title))
            .limit(1);

        if (!matchedBlog || matchedBlog.length === 0) {
            return res.redirect("/");
        }

        await db.delete(comments).where(eq(comments.blogTitle, title));
        await db.delete(blogs).where(eq(blogs.title, title));

        const coverImageURL = matchedBlog[0].coverImageURL;
        if (coverImageURL && coverImageURL.startsWith("/uploads/")) {
            const imagePath = path.resolve("./public", coverImageURL.slice(1));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                } catch (unlinkError) {
                    console.error("Failed to remove cover image:", unlinkError);
                }
            }
        }

        return res.redirect("/");
    } catch (error) {
        console.error("Failed to delete blog:", error);
        return res.status(500).send("Unable to delete blog right now.");
    }
});


router.get("/view", async (req, res) => {
    const title = req.query.title;
    if (!title) return res.redirect("/");
    const { eq } = require("drizzle-orm");
    const { comments } = require("../models/comment");
    const matched = await db
        .select({
            title: blogs.title,
            body: blogs.body,
            createdBy: blogs.createdBy,
            timestamp: blogs.timestamp,
            authorFullName: users.fullName,
            authorProfileImageURL: users.profileImageURL,
            coverImageURL: blogs.coverImageURL,
        })
        .from(blogs)
        .innerJoin(users, eq(blogs.createdBy, users.email))
        .where(eq(blogs.title, title))
        .limit(1);
    if (!matched || matched.length === 0) return res.redirect("/");
    const blog = {
        ...matched[0],
        resolvedCoverImageURL: resolveCoverImageURL(matched[0].coverImageURL),
    };
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
    const normalizedComments = (blogComments || []).map((comment) => ({
        ...comment,
        timestampValue: comment.timestamp ? new Date(comment.timestamp).toISOString() : "",
    }));
    return res.render("blog", {
        user: req.user,
        blog,
        comments: normalizedComments,
    });
});

router.get("/", (req, res) => {
    return res.redirect("/");
});

router.get("/:blogId", async (req, res) => {
    return res.redirect("/");
});




module.exports = router;