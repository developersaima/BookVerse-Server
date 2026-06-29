<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=30&duration=3000&pause=1000&color=10B981&center=true&vCenter=true&width=600&lines=📚+BookVerse+API;Express.js+REST+Backend;Secure+%7C+Fast+%7C+Scalable" alt="Typing SVG" />

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Site-book--verse--bd.vercel.app-6366F1?style=for-the-badge&logo=vercel&logoColor=white)](https://book-verse-bd.vercel.app/)
[![Client Repo](https://img.shields.io/badge/📁_Client_Repo-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/developersaima/BookVerse-Client)
[![Server Repo](https://img.shields.io/badge/📁_Server_Repo-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/developersaima/BookVerse-Server)

<br/>

![Express.js](https://img.shields.io/badge/Express_v5-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![dotenv](https://img.shields.io/badge/dotenv-ECD53F?style=flat-square&logo=dotenv&logoColor=black)

</div>

---

## 📖 About

**BookVerse Server** is the RESTful API backend for the BookVerse ebook sharing platform. It handles authentication, ebook management, payments, and all role-based operations for readers, writers, and admins. Built with **Express.js v5** and **MongoDB**, secured with **JWT via Jose**.

---

## ✨ Key Features

- 🔐 **JWT Authentication** — Stateless auth using `jose` (sign & verify tokens)
- 👥 **Role-Based Access Control** — `user`, `writer`, `admin` roles with protected routes
- 📚 **Ebook CRUD** — Create, read, update, delete with publish/unpublish toggles
- 💳 **Stripe Webhook Handling** — Process payment events, record transactions
- 🔍 **Search & Filter API** — Query by genre, price range, availability, and sort order
- 📊 **Analytics Endpoints** — Revenue totals, user counts, monthly sales data
- 🛡️ **CORS Configured** — Secure cross-origin setup for the Next.js frontend
- 🌿 **Environment-Based Config** — All secrets via `.env`, never hardcoded

---

## 🗂️ Project Structure

```
BookVerse-Server/
├── index.js                  # App entry point
├── .env                      # Environment variables (gitignored)
├── middleware/
│   ├── verifyToken.js        # JWT verification middleware
│   └── verifyRole.js         # Role-based guard middleware
├── routes/
│   ├── auth.routes.js        # /api/auth — login, register, google
│   ├── ebook.routes.js       # /api/ebooks — CRUD + filters
│   ├── user.routes.js        # /api/users — profile, role management
│   ├── transaction.routes.js # /api/transactions — purchases, fees
│   └── admin.routes.js       # /api/admin — analytics, management
├── controllers/
│   ├── auth.controller.js
│   ├── ebook.controller.js
│   ├── user.controller.js
│   ├── transaction.controller.js
│   └── admin.controller.js
└── lib/
    └── db.js                 # MongoDB connection
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+`
- MongoDB Atlas account (or local MongoDB)
- Stripe account (for payment webhooks)

### Installation

```bash
# Clone the repository
git clone https://github.com/developersaima/BookVerse-Server.git
cd BookVerse-Server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bookverse

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Client Origin (for CORS)
CLIENT_URL=http://localhost:3000
```

> ⚠️ **Never commit `.env` to version control. It is listed in `.gitignore`.**

### Run Locally

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | Public |
| `POST` | `/api/auth/login` | Login with email/password | Public |
| `POST` | `/api/auth/google` | Google OAuth token exchange | Public |

### Ebooks
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/ebooks` | Browse all ebooks (search, filter, sort, paginate) | Public |
| `GET` | `/api/ebooks/:id` | Get single ebook details | Public |
| `POST` | `/api/ebooks` | Upload new ebook | Writer |
| `PUT` | `/api/ebooks/:id` | Edit ebook | Writer (own) |
| `DELETE` | `/api/ebooks/:id` | Delete ebook | Writer (own) / Admin |
| `PATCH` | `/api/ebooks/:id/publish` | Toggle publish/unpublish | Writer / Admin |

### Transactions
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/transactions/checkout` | Create Stripe checkout session | User |
| `POST` | `/api/transactions/webhook` | Stripe webhook handler | Stripe |
| `GET` | `/api/transactions/my` | Get user's purchase history | User |
| `GET` | `/api/transactions/writer` | Get writer's sales history | Writer |
| `GET` | `/api/transactions` | Get all transactions | Admin |

### Users
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/users/me` | Get own profile | Any Auth |
| `PATCH` | `/api/users/me` | Update own profile | Any Auth |
| `GET` | `/api/users` | Get all users | Admin |
| `PATCH` | `/api/users/:id/role` | Change user role | Admin |
| `DELETE` | `/api/users/:id` | Delete user | Admin |

### Admin Analytics
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Total users, writers, ebooks, revenue | Admin |
| `GET` | `/api/admin/monthly-sales` | Monthly revenue chart data | Admin |
| `GET` | `/api/admin/genre-stats` | Ebooks by genre (pie chart) | Admin |

---

## 📦 Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | Web framework |
| `mongodb` | ^7.4.0 | Database driver |
| `jose` | ^6.2.3 | JWT sign & verify |
| `cors` | ^2.8.6 | Cross-Origin Resource Sharing |
| `dotenv` | ^17.4.2 | Environment variable loader |

---

## 🔑 Admin Credentials

```
Email:    admin@bookverse.com
Password: Admin001
```

---

## 🛡️ Security Practices

- ✅ MongoDB URI stored in `.env`, never hardcoded
- ✅ JWT secrets stored in `.env`
- ✅ Stripe secret keys stored in `.env`
- ✅ CORS restricted to known client origins
- ✅ Role verification middleware on all protected routes
- ✅ Token expiry enforced (7-day tokens)
- ✅ `.env` listed in `.gitignore`

---

## 🌍 Deployment

This server is deployed on **Vercel** (or your preferred Node.js host).

Ensure all environment variables are added to your hosting platform's config panel before deploying.

```bash
# Verify no CORS errors after deploy
curl -I https://your-server-url.vercel.app/api/ebooks
```

---

## 👩‍💻 Developer

<div align="center">

**Saima Akter**

[![GitHub](https://img.shields.io/badge/GitHub-developersaima-181717?style=flat-square&logo=github)](https://github.com/developersaima)

_Built with ❤️ as part of the A10_CAT-012 assignment_

</div>

---

<div align="center">
<sub>© 2025 BookVerse. All rights reserved.</sub>
</div>