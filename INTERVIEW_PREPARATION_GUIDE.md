# Trends Bird Limited - Complete Interview Preparation & Code Walkthrough Guide

This document is your **cheat sheet and walkthrough guide** for the technical interview. It explains the entire architecture, design choices, data flow, key algorithms, and probable interview questions in simple, plain English.

---

## 1. Executive High-Level Overview

### What is this project?
An **Ecommerce Admin Dashboard REST API & Management Interface**. It has no customer-facing storefront; it is built purely for store administrators, managers, and catalog editors to manage users, access roles, media assets, categories, brands, variation attributes, and products (both simple items and multi-variant products).

### Tech Stack at a Glance:
- **Backend Framework**: NestJS (Node.js) with TypeScript.
- **Database & ORM**: PostgreSQL with Prisma ORM (`schema.prisma`). Zero-config local SQLite fallback (`dev.db`).
- **Authentication**: JWT Access Token (15 min) + Refresh Token (7 days) with **Refresh Token Rotation**.
- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons.

---

## 2. Core Architecture & Concepts (Must-Know for Interview)

### A. Access Control System (RBAC + Permission Guards)
> **How to explain in interview**: "Access is enforced at two levels: Authentication (`JwtAuthGuard`) and Fine-Grained Permission (`PermissionsGuard`). Every route requires authentication by default unless marked `@Public()`. Every action checks if the user's role possesses the `module:action` string."

#### Key Code Files:
- Global Registration: `backend/src/app.module.ts`
- Auth Guard: `backend/src/common/guards/jwt-auth.guard.ts`
- Permission Guard: `backend/src/common/guards/permissions.guard.ts`
- Permission Decorator: `backend/src/common/decorators/permissions.decorator.ts`

#### Flow Diagram:
```text
Incoming Request -> JwtAuthGuard -> (Valid Token?) -> Attach user to Req
                        |
                        v
                 PermissionsGuard -> Reads @RequirePermissions('product:create')
                        |
                        v
                 Does User's Role have 'product:create'?
                        ├─ YES ──> Controller Handler Execution (HTTP 200/201)
                        └─ NO ───> Throws HTTP 403 Forbidden Error
```

---

### B. Token Strategy & Refresh Token Rotation
> **How to explain in interview**: "We use short-lived access tokens (15 mins) stored in memory/headers and long-lived refresh tokens (7 days) saved in the database. When the access token expires, the client calls `/auth/refresh`. We invalidate (revoke) the old refresh token and issue a BRAND NEW access token and refresh token pair. If a revoked token is used, access is blocked."

#### Why Refresh Token Rotation?
If a refresh token is stolen, rotation ensures it can only be used ONCE. As soon as the legitimate user or attacker uses it, the token is rotated. If an old token is presented again, the system recognizes it as revoked and rejects the session.

#### Key Code Files:
- Auth Service: `backend/src/modules/auth/auth.service.ts`
- Token Strategy: `backend/src/modules/auth/jwt.strategy.ts`
- Axios Interceptor (Frontend): `frontend/src/api/client.ts`

---

### C. Standard Response Envelope & Error Handling
> **How to explain in interview**: "We ensure no raw 500 crashes or database stack traces reach the client. We use a NestJS Interceptor for success responses and a Global Exception Filter for errors."

#### Response Structure:
```json
// Success Response (HTTP 200/201)
{
  "success": true,
  "data": { ... },
  "error": null
}

// Error Response (HTTP 400/401/403/404/409)
{
  "success": false,
  "data": null,
  "error": {
    "statusCode": 403,
    "message": "Forbidden resource - Missing permission: product:delete",
    "timestamp": "2026-07-26T10:00:00.000Z"
  }
}
```

#### Key Code Files:
- Exception Filter: `backend/src/common/filters/http-exception.filter.ts`
- Response Interceptor: `backend/src/common/interceptors/transform-response.interceptor.ts`

---

## 3. Deep-Dive into All 9 Modules

### Module 1: Authentication (`/auth`)
- **Key Operations**: `login`, `refresh`, `session`, `logout`.
- **Password Security**: Hashed using `bcrypt.hash(password, 10)`. Never returned in readable form.
- **Login Defense**: Returns exact same generic message (`Invalid email or password`) whether the email was wrong or password was wrong to prevent email enumeration.

### Module 2: Permission (`/permissions`)
- **Structure**: Permission Groups (e.g., `product`) and Actions (e.g., `create`, `read`, `update`, `delete`, `watch`).
- **Naming Rule**: Always normalized to lowercase `module:action` (e.g. `category:create`).
- **Custom Actions**: Supports custom action vocabulary (e.g., `media:upload`, `dashboard:watch`).

### Module 3: Role (`/roles`)
- **Concept**: A named job function holding a set of permission IDs.
- **Safety Guards**:
  1. Refuses to delete a role if users are still assigned to it.
  2. Safety guard: Refuses any update/delete that would strip `role:update` from the last remaining admin role (prevents lockouts).

### Module 4: User (`/users`)
- **Concept**: Administrative accounts. Each user has exactly 1 mandatory role.
- **Self-Protection Rules**: A logged-in user cannot alter their own active status or change their own role (prevents self-escalation or self-lockout).

### Module 5: Media (`/media`)
- **File Uploads**: Handles single/multi uploads via `multer`.
- **Validation**: Validates MIME types (PNG, JPG, WEBP, MP4, PDF) and max size (15MB).
- **Thumbnail Generation**: Automatically generates small thumbnails for image uploads using `sharp`.
- **Shared Assets**: Media assets are shared; multiple products can attach to the same media file without duplicating files.

