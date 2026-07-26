# Trends Bird Limited - Backend Developer Intern Assignment

Production-ready implementation of the **Ecommerce Admin Dashboard REST API & Dashboard Frontend** built with **NestJS (TypeScript), PostgreSQL (Prisma ORM)**, and **React (Vite + Tailwind CSS)**.

---

## 1. Module-by-Module Completion Status

| # | Module | Status | Features Completed |
|---|---|---|---|
| **1** | **Authentication** | ✅ **COMPLETE** | Login with email/password, short-lived JWT (15m) + long-lived refresh token (7d), **Refresh Token Rotation**, server-side logout revocation, active user checks, password hashing via bcrypt, standardized auth errors. |
| **2** | **Permission** | ✅ **COMPLETE** | Permission groups & action vocabulary (`product:create`, `media:upload`, etc.), custom actions, normalized permission names, search, pagination, group updates, cascade deletion of role links. |
| **3** | **Role** | ✅ **COMPLETE** | Role creation with permission assignment, pre-ticked edit matrix, grant-all shortcut, user count per role, refuse deletion if users assigned, guard preventing stripping `role:update` from the last administrative role. |
| **4** | **User** | ✅ **COMPLETE** | User creation with mandatory role selection, search, role & status filters, role modification, activate/deactivate toggle, **self-escalation & self-deletion protection**. |
| **5** | **Media** | ✅ **COMPLETE** | Single & multi-file upload (`multer`), mime type & size validation, thumbnail generation (`sharp`), library grid search & filter by type, metadata edit (altText, title), asset deletion (removes file + record, detaches cleanly). |
| **6** | **Category** | ✅ **COMPLETE** | Nested category hierarchy with unlimited depth, category tree endpoint, unique DB slug constraint, **cycle rejection algorithm** (category cannot be its own ancestor), subcategory reassignment on deletion. |
| **7** | **Brand** | ✅ **COMPLETE** | Brand CRUD, unique name/slug constraints, logo media reference, status filter, product reference guard (refuses deletion if referenced by products). |
| **8** | **Attribute** | ✅ **COMPLETE** | Attribute CRUD (Dropdown, Radio, Checkbox, Colour Swatch, Image Swatch), Value manager (Hex color picker, swatch values), variant reference deletion guard. |
| **9** | **Product** | ✅ **COMPLETE** | **Simple vs Variable products**, top-level vs variant pricing/stock validation, SKU uniqueness across products & variants, duplicate attribute combination rejection, atomic creation in **Prisma transaction**, primary thumbnail rules (demotes previous thumbnail), gallery sort ordering. |

---

## 2. Seeded Account Credentials

The database seed script initializes all 41+ system permissions, administrative roles, users, and sample catalog items:

| Account Role | Email Credentials | Password | Permissions & Purpose |
|---|---|---|---|
| **Super Administrator** | `admin@trendsbird.com` | `Admin@123456` | **Full System Access** (Holds all 41+ permissions across all 9 modules). |
| **Limited Catalog User** | `catalog@trendsbird.com` | `Catalog@123456` | **Catalog Access Only** (Holds catalog permissions: category, brand, attribute, product, media, dashboard:watch. Lacks `permission:*`, `role:*`, `user:*` access for **instant 403 Forbidden verification**). |

---

## 3. Technology Stack & Design Decisions

- **Database**: PostgreSQL with Prisma ORM. Migrations committed in `backend/prisma/migrations/20260726000000_init/migration.sql`.
- **Runtime & Framework**: Node.js v22 with NestJS & TypeScript.
- **Authentication Strategy**:
  - **Token Transport**: `Authorization: Bearer <accessToken>` header.
  - **Refresh Strategy**: Short-lived 15m Access Token + Long-lived 7d Refresh Token stored in database.
  - **Refresh Token Rotation**: Exchanging a refresh token revokes the old refresh token and issues a new pair.
  - **Single In-flight Refresh**: Frontend Axios interceptor queues parallel 401 requests under a single in-flight refresh promise to prevent refresh races.
- **Access Control Architecture**:
  - `JwtAuthGuard` registered globally (all routes protected by default; `@Public()` decorator for login/refresh).
  - `PermissionsGuard` registered globally (evaluates `@RequirePermissions('module:action')` against session user permissions). Returns HTTP 403 Forbidden when role lacks capability.
- **Data Integrity & Validation**:
  - `class-validator` DTO pipes on all endpoints.
  - Standardized JSON envelope: `{ "success": true, "data": ..., "error": null }` produced centrally by interceptor and exception filter.
  - Multi-table writes (such as product creation with variants and media) are wrapped in `prisma.$transaction`.

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js (v18+) & npm
- PostgreSQL database listening on `localhost:5432`

### Backend Setup (`backend/`)
```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit DATABASE_URL in .env if needed:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trends_bird_db?schema=public"

# 3. Apply PostgreSQL migrations
npx prisma migrate dev

# 4. Run database seed
npm run seed

# 5. Build and start API server
npm run build
npm run start:dev
# API server runs at http://localhost:3000
```

### Frontend Setup (`frontend/`)
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
# Dashboard runs at http://localhost:5173
```

---

## 5. API Collection & Testing

A complete Postman API collection is included at root:
- [`postman_collection.json`](file:///home/shiku/Trends%20Bird%20Limited/postman_collection.json)

Covers all 9 modules, Super Admin login, Limited User 403 verification, Refresh Token Rotation, and CRUD requests.
