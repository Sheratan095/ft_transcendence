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
- **Security**: HTTPOnly cookies, SQL injection prevention, XSS protection, Two-Factor Authentication (2FA)
- **Containerized Deployment**: Docker & docker-compose for easy deployment
- **SQLite Database**: Lightweight but powerful data persistence
- **Multi-language Support**: Support for multiple languages with responsive UI
- **Theme Support**: Light and dark mode themes for user preference
- **Statistics Dashboards**: User and game session analytics with data visualization
- **AI Opponent**: Intelligent AI player for single-player challenges

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
- ✅ Two-Factor Authentication (2FA) via email with time-based one-time passwords
- ✅ Profile updates and avatar uploads
- ✅ Friend management with online status tracking
- ✅ User statistics and match history
- ✅ Profile visibility to other users
- ✅ Searchable user profiles accessible from chat interface

---

## 🗪 Chat & Social Features

### Live Chat System
- ✅ **Direct Messaging**: Send direct messages to other users in real-time
- ✅ **User Blocking**: Block users to prevent further communication
- ✅ **Game Invitations**: Invite other users to play Pong directly from chat
- ✅ **Tournament Notifications**: Receive notifications about upcoming tournament games
- ✅ **Profile Access**: Access other players' profiles directly from chat interface
- ✅ **WebSocket Integration**: Real-time message delivery and notifications

---

## 🎮 Gaming Features

### Multiplayer Experience
- ✅ **Remote Multiplayer**: Play against remote opponents with optimized network handling
- ✅ **Lag Compensation**: Handles network issues and unexpected disconnections gracefully
- ✅ **AI Opponent**: Challenge an intelligent AI player that simulates human behavior
  - AI updates game view once per second and anticipates bounces
  - Can win matches against players
  - Adapts to different gameplay scenarios

### Game Statistics & Dashboards
- ✅ **User Statistics Dashboard**: View personal gaming statistics and performance metrics
- ✅ **Game Session Dashboard**: Detailed analytics with charts and graphs
- ✅ **Match History Tracking**: Complete game history with dates, opponents, and outcomes
- ✅ **Data Visualization**: Charts and graphs for intuitive statistics exploration
- ✅ **Performance Metrics**: Win/loss ratios, ELO progression, and custom metrics

---

## 📁 Project Structure

```
ft_transcendence/
├── backend/
│   ├── gateway/              # API Gateway
│   ├── services/
│   │   ├── auth/             # Authentication service (with 2FA)
│   │   ├── users/            # User management service
│   │   ├── chat/             # Chat service (real-time messaging)
│   │   ├── notification/     # Notification service
│   │   ├── pong/             # Pong game service (with AI)
│   │   └── tris/             # Tris game service
│   ├── Makefile
│   └── generate_certs.sh
├── frontend/
│   ├── src/                  # TypeScript source code
│   ├── public/               # Static assets
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   └── Dockerfile
├── start_prod.sh             # Script to generate certs and start docker
└── docker-compose.yaml
```
---

## 🔐 Authentication & Security

### Two-Factor Authentication (2FA)
- ✅ **Email-based 2FA**: Time-based one-time passwords (TOTP) sent via email
- ✅ **JWT Integration**: Secure token-based authentication
- ✅ **User-friendly Setup**: Easy enablement process for 2FA
- ✅ **Session Validation**: Secure JWT token validation on each request

### Security Features
- ✅ **HTTPOnly Cookies**: Secure session management
- ✅ **SQL Injection Prevention**: Parameterized queries throughout
- ✅ **XSS Protection**: Input sanitization and output encoding
- ✅ **CSRF Protection**: Token-based CSRF protection
- ✅ **Rate Limiting**: Prevent brute force and abuse
- ✅ **Secure Password Storage**: Hashed passwords using bcrypt/argon2
- ✅ **HTTPS Support**: SSL/TLS certificates for secure communication

---
## 🌍 Frontend Features

### Multi-Language Support
- ✅ **Multiple Languages**: Support for 3+ languages
- ✅ **Language Switcher**: Easy language selection from user interface
- ✅ **Intlayer Integration**: Localization library for seamless translations
- ✅ **User Preferences**: Default language persisted across sessions
- ✅ **Comprehensive Translation**: Essential content, menus, and UI elements translated

