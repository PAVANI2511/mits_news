# MITS News 📰

An interactive, feature-rich digital newspaper and community portal designed for Madanapalle Institute of Technology & Science (MITS). MITS News enables students, faculty, and administrators to post updates, share articles, manage announcements, interact through comments, and configure custom system themes.

---

## 🚀 Key Features

- **Multi-Role User Management:** Tailored experience for Students, Teachers, and Administrators with custom profile configurations (roll number, department, bio, etc.).
- **Rich Media Posts:** Supports text, images, videos, audio, posters, PDF uploads, and external URLs. Automated hashtag parsing is also supported.
- **Engagement Mechanics:** Likes, shares, followers, and comments with nested reply capability.
- **Administrative Moderation:** Reporting system with automatic content snapshots (retaining data for deleted content reviews), moderation logs, and system announcements.
- **Dual-Database Design:** Leverages SQL (SQLite) for system models, accounts, and relationships alongside MongoDB for high-performance reading/caching.
- **Notification System:** Real-time updates for likes, comments, follower alerts, and admin announcements.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **State Management:** Redux Toolkit & React-Redux
- **Styling & Animation:** TailwindCSS, PostCSS, and Framer Motion
- **Networking & Routing:** Axios & React Router DOM v7

### Backend
- **Framework:** Django 5.0+ & Django REST Framework (DRF)
- **Authentication:** SimpleJWT (JSON Web Tokens) with OTP support
- **Utilities:** Python-dotenv, Pillow (image processing), Pymongo

### Databases & Infrastructure
- **Relational DB:** SQLite (default/development database for core relational structure)
- **Document DB:** MongoDB (used for denormalized fast reads / notification stores; falls back to an in-memory `mongomock` DB for simple standalone development)
- **Containerization:** Docker & Docker Compose

---

## 📁 Repository Structure

```
mits_news/
├── backend/                     # Django REST API Backend
│   ├── accounts/                # User authentication, profiles, followers, and OTP logs
│   ├── adminpanel/              # Moderation logs, reports, and announcements
│   ├── comments/                # Post comments and replies
│   ├── notifications/           # System notifications model and logic
│   ├── posts/                   # Post models, uploads, likes, and shares
│   ├── themes/                  # System custom-theme presets
│   ├── mits_news/               # Core project configurations (settings, root URLs)
│   ├── db_connection.py         # MongoDB connection helper (with mongomock fallback)
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Container setup for Django
│
├── frontend/                    # Vite + React Client
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── context/             # Global contexts (e.g. Auth, Theme)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Page components (Home, Profile, Post Details, Admin Panel)
│   │   ├── redux/               # Redux slices and store configuration
│   │   └── services/            # API routing and Axios instances
│   ├── package.json             # NPM dependencies
│   └── Dockerfile               # Container setup for React
│
└── docker-compose.yml           # Local multi-container development orchestrator
```

---

## ⚙️ Quick Start

### Option A: Running with Docker (Recommended)

Ensure you have [Docker](https://www.docker.com/) installed on your machine.

1. **Clone the repository** and navigate to the project root:
   ```bash
   git clone <repository-url>
   cd mits_news
   ```

2. **Launch all containers** (Frontend, Backend, and MongoDB):
   ```bash
   docker-compose up --build
   ```

3. **Access the services:**
   - **Frontend App:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Django Admin:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

### Option B: Local Setup (Without Docker)

#### 1. Setup the Backend
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and configure your variables:
   ```bash
   cp .env.example .env
   ```
   *(Note: Set your email SMTP parameters in `.env` if you want to test OTP notification emails. MongoDB will run on an in-memory `mongomock` instance automatically if a local MongoDB server isn't detected at `mongodb://localhost:27017`.)*
5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```
6. Create an administrator user:
   ```bash
   python manage.py createsuperuser
   ```
7. Start the development server:
   ```bash
   python manage.py runserver
   ```
   The backend server will run at [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

#### 2. Setup the Frontend
1. In a new terminal window, navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will be hosted at [http://localhost:5173](http://localhost:5173).

---

## 📡 API Endpoints Overview

| App | Endpoints Path | Description |
|---|---|---|
| **Accounts** | `/api/auth/` | Registration, login, profile view, profile edit, follow/unfollow |
| **Posts** | `/api/posts/` | Create, list, search, delete, like/unlike, increment shares |
| **Comments** | `/api/comments/` | Add comments, reply to comments, view replies |
| **Notifications** | `/api/notifications/` | View user notifications, mark as read |
| **Themes** | `/api/themes/` | Theme customization profiles |
| **Admin Panel** | `/api/admin/` | Post/user reports management, system announcements, stats |
