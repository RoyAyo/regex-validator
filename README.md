## 🚀 Quick Start (Local with Docker Compose)

### ✅ Prerequisites
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### 🔧 Environment Setup
Update the `docker-compose.yml` file with the config as required.
OR
Create a `.env` file at the root with:

```env
REGEX_PATTERN=^[a-zA-Z0-9]+$
VALIDATION_DELAY_MS=2000
MONGODB_URI=mongodb://mongo:27017/regex-validator
REDIS_URL=redis://redis:6379
KAFKA_BROKER=kafka:9092
```
and use .env_file instead in the yml config.

> You may also modify `docker-compose.yml` to include these directly if preferred.

---

### 🧑‍💻 To Run:

```bash
docker compose up --build
```

Then open the frontend at [http://localhost:61234](http://localhost:61234)

---

## 🧱 Architecture Overview

### Monorepo Layout
```
/
├── backend/        NestJS app
├── frontend/       React app
├── docker-compose.yml
└── README.md
```

### Components

| Component | Description |
|----------|-------------|
| **React UI** | Submits strings, displays job history, receives real-time status updates |
| **NestJS API** | Handles job creation, job retrieval, emits updates to Socket.IO |
| **Kafka** | Buffers job validation requests asynchronously |
| **Validator Worker** | Kafka consumer, validates inputs, updates DB |
| **MongoDB** | Stores job metadata |
| **Redis** | Used by Socket.IO adapter for cross-instance communication |
| **Docker Compose** | Orchestrates all services inside an isolated network |

---

## 🔄 End-to-End Flow

1. **User submits input** via frontend HTTP `POST /jobs`.
2. **NestJS API**:
   - Stores job in MongoDB as `Validating`.
   - Publishes job to Kafka as job.update.
3. **Worker**:
   - Picks job from Kafka.
   - Delays using `VALIDATION_DELAY_MS`.
   - Validates against `REGEX_PATTERN`.
   - Updates MongoDB status.
   - Emits `jobUpdate` via Redis-backed Socket.IO.
4. **Frontend**:
   - Listens for real-time updates via Socket.IO.
   - UI updates job status accordingly.

---

## 📡 Real-Time Update Mechanism

- **Socket.IO Gateway (NestJS)**: Emits job status updates.
- **Frontend** subscribes to events:
  - `jobUpdate`