### Module 6: Category (`/categories`)
- **Hierarchy**: Supports unlimited nesting depth (`Electronics > Phones > Android`).
- **Category Tree**: `GET /categories/tree` builds recursive tree nodes.
- **Cycle Prevention Algorithm**: Uses `checkCategoryCycle` in `src/common/utils/cycle-checker.ts`. Traverses parent IDs upwards before updating to ensure a category never becomes its own ancestor.

### Module 7: Brand (`/brands`)
- **Concept**: Product manufacturer or label.
- **Deletion Protection**: Refuses deletion if any product currently references the brand.

### Module 8: Attribute (`/attributes`)
- **Concept**: Variation dimensions (Size, Colour, Material) and their values (Red, Blue, XL).
- **Display Types**: `DROPDOWN`, `RADIO`, `CHECKBOX`, `COLOUR_SWATCH` (Hex code `#FF0000`), `IMAGE_SWATCH`.
- **Deletion Protection**: Refuses to delete an attribute or value if it is referenced by a product variant.

### Module 9: Product (`/products`) - *The Core Module*
- **Simple Products**: `hasVariants = false`. Price, sale price, and stock count live directly on the product.
- **Variable Products**: `hasVariants = true`. Top-level price and stock are rejected. Price and stock live on **each variant**.
- **Atomic Operations (`$transaction`)**: Product creation, category links, variant generation, and media attachments execute inside a single Prisma transaction (`prisma.$transaction`). If any step fails, the entire transaction rolls back cleanly.
- **Thumbnail Rules**: Exactly ONE primary thumbnail per product. Setting a new primary thumbnail automatically demotes any previously selected thumbnail.

---

## 4. Expected Interview Questions & Answers

### Q1: "How do you prevent unauthorized API requests even if someone uses Postman?"
**Answer**:
> "We registered `JwtAuthGuard` and `PermissionsGuard` globally in `app.module.ts`. Every request must present a valid Bearer token. Even if a user bypasses the UI and sends a raw curl/Postman request, `PermissionsGuard` inspects their database role permissions. If they lack the required `module:action` permission (e.g. `product:delete`), the API returns HTTP 403 Forbidden."

### Q2: "How did you handle the Product Variant Matrix generation?"
**Answer**:
> "In the frontend product form, when a user picks attributes (like Colour: Red, Blue and Size: M, L), we compute the Cartesian product of the selected value sets. This dynamically generates 4 variant combinations (`Red/M`, `Red/L`, `Blue/M`, `Blue/L`). Each variant gets its own SKU, price, and stock."

### Q3: "What happens if creating variants fails halfway through product creation?"
**Answer**:
> "We wrap all DB operations in `prisma.$transaction`. Creating the product record, attaching categories, creating variants, and linking media assets happen inside one atomic transaction. If variant validation fails, the entire transaction is rolled back, leaving no orphaned or half-created records in the database."

### Q4: "How does category cycle prevention work?"
**Answer**:
> "Before setting `parentId` on a category, we traverse up the parent chain starting from the proposed new parent. If we encounter the category's own ID during the upward traversal, it means setting that parent would create a loop (A > B > A). In that case, we reject the update with HTTP 400 Bad Request."

### Q5: "How does the frontend handle expired access tokens without logging the user out?"
**Answer**:
> "We implemented an Axios response interceptor in `frontend/src/api/client.ts`. When an API call returns HTTP 401, the interceptor intercepts the error, calls `/auth/refresh` using the saved refresh token, updates the access token, and retries the original failed request seamlessly. We also use a single in-flight promise to prevent race conditions if multiple API calls trigger 401 simultaneously."

---

## 5. Quick File Map for Code Walkthrough

| What You Want to Show | File Location |
|---|---|
| **Prisma Database Schema** | [`backend/prisma/schema.prisma`](file:///home/shiku/Trends%20Bird%20Limited/backend/prisma/schema.prisma) |
| **Database Seeder & Test Accounts** | [`backend/prisma/seed.ts`](file:///home/shiku/Trends%20Bird%20Limited/backend/prisma/seed.ts) |
| **Global Guards & Interceptors Setup** | [`backend/src/app.module.ts`](file:///home/shiku/Trends%20Bird%20Limited/backend/src/app.module.ts) |
| **Permission Guard Implementation** | [`backend/src/common/guards/permissions.guard.ts`](file:///home/shiku/Trends%20Bird%20Limited/backend/src/common/guards/permissions.guard.ts) |
| **JWT & Refresh Token Rotation** | [`backend/src/modules/auth/auth.service.ts`](file:///home/shiku/Trends%20Bird%20Limited/backend/src/modules/auth/auth.service.ts) |
| **Product Atomic Transaction** | [`backend/src/modules/product/product.service.ts`](file:///home/shiku/Trends%20Bird%20Limited/backend/src/modules/product/product.service.ts) |
| **Category Cycle Checker** | [`backend/src/common/utils/cycle-checker.ts`](file:///home/shiku/Trends%20Bird%20Limited/backend/src/common/utils/cycle-checker.ts) |
| **Frontend Axios 401 Interceptor** | [`frontend/src/api/client.ts`](file:///home/shiku/Trends%20Bird%20Limited/frontend/src/api/client.ts) |
| **Tabbed Product Form & Variant Matrix** | [`frontend/src/pages/ProductFormPage.tsx`](file:///home/shiku/Trends%20Bird%20Limited/frontend/src/pages/ProductFormPage.tsx) |
| **Permission-Aware Navigation Sidebar** | [`frontend/src/components/Sidebar.tsx`](file:///home/shiku/Trends%20Bird%20Limited/frontend/src/components/Sidebar.tsx) |
