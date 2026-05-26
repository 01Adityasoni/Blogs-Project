# Blogs Project

A full-stack blogging web application built with Node.js, Express, EJS, PostgreSQL, and Drizzle ORM.

This app supports:
- User signup/signin with JWT cookie-based authentication
- Role-based access (`user`, `admin`)
- Blog creation, viewing, editing, and deletion
- Image upload for blog covers
- Comment creation and admin-only comment deletion
- Admin user management (promote users to admin)

---

## 1) Project Overview

The application is a server-rendered blog platform (EJS templates) with PostgreSQL as the data store.

Core flow:
1. User creates account and signs in
2. Server issues JWT in `token` cookie
3. Auth middleware decodes cookie and attaches `req.user`
4. Authenticated users can create blogs and comments
5. Admins can manage users, delete blogs, and delete comments

---

## 2) Tech Stack and Libraries

### Runtime and Backend
- **Node.js**: JavaScript runtime
- **Express (`^5.2.1`)**: Web framework and routing
- **EJS (`^5.0.2`)**: Server-side HTML templating
- **cookie-parser (`^1.4.7`)**: Parses cookies from requests
- **jsonwebtoken (`^9.0.3`)**: JWT token signing/verification
- **multer (`^2.1.1`)**: Multipart/form-data parsing and file uploads

### Database and ORM
- **PostgreSQL (`pg` `^8.21.0`)**: SQL database
- **Drizzle ORM (`drizzle-orm` `^0.45.2`)**: Query builder + schema mapping
- **Drizzle Kit (`drizzle-kit` `^0.31.10`)**: Migration generation and config

### Dev Tooling
- **nodemon (`^3.1.14`)**: Auto-restarts server in development
- **dotenv (`^17.4.2`)**: Loads environment variables

### Frontend (CDN)
- **Bootstrap 5.3.8**: Layout/components/utilities
- **Google Fonts**: `Manrope` + `Space Grotesk`

---

## 3) Folder and File Responsibilities

```text
.
├── index.js                         # Express app bootstrap, middleware, routes, home route
├── migrate.js                       # Runs Drizzle migrations against DATABASE_URL
├── drizzle.config.js                # Drizzle migration config
├── docker-compose.yml               # PostgreSQL container mapping (5433 -> 5432)
├── db/
│   └── index.js                     # DB pool + drizzle instance
├── middlewares/
│   └── authentication.js            # Cookie auth middleware
├── services/
│   └── authentication.js            # JWT creation/verification service
├── models/
│   ├── user.js                      # users table + role enum
│   ├── blogs.js                     # blogs table
│   └── comment.js                   # comments table
├── routes/
│   ├── user.js                      # auth + admin user management routes
│   ├── blogs.js                     # blog CRUD + cover uploads
│   └── comments.js                  # comment create/delete
├── utils/
│   └── coverImage.js                # file signature detection + fallback handling
├── public/
│   ├── styles/theme.css             # full UI theme styling
│   ├── cover-placeholder.svg        # fallback cover image
│   ├── user avatar img.png          # default user avatar
│   └── uploads/                     # uploaded blog cover images
├── views/
│   ├── home.ejs
│   ├── blog.ejs
│   ├── addBlog.ejs
│   ├── editBlog.ejs
│   ├── signin.ejs
│   ├── signup.ejs
│   ├── manageUsers.ejs
│   └── partials/
│       ├── head.ejs
│       ├── nav.ejs
│       └── scripts.ejs
└── drizzle/
    ├── 0000_moaning_black_crow.sql  # migration SQL
    └── meta/                         # Drizzle migration metadata
```

---

## 4) Environment Variables