### Theme & Accessibility
- ✅ **Light/Dark Mode**: Toggle between light and dark themes
- ✅ **Theme Persistence**: User theme preference saved and restored
- ✅ **Responsive Design**: Works seamlessly across all screen sizes
- ✅ **Browser Compatibility**: Support for multiple web browsers (Chrome, Firefox, Safari, Edge)
- ✅ **Accessible UI**: WCAG compliance for improved accessibility

### User Interface
- ✅ **Tailwind CSS**: Modern, responsive styling framework
- ✅ **Vite Development**: Fast development server with hot module replacement
- ✅ **TypeScript**: Type-safe frontend development for reduced bugs
- ✅ **3D Visualization**: BabylonJS for immersive 3D gaming experience

---

## 🔐 GDPR Compliance

### User Data Privacy Rights
- ✅ **User Anonymization**: Request anonymization of personal data with game history preserved
- ✅ **Account Deletion**: Permanent account and data deletion
- ✅ **Data Export**: Download all personal data in machine-readable format (JSON/CSV)
- ✅ **Data Management**: View, edit, and manage personal information
- ✅ **Consent Management**: Clear consent tracking for data processing

### Data Protection Features
- ✅ **Privacy Policy**: Transparent communication about data collection
- ✅ **Data Transparency**: Clear information about what data is collected and why
- ✅ **Right to Erasure**: Complete data removal upon request
- ✅ **Right to Access**: Users can view all stored personal data
- ✅ **Right to Rectification**: Users can correct and update information
- ✅ **Compliance Logging**: Audit trail for all GDPR-related actions

For more information, visit the [official GDPR website](https://commission.europa.eu/law/law-topic/data-protection/data-protection-eu_en).

---
## �📚 Tech Stack

### Backend
- **Framework**: Fastify (Node.js)
- **Architecture**: Microservices with API Gateway
- **Database**: SQLite
- **Real-time**: WebSocket (Socket.IO)
- **Authentication**: JWT + HTTPOnly Cookies + 2FA (Email TOTP)
- **Language**: JavaScript/Node.js
- **Password Hashing**: bcrypt/argon2

### Frontend
- **Framework**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D Graphics**: BabylonJS
- **Internationalization**: Intlayer (3+ languages)
- **Theme Support**: Light/Dark Mode
- **Browser Support**: Chrome, Firefox, Safari, Edge

### DevOps
- **Containerization**: Docker
- **Orchestration**: docker-compose
- **Package Manager**: npm
- **SSL/TLS**: Self-signed certificates (development) or CA certificates (production)

---

## 🎯 Features Implementation Matrix

### Major Modules ✅
| Feature | Status | Details |
|---------|--------|---------|
| **Backend Framework** | ✅ | Fastify with Node.js microservices |
| **Remote Multiplayer** | ✅ | Real-time gameplay with lag compensation |
| **Additional Game** | ✅ | Tris game with history and matchmaking |
| **Live Chat** | ✅ | Real-time messaging with blocking & game invites |
| **2FA & JWT** | ✅ | Email-based 2FA with JWT authentication |
| **Microservices** | ✅ | Independent services via API Gateway |
| **AI Opponent** | ✅ | Intelligent AI with human-like behavior |
| **3D Graphics** | ✅ | BabylonJS for immersive Pong experience |

### Minor Modules ✅
| Feature | Status | Details |
|---------|--------|---------|
| **Frontend Framework** | ✅ | TypeScript + Tailwind CSS with Vite |
| **Database** | ✅ | SQLite for all data persistence |
| **Stats Dashboards** | ✅ | User and game session analytics |
| **GDPR Compliance** | ✅ | Anonymization, deletion, data export |
| **Browser Support** | ✅ | Multiple browser compatibility |
| **Multi-Language** | ✅ | 3+ language support with Intlayer |

---

## 📖 Documentation

- [Architecture Documentation](docs/backend/architecture.drawio)
- [Database Design](docs/backend/db_logical_design.drawio)
- [HTTP Status Codes](docs/backend/http_status_codes.md)
- [Swagger API Documentation](docs/backend/swagger_implementation.md)
- [Security Guidelines](docs/Security/sql_injection_prevention.md)
- [XSS Attack Prevention](docs/Security/xss_attack.txt)
- [Game Documentation](docs/Games/ELO.md)
- [GDPR Compliance](docs/gdpr.txt)
