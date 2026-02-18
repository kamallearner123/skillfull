# EduCollab Self Assessment Feature Manual

This manual provides a comprehensive guide to understanding, using, and maintaining the Self Assessment feature within the EduCollab platform.

## 1. Feature Overview

The Self Assessment module allows students to evaluate their proficiency in various technical domains through timed quizzes. It tracks performance history, provides detailed result analysis, and offers visual feedback on answers.

### Key Capabilities
- **Domain Selection**: Choose from multiple technical domains (e.g., Data Engineering, Cloud/DevOps, AI/ML, Full Stack).
- **Timed Assessments**: Assessments are timed (default: 30 minutes) to simulate exam conditions.
- **Interactive Interface**: Easy-to-use question navigation, progress tracking, and submission process.
- **Detailed Reporting**: View question-by-question breakdowns of correct and incorrect answers.
- **Performance History**: Track scores and improvement over time.
- **Dashboard Statistics**: See total assessments completed, average score, and ranking among peers.

---

## 2. User Guide

### 2.1 Starting an Assessment
1.  Navigate to the **Self Assessment** page from the dashboard.
2.  In the "New Assessment" view, select a domain card (e.g., "Full Stack").
3.  Click **Start Assessment**. The timer will begin immediately.

### 2.2 Taking an Assessment
-   **Answering**: Click on an option to select your answer. The selected option will be highlighted in indigo.
-   **Navigation**: Use **Next Question** and **Previous** buttons to move through the quiz.
-   **Question Map**: Use the sidebar (on desktop) to jump to specific questions. Color codes indicate:
    -   *Blue*: Current Question
    -   *Light Blue*: Answered
    -   *Grey*: Unanswered
-   **Submission**: On the last question, click **Submit Assessment**.

### 2.3 Viewing Results
Upon submission, you will see a summary screen with:
-   **Score**: Your total score out of the total questions.
-   **Percentage**: Your score as a percentage.
-   **Status**: "Passed" (>= 50%) or "Needs Work".
-   **Detailed Report**: Scroll down to see each question, your answer (marked with Red X if wrong, Green Check if correct), and the correct answer.

### 2.4 Viewing History and Past Reports
1.  From the Self Assessment main page, click **View History**.
2.  A list of past attempts will be displayed with dates and scores.
3.  Click the **View Report** link next to any attempt to open the detailed result view for that specific assessment.

---

## 3. Developer Documentation

### 3.1 Backend Architecture (Django)

#### Models (`apps/assessments/models.py`)
-   **`AssessmentAttempt`**: Represents a single session/take of an assessment. Stores user, domain, score, and timestamps.
-   **`AssessmentQuestion`**: Links a `Question` to an `Attempt`. Stores the user's specific answer and whether it was correct.
-   **`Question`**: The question bank item (text, options, correct answer, difficulty).

#### API Endpoints (`apps/assessments/api.py`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/assessments/start` | Starts a new attempt. Selects questions based on domain rules. Returns `attempt_id` and questions (without correct answers). |
| `POST` | `/api/assessments/submit` | Submits answers. Calculates score, saves results, and returns summary stats. |
| `GET` | `/api/assessments/history` | Returns a list of the user's past completed attempts. |
| `GET` | `/api/assessments/stats` | Returns aggregate statistics (rank, average score, total finished). |
| `GET` | `/api/assessments/report/{id}` | **[New]** Returns full details of a completed attempt, including questions, user answers, and correct answers for review. |

### 3.2 Frontend Architecture (React/TypeScript)

#### Components
-   **`SelfAssessment.tsx`**: The main container component. Manages views (`history`, `selection`, `taking`).
    -   *State Management*: Handles `assessmentState` (current questions, answers, timer) and `view` switching.
    -   *Timer Logic*: Uses `useEffect` and `setInterval` for the countdown.
    -   *Report Viewing*: Reuses the 'taking' view in read-only mode to display results.
-   **`AssessmentHistoryView`**: A sub-component (defined within `SelfAssessment.tsx`) that renders the history table and handles "View Report" clicks.

#### Key Functions
-   `startAssessment(domain)`: Calls backend to initialize an attempt.
-   `submitAssessment()`: Sends user answers to backend and updates state with results.
-   `handleViewReport(result)`: Fetches detailed report from `/api/assessments/report/{id}` and populates the state to show the result screen.

### 3.3 Data Flow
1.  **User Starts**: Frontend requests `/start` -> Backend creates `AssessmentAttempt` & `AssessmentQuestions` -> Returns questions.
2.  **User Submits**: Frontend sends dictionary of `{question_id: answer}` to `/submit` -> Backend grades answers, updates `AssessmentAttempt` -> Returns score/feedback.
3.  **User Views History**: Frontend requests `/history` -> Backend lists attempts -> API returns summary array.
4.  **User Views Report**: Frontend requests `/report/{id}` -> Backend assembles questions + user answers + correct answers -> Frontend renders detailed view.
