# EduCollab - SkillFull Platform

**EduCollab** (also known as SkillFull) is a comprehensive educational collaboration platform designed to bridge the gap between students, mentors, and placement opportunities. It features interactive learning modules, self-assessment tools, and mentorship management.

## 🚀 Features

### For Students
*   **Dashboard**: Overview of progress, upcoming events, and recommended modules.
*   **Self Assessment**: Take timed quizzes in various domains (Data Engineering, Full Stack, AI/ML, etc.) to evaluate skills. Detailed reports and history tracking included. [Read the Manual](./SELF_ASSESSMENT_MANUAL.md).
*   **Learning Modules**: Access curated learning content and track completion.
*   **Placement Assistance**: View and apply for job openings (Placementor integration).

### For Mentors
*   **Student Management**: Track student progress and assign tasks.
*   **Content Management**: Create and update learning modules.

### For Admins
*   **User Management**: Manage roles and permissions.
*   **System Configuration**: Configure platform settings.

## 🛠 Tech Stack

### Backend
*   **Framework**: Django (Python) with Django Ninja for API.
*   **Database**: SQLite (Development) / PostgreSQL (Production ready).
*   **Authentication**: JWT-based auth with HttpOnly cookies.

### Frontend
*   **Framework**: React (TypeScript) with Vite.
*   **Styling**: Tailwind CSS.
*   **Icons**: Lucide React.
*   **State Management**: React Hooks & Context API.

## 🏃‍♂️ Getting Started

### Prerequisites
*   Python 3.10+
*   Node.js 18+
*   npm or yarn

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
./start.sh
# Server runs at http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

## 📚 Documentation

*   [Self Assessment Feature Manual](./SELF_ASSESSMENT_MANUAL.md): Detailed guide on using and developing the assessment module.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
