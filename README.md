# WorkerHub — A Hyperlocal On-Demand Service Marketplace

> A comprehensive hyperlocal on-demand worker marketplace built for the Indian market — seamlessly connecting customers with verified local service professionals in real-time.

---

## 🏗️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite, React Router DOM, Zustand (State Management), Framer Motion (Animations), Lucide React (Icons), React Hot Toast (Notifications) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **Authentication** | JWT (Access & Refresh Tokens), bcryptjs, Google OAuth |
| **Payments** | Razorpay (Online UPI/Cards/Netbanking) + Cash mode |
| **File Storage** | Cloudinary (Streamed via Multer memoryStorage) |
| **Real-time Comms** | Socket.IO (Chat, Status Updates, Live Locations) |
| **Email Services** | Nodemailer |
| **AI Integration** | Custom AI Detection Service (Flags AI-generated/fraudulent Aadhar and Portfolio images) |

---

## 📁 System Architecture & Project Structure

The project is structured as a full-stack monorepo separating concerns between the client and server.

```
hyperlocal/
├── backend/
│   ├── server.js                    # Entry point, Express setup, Socket.IO binding
│   ├── .env                         # Environment variables (DB, Auth, APIs)
│   └── src/
│       ├── config/                  # Database connections
│       ├── models/                  # Mongoose DB Schemas
│       │   ├── User.js              # Shared base model (workers & customers)
│       │   ├── Worker.js            # Extended profile, skills, KYC docs
│       │   ├── Customer.js          # Extended customer profile
│       │   ├── Booking.js           # Core state machine for jobs
│       │   ├── Skill.js             # Catalog of services (Plumbing, etc.)
│       │   ├── Review.js            # Ratings and feedback
│       │   ├── Notification.js      # In-app alert tracking
│       │   ├── Message.js           # P2P Chat messages
│       │   ├── Complaint.js         # Dispute resolution management
│       │   └── Admin.js             # Platform administrators
│       ├── controllers/             # Business Logic
│       │   ├── auth.controller.js   # Reg/Login, OTPs, Token refresh
│       │   ├── booking.controller.js# Job lifecycle & dynamic billing math
│       │   ├── worker.controller.js # Worker onboarding & earnings
│       │   ├── customer.controller.js# Geo-spatial search & discovery
│       │   ├── admin.controller.js  # KYC verification & dispute management
│       │   ├── notification.controller.js
│       │   ├── message.controller.js
│       │   └── review.controller.js
│       ├── routes/                  # Express REST Endpoint mapping
│       ├── middleware/
│       │   ├── auth.js              # Role-based access control (RBAC) guards
│       │   ├── errorHandler.js      # Standardized AppError handler
│       │   └── rateLimiter.js       # API abuse protection
│       ├── services/
│       │   ├── cloudinary.service.js# Buffer stream to Cloudinary
│       │   ├── email.service.js     # Transactional emails
│       │   └── aiDetection.service.js# Fraud prevention heuristics
│       ├── socket/
│       │   └── events.js            # Real-time event mapping
│       └── utils/
│           └── seed.js              # Intelligent database populator
│
└── frontend/
    └── src/
        ├── App.jsx                  # Route definitions & guards
        ├── pages/
        │   ├── landing/             # Marketing & Entry point
        │   ├── worker/              # Worker Portal (Dashboard, Jobs, Auth)
        │   ├── customer/            # Customer Portal (Search, Booking, Orders)
        │   └── admin/               # Admin Panel (Verify KYC, Analytics)
        ├── components/              # Shared UI (Cards, Modals)
        ├── services/
        │   └── api.js               # Axios instance with auth interceptors
        └── store/
            └── authStore.js         # Zustand global auth state
```

---

## 👥 User Roles & Journeys

### 1. The Customer
- **Authentication:** Registers via Email, Phone (OTP), or Google OAuth.
- **Discovery:** Searches for workers by **City** (auto-detected from profile) and **Skill** (e.g., Plumbing, AC Repair).
- **Booking:** Books a professional dynamically (no fixed end-time).
- **Tracking:** Approves worker arrival to start a **Live Timer**.
- **Payment:** Reviews an itemized receipt upon completion and pays via Cash or Razorpay.

### 2. The Worker
- **Onboarding:** Completes a comprehensive 6-step registration process:
  1. Basic details
  2. Operating city and specific skills/rates
  3. Aadhar upload (Checked for AI tampering)
  4. Portfolio creation (Checked for AI imagery)
  5. Insurance documentation
  6. Bank details (Encrypted)
- **Status Management:** Defaults to `incomplete`. Progresses to `pending` upon form completion, and `verified` after admin review.
- **Job Execution:** Accepts jobs, navigates to the customer, clocks in, uploads "before/after" condition photos, and finishes the job to trigger the billing engine.

