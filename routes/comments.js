const { Router } = require('express');
const router = Router();
const db = require('../db');
const { comments } = require('../models/comment');
const { and, eq } = require('drizzle-orm');

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


router.post('/delete', async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/user/signin');
        }

        if (req.user.role !== 'admin') {
            return res.status(403).send('Forbidden');
        }

        const { blogTitle, content, createdBy } = req.body || {};
        if (!blogTitle || !content || !createdBy) {
            return res.redirect(`/blogs/view?title=${encodeURIComponent(blogTitle || '')}`);
        }

        const normalizedCreatedBy = createdBy.trim().toLowerCase();
        const normalizedContent = content.trim();

        await db
            .delete(comments)
            .where(
                and(
                    eq(comments.blogTitle, blogTitle),
                    eq(comments.content, normalizedContent),
                    eq(comments.createdBy, normalizedCreatedBy)
                )
            );

        return res.redirect(`/blogs/view?title=${encodeURIComponent(blogTitle)}`);
    } catch (err) {
        console.error('Failed to delete comment:', err);
        return res.status(500).send('Unable to delete comment right now.');
    }
});

module.exports = router;
