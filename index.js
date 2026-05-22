require("dotenv/config");
const express = require('express');
const path = require('path');
const fs = require("fs");
const cookieParser = require('cookie-parser');
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const port = process.env.PORT || 3000;

const userRoutes = require("./routes/user")
const blogsRoutes = require("./routes/blogs")
const commentsRoutes = require("./routes/comments")

const db = require("./db");
const { blogs } = require("./models/blogs");    
const { users } = require("./models/user");
const { detectMimeTypeFromFile, resolveCoverImageURL } = require("./utils/coverImage");
const { eq } = require("drizzle-orm");


app.set("view engine", "ejs");
app.set("views",path.resolve("./views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.get("/uploads/:filename", (req, res, next) => {
    const filePath = path.resolve("./public/uploads", req.params.filename);
    if (!fs.existsSync(filePath)) {
        return next();
    }

    const mimeType = detectMimeTypeFromFile(filePath);
    if (!mimeType || !mimeType.startsWith("image/")) {
        return next();
    }

    res.type(mimeType);
    return res.sendFile(filePath);
});
app.use(express.static(path.resolve("./public")));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

app.use(express.static(path.resolve("./public")));
 
app.get("/", async (req, res) => {
    let allBlogs = [];
    if (req.user) {
        allBlogs = await db
            .select({
                title: blogs.title,
                body: blogs.body,
                coverImageURL: blogs.coverImageURL,
                createdBy: blogs.createdBy,
                timestamp: blogs.timestamp,
                authorFullName: users.fullName,
                authorProfileImageURL: users.profileImageURL,
            })
            .from(blogs)
            .innerJoin(users, eq(blogs.createdBy, users.email));
    }
    res.render("home", {
        user: req.user,
        blogs: allBlogs.map((blog) => ({
            ...blog,
            resolvedCoverImageURL: resolveCoverImageURL(blog.coverImageURL),
        })),
    });
});

app.get("/signup", (req, res) => {
    return res.redirect("/user/signup");
});

app.get("/signin", (req, res) => {
    return res.redirect("/user/signin");
});

app.post("/signup", (req, res) => {
    return res.redirect(307, "/user/signup");
});
   
app.use("/user", userRoutes)
app.use("/blogs", blogsRoutes)
app.use("/comments", commentsRoutes)



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 