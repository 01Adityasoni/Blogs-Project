require("dotenv/config");
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const port = process.env.PORT || 3000;

const userRoutes = require("./routes/user")

app.set("view engine", "ejs");
app.set("views",path.resolve("./views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.resolve("./public")));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));


 
app.get("/", (req, res) => {
    res.render("home", { user: req.user });
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



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 