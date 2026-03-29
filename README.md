# Vi-SlideS

**AI-powered adaptive classroom platform that tailors teaching based on student questions and cognitive analysis**

## Project Overview

Vi-SlideS revolutionizes teaching by making it question-driven and adaptive. After a brief 5-10 minute topic introduction, students submit questions that shape class direction. AI analyzes collective questions, providing teachers with real-time insights into class mood, motivation, and conceptual understanding. AI automatically addresses straightforward questions, allowing teachers to focus on complex queries requiring deeper explanation and personalized attention.

**Mentor:** Rohit Sharma

## Key Features

### Student Features
- Submit questions after topic introduction through real-time interface
- Choose anonymous or identified submissions
- Track question status (AI-answered vs teacher-addressed)

### AI Analysis
- Detects overall class mood by examining sentiment and tone
- Assesses motivation levels
- Classifies questions by cognitive level
- Extracts main themes and concerns
- Identifies learning gaps

### Smart Triage
- Auto-answerable questions get instant AI responses with relevant sources
- Complex questions route to teacher's prioritized dashboard

### Teacher Dashboard
- Real-time question overview
- Class insights (mood, motivation, knowledge gaps)
- AI-prioritized question queue
- Suggested teaching direction
- Review and override AI answers

## System Workflow

1. **Pre-class:** Teacher presents 5-10 minute overview; students submit questions
2. **AI Analysis:** System collects questions, classifies by complexity, analyzes sentiment for mood/motivation
3. **Response:** Straightforward questions get AI responses; complex questions route to teacher dashboard
4. **Post-class:** System generates analytics report; questions/answers archived for reference

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| AI/NLP | LLMs for question analysis and response generation |
| Real-time | WebSockets |

## Project Structure

```
vi-slides/
├── frontend/          # React + TypeScript + Vite
│   └── src/
│       ├── components/    # Reusable UI components
│       └── pages/         # Page components
│           └── teacher/   # Teacher-specific pages
│           └── student/   # student-specific pages
└── backend/           # Node.js + Express API
```

## Getting Started

### Installation

1. Clone the repository
```bash
git clone https://github.com/vivek-boini/vi-slides.git
cd vi-slides
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install backend dependencies
```bash
cd ../backend
npm install
```

4. Configure environment files

   **macOS / Linux:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   **Windows:**
   ```bash
   copy backend\.env.example backend\.env
   copy frontend\.env.example frontend\.env
   ```

Update `backend/.env` with your MongoDB Atlas connection string and JWT secret.

### Running the Application

**Frontend** (runs on http://localhost:5173)
```bash
cd frontend
npm run dev
```

**Backend** (runs on http://localhost:3000)
```bash
cd backend
npm run dev
```

## Auth + Role Routes

- `POST /api/auth/register` - register teacher or student account
- `POST /api/auth/login` - login and receive JWT
- `GET /api/auth/me` - fetch current user from JWT
- `GET /api/dashboard/teacher` - teacher-only dashboard payload
- `GET /api/dashboard/student` - student-only dashboard payload

## Contributing

### Branch Workflow

1. Create a new branch for each feature
```bash
git checkout -b feature/feature-name
```

2. Make your changes and commit
```bash
git add .
git commit -m "Add: feature description"
```

3. Push to your branch
```bash
git push origin feature/feature-name
```

4. Create a Pull Request to merge into `main`

### Branch Naming Convention
- `feature/` - New features (e.g., `feature/student-auth`)
- `fix/` - Bug fixes (e.g., `fix/session-routing`)
- `docs/` - Documentation updates

## Project Goals

- Transform traditional lectures into question-driven, adaptive learning experiences
- Provide real-time insights into student understanding and engagement
- Reduce teacher burden through automated responses for simple questions
- Enable teachers to focus on complex discussions and personalized attention
- Identify learning gaps early before they become ingrained
- Create data-driven teaching strategies based on question analysis
