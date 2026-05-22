const { Router } = require('express');
const router = Router();
const db = require('../db');
const { comments } = require('../models/comment');

router.post('/add', async (req, res) => {
    try {
        if (!req.user) return res.redirect('/user/signin');
        const { content, blogTitle } = req.body || {};
        if (!content || !blogTitle) return res.redirect(`/blogs/view?title=${encodeURIComponent(blogTitle || '')}`);

        await db.insert(comments).values({
            content: content.trim(),
            createdBy: req.user.email,
            blogTitle: blogTitle,
        });

        return res.redirect(`/blogs/view?title=${encodeURIComponent(blogTitle)}`);
    } catch (err) {
        console.error('Failed to add comment:', err);
        return res.status(500).send('Unable to add comment right now.');
    }
});

module.exports = router;
