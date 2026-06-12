# Ticketing System

A simple ticketing system built with React, TypeScript, Material UI, and Supabase.

## Features

- User authentication (email/password)
- Create, view, and edit tickets
- **Image attachments** - Upload images (JPG, PNG, GIF, WebP) to tickets
- Assign tickets to users
- Track ticket status (Pending, In Progress, Closed)
- Filter tickets by status and severity
- **Dashboard statistics** - View ticket counts by status and severity
  - Active tickets count (excludes closed)
  - My active tickets count
  - Breakdown by status (Pending, In Progress, Closed)
  - Breakdown by severity (Low, Medium, High, Critical)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Material UI (MUI)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Go to the SQL Editor in your Supabase dashboard

3. Run the SQL from both migration files in order:
   - `supabase/migrations/001_initial_schema.sql` - Creates tables and policies
   - `supabase/migrations/002_add_image_support.sql` - Adds image storage support

4. Update the `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Database Schema

### Profiles Table
- `id` - UUID (linked to auth.users)
- `username` - Unique username
- `created_at` - Timestamp

### Tickets Table
- `id` - UUID
- `ticket_number` - Unique ticket identifier (format: YYYYMMDD_USERNAME_XXX)
- `title` - Ticket title
- `description` - Detailed description
- `severity` - low, medium, high, critical
- `status` - pending, in_progress, closed
- `created_by` - User who created the ticket
- `assigned_to` - User assigned to the ticket
- `image_url` - URL to attached image (optional)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Deployment to Vercel

### Option 1: Deploy via GitHub

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ticketing-system.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click "Add New Project" and import your GitHub repository

4. Add environment variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Run deployment:
   ```bash
   vercel
   ```

3. Follow the prompts and add environment variables when asked

### After Deployment

Make sure to update your Supabase project settings:
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add your Vercel deployment URL to the "Site URL" and "Redirect URLs"

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # Main layout with sidebar
│   └── ProtectedRoute.tsx  # Auth guard component
├── pages/
│   ├── Login.tsx           # Login/signup page
│   ├── Dashboard.tsx       # Main ticket list
│   ├── CreateTicket.tsx    # Create new ticket
│   ├── TicketDetail.tsx    # View/edit ticket
│   └── AssignedTickets.tsx # User's assigned tickets
├── lib/
│   └── supabase.ts         # Supabase client
├── types/
│   └── index.ts            # TypeScript types
├── App.tsx                 # Main app with routing
└── main.tsx                # Entry point
```
