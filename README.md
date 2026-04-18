# SOJIO – Smart Hotel Cleaning Management System

## Overview

SOJIO is a smart hotel cleaning task management system built with **Next.js**.  
It helps hotels efficiently manage cleaning workflows through role-based access control, calendar-based scheduling, and real-time **LINE notifications**.

The system is designed for small to medium-sized hotels managing multiple properties and cleaning staff.


## Key Features

- **LINE OAuth Authentication** – Login using LINE accounts  
- **Role-Based Access Control** – Owner, Manager, and Cleaner roles  
- **Task Scheduling** – Visual calendar for cleaning tasks  
- **LINE Notifications** – Real-time task reminders and status updates  
- **Hotel & Room Management** – Multiple hotels and rooms supported  
- **Analytics & Tracking** – Task completion and performance overview  


## Tech Stack

- **Framework**: Next.js 15 (App Router)  
- **Database**: Supabase (PostgreSQL)  
- **Authentication**: LINE Login + JWT

## System Architecture
### Database Schema
'''mermaid
erDiagram
    USERS ||--o{ HOTELS : "owns (as Owner)"
    USERS ||--o{ MANAGER_HOTELS : "managed_by (as Manager)"
    USERS ||--o{ TASKS : "assigned_to (as Cleaner)"
    
    HOTELS ||--o{ ROOMS : "contains"
    HOTELS ||--o{ MANAGER_HOTELS : "associated_with"
    
    ROOMS ||--o{ TASKS : "has_cleaning_records"
    ROOMS ||--o{ CALENDAR_ENTRIES : "scheduled_in"
    
    TASKS ||--o{ ATTACHMENTS : "includes (photos/logs)"

    USERS {
        uuid id PK
        string line_id UK "Unique LINE identifier"
        string role "owner | manager | cleaner"
        string name
        timestamp created_at
    }

    HOTELS {
        uuid id PK
        uuid owner_id FK "References USERS.id"
        string name
        string address
    }

    MANAGER_HOTELS {
        uuid manager_id FK "References USERS.id"
        uuid hotel_id FK "References HOTELS.id"
    }

    ROOMS {
        uuid id PK
        uuid hotel_id FK "References HOTELS.id"
        string room_number
    }

    TASKS {
        uuid id PK
        uuid room_id FK "References ROOMS.id"
        uuid cleaner_id FK "References USERS.id"
        string status "pending | in_progress | completed"
        date scheduled_date
        text manager_report_notes
    }

    CALENDAR_ENTRIES {
        uuid id PK
        uuid room_id FK "References ROOMS.id"
        date entry_date
        string type "check_in | check_out | stay_over"
    }'''
    
- **UI**: React 19 + Tailwind CSS  
- **State Management**: Zustand  
- **Calendar**: React Big Calendar  
- **Deployment**: Vercel  