Create `.env` in project root:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require
PORT=3000
NODE_ENV=development
```

Required:
- `DATABASE_URL`: PostgreSQL connection string (required by app and migrations)

Optional:
- `PORT`: Express server port (defaults to `3000`)
- `NODE_ENV`: controls `secure` cookie flag in production

> Important: your current `.env` contains real DB credentials. Rotate/revoke and replace with new credentials if this repository is shared.

---

## 5) Installation and Running

### Local development

```bash
npm install
npm run migrate
npm run dev
```

Available npm scripts:
- `npm run migrate` -> executes `node migrate.js`
- `npm run start` -> executes `node index.js`
- `npm run dev` -> executes `nodemon index.js`

### Docker database option

`docker-compose.yml` starts PostgreSQL 17.4 and exposes:
- host port `5433` -> container port `5432`

Run DB:

```bash
docker compose up -d
```

Then set `DATABASE_URL` to match your container credentials and database.

---

## 6) Database Schema (Drizzle + SQL)

### Enum
- `role`: `user | admin`

### `users`
- `full_name` varchar not null
- `email` varchar not null unique
- `salt` varchar nullable
- `password` varchar not null
- `timestamp` timestamp not null default `now()`
- `profile_image_url` varchar not null default `/user avatar img.png`
- `role` enum role not null default `user`

### `blogs`
- `title` varchar not null
- `body` varchar not null
- `cover_image_url` varchar default `/blog cover img.png`
- `created_by` varchar not null references `users.email`
- `timestamp` varchar not null default (generated in migration)

### `comments`
- `content` varchar not null
- `created_by` varchar not null references `users.email`
- `blog_title` varchar not null
- `timestamp` timestamp not null default `now()`

### Key schema notes
- No explicit primary keys are defined for `users`, `blogs`, or `comments`.
- `comments.blog_title` is plain text (not FK) because `blogs.title` is not unique.
- Blog identification in routes uses title (`?title=...`), so duplicate titles can cause ambiguity.

---

## 7) Authentication and Authorization

### Authentication mechanism
- JWT stored in HTTP-only cookie: `token`
- Middleware (`checkForAuthenticationCookie`) verifies token and sets `req.user`
- Token payload includes:
  - `id`, `fullName`, `email`, `profileImageURL`, `role`
- Token expiry: `1h`

### Password handling
- Passwords are hashed with SHA-256 HMAC + random salt (`crypto.createHmac`) before storing

### Authorization rules
- Guest users:
  - Can view sign-in/sign-up pages
  - Cannot add blogs/comments
  - Homepage does not load blog list for guests
- Authenticated users:
  - Can add blogs
  - Can comment
  - Can edit only blogs they created
- Admin users:
  - Can access `/user/manage-users`
  - Can promote users to admin
  - Can delete any blog
  - Can delete comments

---

## 8) Complete Route Reference

## App-level routes (`index.js`)
- `GET /`:
  - If authenticated: fetches blogs + author profile data
  - If guest: renders home with empty blog list
- `GET /signup` -> redirect to `/user/signup`
- `GET /signin` -> redirect to `/user/signin`
- `POST /signup` -> 307 redirect to `/user/signup`
- Static serving:
  - `/uploads/:filename`: validates file is an image by content signature before serving
  - `/public` assets via `express.static`

## User routes (`/user`)
- `GET /user/signin`: render signin page
- `POST /user/signin`: validate credentials, set auth cookie, redirect `/`
- `GET /user/signup`: render signup page (option to create admin depends on existing admins)
- `POST /user/signup`: create user/admin with hashed password
- `GET /user/manage-users`: admin-only page listing all users
- `POST /user/make-admin`: admin-only promotion route
- `GET /user/signout`: clears `token` cookie and redirects home

## Blog routes (`/blogs`)
- `GET /blogs/add-new`: render add blog form
- `POST /blogs/add`: authenticated create blog with optional/required cover image upload (form requires image)
- `GET /blogs/view?title=...`: view single blog and its comments
- `GET /blogs/edit?title=...`: author-only edit page
- `POST /blogs/update`: author-only update blog data and optional new cover image
- `POST /blogs/delete`: admin-only blog delete (also deletes associated comments + uploaded cover image file)
- `GET /blogs/` -> redirect `/`
- `GET /blogs/:blogId` -> redirect `/` (currently unused)

## Comment routes (`/comments`)
- `POST /comments/add`: authenticated add comment for `blogTitle`
- `POST /comments/delete`: admin-only delete comment(s) by `blogTitle + content + createdBy`

---

## 9) File Upload and Image Handling

### Upload pipeline
- Multer stores files in `public/uploads`
- Generated filename format: `coverImage-<timestamp>.<ext>`
- Extension inferred from original file extension or MIME type map

### Validation
- Blog add/update checks `req.file.mimetype.startsWith("image/")`
- Non-image uploads are deleted immediately and request is rejected

### Render-safe image resolution
- `resolveCoverImageURL()` verifies local file exists and is image by magic-byte signature
- Fallback image: `/cover-placeholder.svg`

### MIME signature detection
Supported signatures in `utils/coverImage.js`:
- PNG, JPEG, SVG, GIF, BMP
- MP4 detection is present (returns `video/mp4`), but uploads are expected to be images

---

## 10) View Layer and UI Behavior

### Layout
- Shared partials:
  - `partials/head.ejs`: Bootstrap CSS, fonts, app CSS
  - `partials/nav.ejs`: role-aware navbar
  - `partials/scripts.ejs`: Bootstrap JS bundle

### Pages
- `home.ejs`: hero, spotlight card, blog grid
- `blog.ejs`: single blog view, comments, edit/delete actions based on role/ownership
- `addBlog.ejs`: create form with cover image upload
- `editBlog.ejs`: update form, optional new cover image
- `signin.ejs`, `signup.ejs`: auth forms
- `manageUsers.ejs`: admin dashboard for role promotion

### Styling
- Theme defined in `public/styles/theme.css`
- Dark glassmorphism style with custom gradients and animations
- Responsive behavior for smaller screens

---

## 11) Detailed Functional Behavior

### First admin creation logic
- Signup checks whether any admin exists.
- If none exists, signup form can expose role selector to create the first admin.
- Once admins exist, only existing admins can create another admin account.

### Blog ownership checks
- Edit/update allowed only if `req.user.email === blog.createdBy`.

### Blog deletion flow (admin)
1. Validate admin role
2. Find blog by title
3. Delete related comments by `blogTitle`
4. Delete blog row
5. Delete uploaded cover image file if path starts with `/uploads/`

### Blog title update side effect
- If title changes, all comments with old `blogTitle` are updated to the new title.

### Comment deletion scope
- Deletes using conditions:
  - `blogTitle`
  - `content` (trimmed)
  - `createdBy` (normalized)
- If duplicates exist with same values, multiple comments may be removed.

---

## 12) Security and Reliability Notes

### Present
- HTTP-only auth cookies
- Password hashing with per-user salt
- Basic role checks for admin endpoints
- Basic file-type checks for uploads

### Missing / recommended
- Move JWT secret from hardcoded string to environment variable (`JWT_SECRET`)
- Add CSRF protection for state-changing POST routes
- Add request validation library (e.g., zod/joi/express-validator)
- Add rate limiting for signin/signup endpoints
- Add primary keys and indexes
- Make `blogs.title` unique or use stable ID-based blog URLs
- Store `blogs.timestamp` as proper DB timestamp type
- Add transactions around multi-step destructive operations
- Add central error handling and structured logging

---

## 13) Known Codebase Observations

1. `services/authentication.js` contains a hardcoded JWT secret.
2. `blogs.timestamp` is a `varchar` default generated at migration time; not an auto-updating DB timestamp.
3. No primary keys on tables; this complicates safe updates/deletes.
4. Some routes identify blogs only by title, causing collisions when titles repeat.
5. Home page only fetches blog list for authenticated users.
6. `express.static` is registered twice in `index.js`.
7. There is an extra `}` in `public/styles/theme.css` after `.spotlight-copy` block; CSS still may render but should be cleaned.

---

## 14) Suggested Next Improvements (Practical Roadmap)

1. Introduce numeric/UUID primary keys to all tables.
2. Switch blog routing from title query to `id` paths (`/blogs/:id`).
3. Add `JWT_SECRET` in `.env` and rotate existing tokens.
4. Add schema validation for all incoming payloads.
5. Add CSRF + rate limiting middleware.
6. Add pagination for blog list and comments.
7. Add tests (unit + integration) and CI checks.
8. Add API docs for future REST/JSON endpoints if needed.

---

## 15) Quick Manual Testing Checklist

1. Start DB and app.
2. Sign up first account as admin (if no admin exists).
3. Sign in and create blog with image.
4. View blog details and add comments.
5. Edit blog as author and verify updated content/title.
6. As admin, visit manage users and promote a user.
7. As admin, delete a comment and delete a blog.
8. Sign out and verify protected actions redirect/forbid.

---

## 16) License and Ownership

Current `package.json` license: `ISC`.

Add your project-specific license, contribution guidelines, and deployment notes as needed.
