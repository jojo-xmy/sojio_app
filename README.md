SOJIO – Smart Hotel Cleaning Management System

Overview
SOJIO is a hotel cleaning task management platform built with Next.js.
It streamlines cleaning operations through role-based task assignment, calendar-based scheduling, and real-time LINE notifications.
The system is designed for small to medium-sized hotels managing multiple properties and cleaning staff.

Key Features
•	LINE OAuth Authentication – Quick login with LINE accounts
•	Role-Based Access Control – Owner, Manager, and Cleaner roles
•	Task Scheduling – Visual calendar for managing cleaning tasks
•	LINE Notifications – Real-time task reminders and status updates
•	Hotel & Room Management – Support for multiple hotels and rooms
•	Analytics & Tracking – Task completion and performance overview

Tech Stack
•	Framework: Next.js 15 (App Router)
•	Database: Supabase (PostgreSQL)
•	Authentication: LINE Login + JWT
•	UI: React 19 + Tailwind CSS
•	State Management: Zustand
•	Calendar: React Big Calendar
•	Deployment: Vercel

Project Structure
hug_app/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication
│   │   ├── line/           # LINE integration
│   │   └── cron/           # Scheduled tasks
│   ├── dashboard/          # Main application pages
│   └── (auth)/             # Auth pages
├── components/             # React components
├── lib/                    # Utilities and services
├── store/                  # State management
├── types/                  # TypeScript types
├── supabase/               # Database schema and migrations
└── public/                 # Static assets

Environment Variables
Required environment variables:
•	NEXT_PUBLIC_SUPABASE_URL
•	NEXT_PUBLIC_SUPABASE_ANON_KEY
•	LINE_LOGIN_CHANNEL_ID
•	LINE_LOGIN_CHANNEL_SECRET
•	LINE_REDIRECT_URI
•	LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
•	LINE_MESSAGING_CHANNEL_SECRET
•	JWT_SECRET
•	CRON_SECRET
•	NOTIFICATION_API_KEY
•	NEXT_PUBLIC_SITE_URL
See ENV_TEMPLATE.md for details.

User Roles
Owner
•	Manage all hotels
•	Create and assign tasks
•	View global analytics
Manager
•	Manage assigned hotels
•	Review cleaning tasks
•	Send notifications to cleaners
Cleaner
•	Receive task notifications
•	Update task status
•	Upload completion photos
