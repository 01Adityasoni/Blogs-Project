require("dotenv/config");
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const port = process.env.PORT || 3000;

const userRoutes = require("./routes/user")
const blogsRoutes = require("./routes/blogs")
const commentsRoutes = require("./routes/comments")

const db = require("./db");
const { blogs } = require("./models/blogs");    


app.set("view engine", "ejs");
app.set("views",path.resolve("./views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.resolve("./public")));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

app.use(express.static(path.resolve("./public")));
 
app.get("/", async (req, res) => {
    let allBlogs = [];
    if (req.user) {
        allBlogs = await db.select().from(blogs);
    }
    res.render("home", { user: req.user, blogs: allBlogs });
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