
# Multiplayer Tic-Tac-Toe

## Overview

This project implements a **deployable, server-authoritative multiplayer Tic-Tac-Toe game** that supports:

* Real-time **two-player online matches**
* Single-player mode: **Play with Bot (CPU)**
* Global **Leaderboard** tracking wins, losses, and draws
* **Deployed frontend (Vercel)** and **backend (Render)**

Both backend and frontend are designed to demonstrate scalability, real-time communication, and clean separation between game logic and UI.

---

## Live Demo

* **Play Game:** [https://tic-tac-toe-multiplayer-chi.vercel.app](https://tic-tac-toe-multiplayer-chi.vercel.app)
* **Backend API:** [https://tic-tac-toe-multiplayer-ug7u.onrender.com](https://tic-tac-toe-multiplayer-ug7u.onrender.com)
* **Health Check:** [https://tic-tac-toe-multiplayer-ug7u.onrender.com/health](https://tic-tac-toe-multiplayer-ug7u.onrender.com/health)

---

## Features

**Server-authoritative gameplay**
The server manages and validates every move, ensuring fairness and preventing cheating.

**Matchmaking system**
Players can join random opponents in real time.

**Bot mode (CPU)**
Single-player mode to allow immediate gameplay without waiting for another player.

**Leaderboard tracking**
Persistent leaderboard (SQLite) stores player stats across sessions.

**WebSocket communication**
Real-time game updates via `ws://` and `wss://`.

**Deployed backend (Render)**
Backend hosted as Node.js + Express + WebSocket service.

**Deployed frontend (Vercel)**
Frontend built with React Native for web using Expo, hosted on Vercel.

---

## Tech Stack

| Layer             | Technology                                  |
| ----------------- | ------------------------------------------- |
| **Frontend**      | React Native (Expo Web), JavaScript         |
| **Backend**       | Node.js, Express.js, WebSocket              |
| **Database**      | SQLite (via `sqlite3`)                      |
| **Deployment**    | Render (server) & Vercel (client)           |
| **Communication** | WebSockets (`ws` library)                   |
| **Language**      | TypeScript (backend), JavaScript (frontend) |

---

## Architecture

### High-Level Flow

```
+-------------+        WebSocket (wss)        +-----------------+
|   Frontend  |  <--------------------------> |     Backend     |
|  (Vercel)   |                               |   (Render)      |
+-------------+                               +-----------------+
       ↑                                               |
       |             REST (HTTPS)                      |
       +---------------------------------------------->|
                          /leaderboard
                          /health
```

### Backend Responsibilities

* Manage matchmaking queue
* Maintain server-side game state
* Validate player moves
* Handle bot (CPU) logic
* Update SQLite leaderboard

### Frontend Responsibilities

* Render UI & game grid
* Connect via WebSocket for real-time gameplay
* Allow “Play with Friend”, “Play with Bot”, and “View Leaderboard”
* Show results and restart options

---

## Folder Structure

```
tic-tac-toe-multiplayer/
├── client/               # React Native (Expo) frontend
│   ├── App.js
│   ├── package.json
│   └── ...
└── server/               # Node.js + Express + WS backend
    ├── src/
    │   └── index.ts
    ├── dist/             # Compiled output
    ├── package.json
    ├── tsconfig.json
    └── leaderboard.db
```

---

## Run Locally

### Backend

```bash
cd server
npm install
npm run dev
```

Server runs on → `http://localhost:8080`
Test: `http://localhost:8080/health`

### Frontend

```bash
cd client
npm install
npm run start
```

Press **w** to open in browser.
App runs at → `http://localhost:8081`

---

## Deployment Info

| Component    | Platform | URL                                                                                                    |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| **Frontend** | Vercel   | [https://tic-tac-toe-multiplayer-chi.vercel.app](https://tic-tac-toe-multiplayer-chi.vercel.app)       |
| **Backend**  | Render   | [https://tic-tac-toe-multiplayer-ug7u.onrender.com](https://tic-tac-toe-multiplayer-ug7u.onrender.com) |

---

## Design Choices

### 1. Server-Authoritative Game Logic

The backend is the single source of truth for all game states, preventing clients from making unauthorized moves or manipulating the board.

### 2. Stateless Client

Clients act only as renderers of state updates — they send actions (`make_move`) and receive updates (`state_update`) via WebSocket.

### 3. Real-Time Communication

WebSockets (`ws` library) provide low-latency, bidirectional communication between server and clients.

### 4. Bot Mode

A lightweight AI opponent (“CPU”) plays automatically after the player’s move using random valid moves for simplicity.

### 5. Leaderboard Persistence

Leaderboard stored in SQLite to track wins, losses, and draws.

---

## Security & Validation

* CORS enabled (`origin: '*'`) for frontend–backend communication
* Input validation and move ownership checks
* Prevents illegal or duplicate moves

---

## Author

**Abu Affan**

🎓 M.Tech CSE, NIT Rourkela

💻 Interests: Full-stack development, AI/ML, and real-time systems

---

## Deliverables

* **Deployed Game Link (Vercel):** [https://tic-tac-toe-multiplayer-chi.vercel.app](https://tic-tac-toe-multiplayer-chi.vercel.app)
* **Deployed Backend Link (Render):** [https://tic-tac-toe-multiplayer-ug7u.onrender.com](https://tic-tac-toe-multiplayer-ug7u.onrender.com)
* **Source Code:** [https://github.com/affan110/tic-tac-toe-multiplayer](https://github.com/affan110/tic-tac-toe-multiplayer)
* **README:** Design + Architecture included

---

## Summary

This project demonstrates a **complete real-time multiplayer game system** with:

* WebSocket-based synchronization
* Bot fallback
* Persistent leaderboard
* Scalable, deployable architecture

Built with ❤️ using **React Native**, **Node.js**, **WebSockets**, and **SQLite**.

---
