# ft_transcendence

![42 Logo](docs/readme/42_Logo.svg)

## 🎮 Project Overview

**ft_transcendence** is a full-stack web application featuring a competitive multiplayer gaming platform with user authentication, real-time chat, and tournament management. The project implements a scalable microservices architecture using Node.js with Fastify on the backend and a modern TypeScript + Tailwind CSS frontend.

---

## ✨ Key Features

### 🏆 Core Functionality
- **User Management**: Secure registration, login, profile management, and authentication
- **Multiplayer Games**: 
  - **Pong**: 3D paddle game with real-time gameplay
  - **Tris**: Strategic tile-based game
- **ELO Ranking System**: Dynamic player rankings based on wins/losses
- **Friend System**: Add friends and view online status
- **Match History**: Track all historical games with stats (wins, losses, dates)
- **Real-time Chat**: Instant messaging between users
- **Notifications**: Real-time event notifications

### 💻 Technical Excellence
- **Microservices Architecture**: Modular, scalable backend services
- **Real-time Communication**: WebSocket support for live updates
- **3D Graphics**: BabylonJS integration for enhanced visuals
- **Security**: HTTPOnly cookies, SQL injection prevention, XSS protection
- **Containerized Deployment**: Docker & docker-compose for easy deployment
- **SQLite Database**: Lightweight but powerful data persistence

---

## 🏗️ Architecture

### Backend Architecture
![Architecture Diagram](docs/readme/architecture.svg)

The backend is organized as a set of independent microservices coordinated through an API Gateway:

- **Gateway** (Port 3000): Central entry point, routes requests to appropriate services
- **Auth Service** (Port 3001): Handles user authentication and authorization
- **Users Service** (Port 3002): Manages user profiles, avatars, and friend relationships
- **Chat Service** (Port 3004): Real-time messaging service
- **Notification Service** (Port 3003): Handles event notifications
- **Pong Service** (Port 3005): Multiplayer Pong game logic
- **Tris Service** (Port 3006): Multiplayer Tris game logic

<br>

### Database Design
![Database Diagram](docs/readme/db_logical_design.svg)

SQLite database managing:
- User accounts and authentication
- Game results and statistics
- Match history and tournaments
- Friend relationships
- Chat messages
- Real-time notifications

---

## 🎯 User Management

### Username Requirements
- **Length**: 3-20 characters
- **Allowed Characters**: Letters, numbers, underscores (_), dots (.)
- **Format**: Must start with a letter
- **Case Sensitivity**: Not case-sensitive (case-insensitive)
- **Uniqueness**: Must be unique across the system

### Password Requirements
- **Length**: 8-24 characters minimum
- **Complexity**: Mix of uppercase, lowercase, numbers, and symbols
- **Common Passwords**: Disallowed (e.g., "password", "123456")

### User Features
- ✅ Secure registration and login with persistent sessions (HTTPOnly cookies)
- ✅ Profile updates and avatar uploads
- ✅ Friend management with online status tracking
- ✅ User statistics and match history
- ✅ Profile visibility to other users

---

## 📁 Project Structure

```
ft_transcendence/
├── backend/
│   ├── gateway/              # API Gateway
│   ├── services/
│   │   ├── auth/             # Authentication service
│   │   ├── users/            # User management service
│   │   ├── chat/             # Chat service
│   │   ├── notification/     # Notification service
│   │   ├── pong/             # Pong game service
│   │   └── tris/             # Tris game service
│   ├── Makefile
│   ├── docker-compose.yaml
│   └── generate_certs.sh
├── frontend/
│   ├── src/                  # TypeScript source code
│   ├── public/               # Static assets
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   └── Dockerfile
```
---

## 🔒 Security Features

- ✅ **HTTPOnly Cookies**: Secure session management
- ✅ **SQL Injection Prevention**: Parameterized queries throughout
- ✅ **XSS Protection**: Input sanitization and output encoding
- ✅ **CSRF Protection**: Token-based CSRF protection
- ✅ **Rate Limiting**: Prevent brute force and abuse
- ✅ **Secure Password Storage**: Hashed passwords using industry standards
- ✅ **HTTPS Support**: SSL/TLS certificates for secure communication

---

## �📚 Tech Stack

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: SQLite
- **Real-time**: WebSocket (Socket.IO)
- **Authentication**: JWT + HTTPOnly Cookies
- **Language**: JavaScript/Node.js

### Frontend
- **Framework**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D Graphics**: BabylonJS
- **Internationalization**: Intlayer

### DevOps
- **Containerization**: Docker
- **Orchestration**: docker-compose
- **Package Manager**: npm

---

## 📖 Documentation

- [Architecture Documentation](docs/backend/architecture.drawio)
- [Database Design](docs/backend/db_logical_design.drawio)
- [Swagger API Documentation](docs/backend/swagger_implementation.md)