### 3. The Administrator
- **Governance:** Logs in securely at `/admin/login`.
- **KYC Review:** Inspects newly registered workers, reviews flagged AI documents, and approves/rejects verification statuses.
- **Disputes:** Handles customer/worker complaints.
- **Oversight:** Monitors platform analytics, earnings, and user telemetry.

---

## 💼 Core Engine: The Booking State Machine

WorkerHub uses a strict status progression for jobs. Operations are tightly controlled based on the current state.

```text
pending → accepted → arrived → in_progress → payment_pending → completed
                                                               ↘ cancelled / rejected
```

| State | Trigger | Action Sequence |
|---|---|---|
| `pending` | Customer creates booking | DB document generated, Worker receives notification. |
| `accepted` | Worker clicks Accept | Status flips, worker's schedule locks. |
| `arrived` | Worker reaches location | App prompts customer for OTP/Authorization. |
| `in_progress` | Customer authorizes | **Crucial Phase:** `startedAt` timestamp is recorded. Live UI timer begins ticking. Worker is prompted to upload an "Initial Condition Photo". |
| `payment_pending` | Worker finishes job | Backend ends time, computes dynamic mathematical bill. |
| `completed` | Customer pays | Status locks. A "Payment Received" button appears for the worker to confirm receipt. |

---

## 💰 Dynamic Billing System

WorkerHub completely eliminates "guesstimated" bookings. Customers pay for exact time worked.

**The Math (Backend Enforced):**
1. Worker clicks *Finish Job*.
2. Backend calculates elapsed time: `(completedAt - startedAt) / 3600000`.
3. Minimum 1-hour enforcement & 15-minute rounding applied: `Math.max(1, Math.ceil(elapsedHours * 4) / 4)`.
4. Invoice Generation:
   - `Subtotal = workerRate × duration`
   - `Platform Fee = Subtotal × 15%`
   - `Customer Total = Subtotal + Platform Fee`

### Payment Validation
- **Online:** Razorpay secure checkout. Server validates signature.
- **Cash:** Customer clicks "Pay Final Bill" → Backend validates `{ method: 'cash' }` → Order closed.

---

## ⏱️ Live Tracking & Receipts

### The Live Timer UI
When jobs hit `in_progress`, both apps inject a `<LiveTimer />` component.
- Reads the server `startedAt` timestamp.
- Evaluates `Date.now() - startedAt` every second (`setInterval`).
- Formats to `HH:MM:SS` instantly.

### Receipt Breakdowns
When worker attempts to finish, they get a **Projected Receipt** confirming the exact math.
The customer gets a reciprocal **Final Receipt** locked to the database calculations.

---

## 🗺️ Geo-Spatial & Search Logic

Worker visibility is highly optimized based on real-world constraints via `customer.controller.js`.

- **Strict Environment Boundaries:** In `production`, only `verified` workers are ever visible. In `development`, the net is cast wider to test the experience.
- **Dynamic Override:** If a logged-in User's profile indicates they live in `Mumbai`, the API *ignores* any URL query parameters and forces the backend query to match `Mumbai` variants (`mumbai`, `MUMBAI`, etc.).

---

## 🌱 Seeding & Testing Setup (`npm run seed`)

The platform ships with a robust `seed.js` script to instantly simulate a living ecosystem.

- **Non-Destructive:** The seeder identifies and clears ONLY `@demo.workerhub.in` test accounts. Real, manual registrations are safely ignored and preserved.
- **The Matrix:** Iterates through 9 Indian mega-cities and 12 trade skills, creating a matrix of **108 perfectly populated workers** boasting culturally relevant names (`Rahul Patil`, `Sneha Desai`), proper avatars, and randomized job histories.

### Demo Credentials (post-seed)

| Portal | URL | Credential Set |
|---|---|---|
| **Admin** | `/admin/login` | Email: `admin@workerhub.in` Password: `Admin@123456` |
| **Worker** | `/worker/login` | Email: `worker.mumbai.1@demo.workerhub.in` Password: `Demo@12345` |
| **Customer** | `/customer/login` | Email: `anuj@demo.workerhub.in` Password: `Demo@12345` |

---

## ⚙️ Required API & Environment Setup

`hyperlocal/backend/.env` requires the following architecture keys:

```env
MONGO_URI=mongodb+srv://...               # Your Cluster URI
JWT_SECRET=strong_key_here                # Security Signer
JWT_REFRESH_SECRET=strong_key_here
RAZORPAY_KEY_ID=rzp_test_...              # Payment Gateway
RAZORPAY_KEY_SECRET=...
CLOUDINARY_CLOUD_NAME=...                 # Media Hosting
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ADMIN_INITIAL_EMAIL=admin@workerhub.in    # Master overrides
ADMIN_INITIAL_PASSWORD=Admin@123456
NODE_ENV=development                      # Sets city search & verification strictness
PORT=5000
```
