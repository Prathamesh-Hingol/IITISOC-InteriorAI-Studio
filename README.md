# InteriorAI Studio — Production Architecture & System Documentation

InteriorAI Studio is a production-grade, full-stack AI interior design workspace. It enables users to upload room photographs, generate AI-driven interior restyles and furnishings, explore design variations using an interactive **branching version tree canvas**, edit image regions, and view generated interiors in **interactive 3D**.

---

## Table of Contents

1. [Executive Summary & Key Features](#1-executive-summary--key-features)
2. [System Architecture & High-Level Design](#2-system-architecture--high-level-design)
3. [Technology Stack Reference](#3-technology-stack-reference)
4. [Database Architecture & Data Models](#4-database-architecture--data-models)
5. [Backend Architecture & API Reference](#5-backend-architecture--api-reference)
6. [Frontend Architecture & UI Design System](#6-frontend-architecture--ui-design-system)
7. [Security, Authentication & Cloudinary Media Engine](#7-security-authentication--cloudinary-media-engine)
8. [AWS Cloud Deployment Architecture](#8-aws-cloud-deployment-architecture)
9. [AI Services & External Repositories](#9-ai-services--external-repositories)
10. [Local Development & Setup Guide](#10-local-development--setup-guide)

---

## 1. Executive Summary & Key Features

### Business & User Goals
InteriorAI Studio transforms static room photographs into customizable, AI-generated design concepts. Users can experiment with room layouts, furniture placement, and design presets without destroying prior iterations.

### Core Features
- **Project Workspaces**: User-owned design workspaces organizing generations.
- **Branching Version Tree Canvas**: An interactive SVG + Canvas tree visualizer where every design variation branches from a parent generation node. Users can select any previous iteration node and spawn child concepts.
- **AI Restyle & Furnishing Pipeline**: Generates high-resolution restyled room layouts based on prompts, creativity strength, and design presets.
- **AI Image Editor**: Region-based editing canvas for fine-tuning specific interior elements.
- **3D Depth Viewer**: Interactive 3D spatial depth visualization of generated rooms.
- **Cloudinary Media Pipeline**: Direct streaming of uploaded assets to Cloudinary (no local disk or S3 dependency).

---

## 2. System Architecture & High-Level Design

The application follows a decoupled client-server micro-service model. The frontend React application interacts with the Express backend via REST APIs secured by Clerk JWT tokens.

```mermaid
graph TD
    User["User Browser"] -->|"REST API + Clerk Token"| ALB["AWS Application Load Balancer"]
    ALB -->|"Forward Request"| ECS["AWS ECS Fargate - API Tasks"]
    ECS -->|"Auth Verification"| Clerk["Clerk Auth Service"]
    ECS -->|"Prisma Client Queries"| DB[("PostgreSQL Database")]
    ECS -->|"Background Jobs & Queues"| EC[("AWS ElastiCache for Redis")]
    ECS -->|"Direct Stream Upload"| Cloudinary["Cloudinary Media Engine"]
    ECS -->|"Inference Requests"| AIServices["External AI Micro-Services"]
```

### Request & Data Flow Lifecycle
1. **User Request & Auth**: The client browser sends HTTP requests with a Clerk session Bearer Token in the `Authorization` header.
2. **Token Verification & Sync**: The backend `@clerk/express` middleware validates the JWT. The `syncUser` middleware automatically syncs user profiles to the PostgreSQL database.
3. **API Processing**: Express route handlers validate input with **Zod** schemas and invoke business operations.
4. **Data Persistence & Tree Traversal**: The backend reads/writes project and version nodes using **Prisma ORM** over PostgreSQL.
5. **Cloudinary Media Pipeline**: Image upload endpoints handle multipart requests using `multer` in-memory storage and stream file buffers straight to **Cloudinary**. Cloudinary serves as the single source of truth for all room photographs and AI-generated image assets.

---

## 3. Technology Stack Reference

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite, TypeScript |
| **State Management** | TanStack (React) Query v5, Local State Hooks |
| **UI & Styling** | Vanilla CSS Tokens, Tailwind CSS, Lucide React Icons |
| **Canvas & Visuals** | HTML5 Canvas, SVG Connectors, Three.js / Depth Shaders |
| **Backend Runtime** | Node.js (v18+), Express.js, TypeScript |
| **Input Validation** | Zod Schemas |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Auth & Identity** | Clerk (`@clerk/clerk-react`, `@clerk/express`) |
| **Media Hosting** | Cloudinary API & Streaming Engine (No S3 used) |
| **Queue & Caching** | AWS ElastiCache for Redis, BullMQ |
| **AWS Cloud Infrastructure** | AWS ECR, AWS ECS Fargate, AWS ElastiCache Redis, AWS ALB |

---

## 4. Database Architecture & Data Models

### Database Choice: **PostgreSQL**
PostgreSQL was selected for application database hosting:
1. **Parent-Child Tree Representation**: Version trees use self-referential parent keys (`parentId`). PostgreSQL handles tree queries efficiently via **Recursive Common Table Expressions (CTEs)**.
2. **Strict Referential Integrity**: Uses `ON DELETE CASCADE` to prevent orphaned branch nodes when parent versions are deleted.
3. **Relational Schema**: Manages user accounts, projects, and branching generations.

### Data Model Schema (Prisma)

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    PROJECT ||--o{ GENERATION : contains
    GENERATION ||--o{ GENERATION : branches
    
    USER {
        string id PK
        string email
        string firstName
        string lastName
        datetime createdAt
        datetime updatedAt
    }

    PROJECT {
        string id PK
        string title
        string description
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    GENERATION {
        string id PK
        string projectId FK
        string parentId FK
        string imageUrl
        string prompt
        string preset
        float creativityStrength
        string generationMode
        string status
        float x
        float y
        datetime createdAt
        datetime updatedAt
    }
```

---

## 5. Backend Architecture & API Reference

### Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Prisma models & DB configuration
│   └── migrations/             # SQL migration files
├── src/
│   ├── config/                 # DB (Prisma), Cloudinary, & env configurations
│   ├── controllers/            # Controller handlers (generation, project, editor, upload, drag)
│   ├── middleware/             # Auth middleware (Clerk verification, user sync), CORS, logger
│   ├── routes/                 # Express route definitions
│   ├── app.ts                  # App initialization & middleware mounting
│   └── server.ts               # Bootstrapper verifying DB & listening on PORT
```

### Core API Endpoints

#### Projects Router (`/api/projects`)
- `GET /api/projects`: List all projects for the authenticated user.
- `POST /api/projects`: Create a new project workspace.
- `GET /api/projects/:id`: Get detailed project data along with all generation nodes.
- `DELETE /api/projects/:id`: Delete a project and cascade delete all associated generations.

#### Generations Router (`/api/generations`)
- `POST /api/generations`: Create a new AI generation (root base image or branched node).
- `GET /api/generations/:generationId`: Fetch details for a specific generation.
- `POST /api/generations/:generationId/depth`: Trigger depth map estimation for 3D viewing.
- `DELETE /api/generations/:generationId`: Delete a generation node and remove its branch dependencies.

#### Upload Router (`/api/uploads`)
- `POST /api/uploads`: Accept image upload via `multipart/form-data`, stream buffer directly to Cloudinary, and return the secure Cloudinary image URL.

#### Drag & Canvas Sync Router (`/api/drag`)
- `PATCH /api/drag/nodes`: Batch update canvas coordinates (`x`, `y`) for version nodes on the canvas.

#### Health Probes (`/api/health`, `/api/ready`)
- `GET /api/health`: Lightweight HTTP health check for AWS ALB target groups.
- `GET /api/ready`: Deep health check verifying PostgreSQL database and AWS ElastiCache Redis connectivity.

---

## 6. Frontend Architecture & UI Design System

### 4-Layer Frontend Architecture

```
frontend/src/
├── api/          # Layer 1: Pure type-safe HTTP fetch clients with Clerk Auth tokens
├── services/     # Layer 2: Business services transforming API payloads
├── hooks/        # Layer 3: TanStack React Query hooks managing caching & reactivity
├── pages/        # Layer 4a: Top-level route pages (Landing, Projects, Studio, Editor, 3D)
└── components/   # Layer 4b: Reusable UI components & canvas overlays
```

### Pages & Routes
1. **Landing Page (`/`)**: Public landing page showcasing product features.
2. **Projects Page (`/projects`)**: Protected dashboard listing user workspaces.
3. **Studio Workspace Page (`/project/:projectId`)**: Core dynamic workspace containing the interactive Version Tree canvas, prompt controller drawer, and preview modals.
4. **Editor Page (`/editor/:versionId`)**: Canvas image masking & region editing interface.
5. **3D Depth Viewer (`/project/:projectId/generation/:generationId/3d`)**: Three.js spatial depth mesh renderer.

---

## 7. Security, Authentication & Cloudinary Media Engine

### Authentication Flow
1. **Clerk Integration**: React frontend wraps root with `<ClerkProvider>` and fetches session tokens using `useAuth().getToken()`.
2. **Bearer Token Transmission**: `fetchWithAuth` client automatically injects `Authorization: Bearer <token>` on all API calls.
3. **Backend Middleware Chain**:
   - `clerkMiddleware()`: Validates token signature against Clerk's public key set.
   - `syncUser()`: Intercepts authenticated requests and syncs `req.currentUser` into the PostgreSQL `User` table.

### Cloudinary Media Engine (No S3 Bucket Required)
- **Direct Stream Uploads**: All room photographs uploaded by users are processed in memory using Multer (`multer.memoryStorage()`) and streamed straight to **Cloudinary** via stream pipes.
- **Global CDN Delivery**: Cloudinary handles image hosting, format optimization (WebP/AVIF), dynamic scaling, and global CDN caching.
- **Zero Local Disk / S3 Dependency**: Eliminates the overhead of managing S3 buckets, CORS policies, or local static file serving.

---

## 8. AWS Cloud Deployment Architecture

The production backend infrastructure is hosted on Amazon Web Services (AWS) using containerized micro-services and managed Redis.

```mermaid
graph LR
    ALB["AWS Application Load Balancer"] --> ECS["AWS ECS Fargate Tasks"]

    subgraph AWSCloud["AWS Cloud Infrastructure"]
        ECR["AWS Elastic Container Registry"]
        ECS["AWS ECS Fargate Cluster"]
        ElastiCache[("AWS ElastiCache for Redis")]
    end

    ECS -.->|"Fetch Assets"| ExternalCloudinary["Cloudinary CDN"]
    ECS -.->|"Database Queries"| ExternalDB[("PostgreSQL Database")]
    
    ECR -.->|"Pull Container Image"| ECS
    ECS --> ElastiCache
```

### AWS Infrastructure Services

#### 1. AWS ECR (Elastic Container Registry)
- Private container repository storing production Docker images built from `/backend/Dockerfile`.
- Integrated image vulnerability scanning on push.

#### 2. AWS ECS (Elastic Container Service) on Fargate
- Serverless container execution for backend Express API tasks and async BullMQ queue workers.
- Eliminates EC2 server management while providing auto-scaling across multiple Availability Zones.

#### 3. AWS ElastiCache for Redis
- Fully managed Redis cluster powering backend state caching and **BullMQ** async job queues.
- Secured within private subnets and accessible exclusively by ECS container tasks.

#### 4. AWS Application Load Balancer (ALB)
- Distributes incoming HTTPS traffic across ECS task containers.
- Conducts automated health monitoring via `/api/health`.

---

## 9. AI Services & External Repositories

InteriorAI Studio connects to dedicated AI model micro-services and inference pipelines for specialized generation, image editing, and depth estimation tasks.

### Connected AI Model Repositories & Services

| AI Service / Capability | Description & Model Architecture | Repository / Service Target |
| :--- | :--- | :--- |
| **Room Restyle & Furnishing Pipeline** | ControlNet / Stable Diffusion micro-service taking input room photos, prompt parameters, and design presets to generate photorealistic interior variations. | [InteriorAI Generation Backend Repository](https://github.com/MayankKhoria2007/IITI-SOC-26-AI-ML-023.git) |
| **3D Depth Estimation Service** | Monocular depth map estimation (MiDaS / Depth Anything / ZoeDepth) generating 16-bit depth textures for interactive Three.js 3D room rendering. | [InteriorAI Depth Estimation Micro-Service](https://github.com/MayankKhoria2007/IITI-SOC-26-AI-ML-023.git) |
| **Inpainting & Region Mask Editor** | Mask-guided Stable Diffusion Inpainting service for region-level furniture editing and targeted room redesign. | [InteriorAI Inpainting & Mask Pipeline](https://github.com/MayankKhoria2007/IITI-SOC-26-AI-ML-023.git) |

---

## 10. Local Development & Setup Guide

### Prerequisites
- Node.js (v18+) & `npm`
- PostgreSQL database (Local or Cloud instance)
- Redis server (Local or Docker container)
- Clerk account credentials
- Cloudinary account credentials

### Environment Setup

#### 1. Backend Configuration (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/interiorai?schema=public"
CLERK_SECRET_KEY=sk_test_...
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
REDIS_URL="redis://localhost:6379"
```

#### 2. Frontend Configuration (`.env` in root)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:5000/api
```

### Installation Steps

1. **Clone the Repository & Install Root Dependencies**:
   ```bash
   npm install
   ```

2. **Install & Setup Backend**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   ```

3. **Run Backend Development Server**:
   ```bash
   npm run dev
   ```
   *Backend listens on [http://localhost:5000](http://localhost:5000)*

4. **Run Frontend Development Server**:
   ```bash
   # From root directory
   npm run dev
   ```
   *Frontend opens on [http://localhost:5173](http://localhost:5173)*
