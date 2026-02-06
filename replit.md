# FinTrack - Personal Finance & Task Management

## Overview
FinTrack is a comprehensive personal finance and task management web application. It allows users to track daily expenses, manage EMIs, set goals, create plans, and manage finances (debit/credit tracking).

## Project Structure

```
├── client/                  # Frontend React application
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── context/         # React context providers (Auth, Theme)
│       ├── hooks/           # Custom React hooks
│       ├── lib/             # Utility functions and API client
│       └── pages/           # Page components
├── backend/                # Backend Express application
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API route definitions (controllers)
│   ├── models/             # Mongoose models (data layer)
│   └── storage.ts          # MongoDB storage implementation
├── shared/                  # Shared code between frontend and backend
│   └── schema.ts            # TypeScript schemas and types (Zod)
└── design_guidelines.md     # UI/UX design guidelines
```

## Features

### Authentication
- User signup with name, email, phone, and password
- Login with phone number and password
- JWT-based authentication
- Protected routes with auth middleware

### Dashboard
- Financial overview with summary cards
- Total expenses, balance, credit, debit stats
- Pending goals overview
- Active EMIs display
- Recent expenses list

### Daily Expense Tracker
- Add, edit, and delete daily expenses
- Multiple expense items per day
- Auto-calculated totals
- Salary credited tracking
- Grand total and balance calculations

### EMI Management
- Create EMIs with title, start month, amount, and duration
- Auto-generated monthly payment schedule
- Mark individual payments as paid/unpaid
- Progress tracking with visual indicators
- Remaining amount auto-calculation

### Monthly Goals
- Add and track monthly goals
- Toggle between pending and completed status
- Separate views for pending and completed goals

### Plans
- Create and manage plans/ideas
- Toggle between worked and not worked status
- Edit and delete functionality

### Finance Management
- Track debit (money you owe)
- Track credit (money owed to you)
- Auto-calculated totals
- Net balance calculation

### Profile
- View and update personal information
- Account details display

## Tech Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Shadcn/ui component library
- TanStack Query for data fetching
- Wouter for routing
- React Hook Form with Zod validation

### Backend
- Node.js with Express
- TypeScript
- JWT for authentication
- bcryptjs for password hashing
- In-memory storage (can be extended to PostgreSQL)

## Environment Variables

Required:
- `SESSION_SECRET` - JWT secret key for authentication (must be set)

## Running the Application

The application starts automatically with `npm run dev` which:
1. Starts the Express backend server
2. Starts the Vite development server for the frontend
3. Both are served on port 5000

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with phone/password

### User
- `PUT /api/user/profile` - Update user profile

### Dashboard
- `GET /api/dashboard/stats` - Get financial statistics

### Expenses
- `GET /api/expenses` - List all expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Goals
- `GET /api/goals` - List all goals
- `POST /api/goals` - Create new goal
- `PATCH /api/goals/:id` - Update goal status
- `DELETE /api/goals/:id` - Delete goal

### EMIs
- `GET /api/emis` - List all EMIs
- `POST /api/emis` - Create new EMI
- `PATCH /api/emis/:id/schedule/:monthIndex` - Update EMI payment status
- `DELETE /api/emis/:id` - Delete EMI

### Plans
- `GET /api/plans` - List all plans
- `POST /api/plans` - Create new plan
- `PUT /api/plans/:id` - Update plan
- `PATCH /api/plans/:id` - Partial update plan
- `DELETE /api/plans/:id` - Delete plan

### Finance
- `GET /api/finance` - Get finance data
- `POST /api/finance/entry` - Add debit/credit entry
- `DELETE /api/finance/entry/:type/:index` - Remove entry

## Recent Changes
- January 2, 2026: Initial implementation with all core features
- Security: JWT secret now required from environment variable
