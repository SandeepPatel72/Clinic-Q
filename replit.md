# Clinic-Q OPD Management

## Overview
Clinic-Q is a React-based outpatient department (OPD) management application designed to streamline clinic operations. It provides a queue management system with distinct interfaces for operators (patient registration) and doctors (consultation management). The project aims to enhance efficiency in outpatient departments through real-time communication, patient tracking, and reporting, with a strong focus on a user-friendly experience for clinic staff.

## User Preferences
- I want iterative development.
- I want to be asked before making major changes.

## System Architecture
Clinic-Q uses a modern web stack with React and TypeScript for the frontend, bundled with Vite. The UI is styled using Tailwind CSS for a responsive design. The application features separate views for operators and doctors, managing patient flow through "Waiting," "OPD," and "Completed" queues. Real-time communication and queue synchronization between users are achieved using Socket.IO.

Key features include:
- Patient registration and lookup by mobile number.
- Doctor consultation management with structured data entry for vitals, chief complaints, diagnosis, and prescriptions.
- Dynamic queue reordering for waiting patients and a public-facing Queue Display screen (`/display`) for waiting rooms with real-time updates.
- OPD status toggle (Pause/Resume) with configurable reasons, instantly reflected across all interfaces.
- An Event Calendar system with monthly and daily views, allowing event creation, editing, and deletion, with color-coded event types and real-time synchronization.
- Patient Report generation with search filters, date range selection, patient history lookup, and CSV export.
- Notifications, including a "Call Operator" feature for doctors and calendar notifications.
- UI/UX elements include gender-specific avatars, animated elements, optimized card layouts, and resizable dashboard columns with persistence.
- Patient history is accessible with previous visit details.
- Daily-based patient management where queues reset daily and queue numbers are assigned sequentially.
- Secure API authentication with token-based sessions and role-based access for doctors and operators.
- Customizable login credentials via `secretcred.json`.
- Dynamic application name and hospital name loaded from metadata.
- A static marketing website (`/site/`) with Home, About, Pricing, and Contact pages, consistent with Clinic-Q branding.
- Comprehensive statistics page with analytics like patient trends, gender ratio, patient vs. visitor, top cities, and busiest day.
- Print Prescription feature: generates A5-styled printable prescription page in a new tab with auto print dialog.

## Recent Changes
- 2026-02-08: Data Reset Feature
  - Added "Reset Data" button in app footer (visible only for Doctor on Report page)
  - Button uses TRUNCATE with RESTART IDENTITY CASCADE to clear visits, patient, messages, events, complaint_tags, diagnosis_tags
  - Preserves plan_inquiries, medicine_tags, and app_sett tables
  - Server-side role check ensures only Doctor role can execute the reset
  - Confirmation dialog before execution; page reloads after successful reset
- 2026-02-08: Print Prescription Feature
  - Added PRINT PRESCRIPTION button to Doctor Consultation Form (3-button layout: Print Prescription | Finalize | Close)
  - Opens new browser tab with A5-sized printable prescription page including hospital header, patient info, vitals, complaints, diagnosis, prescription table, advice, follow-up date, and doctor signature line
  - All user data HTML-escaped for security; dates formatted in IST timezone
- 2026-02-08: Follow-up Date Dropdown
  - Replaced date picker with dropdown: 5 Days, 7 Days, 8 Days, 15 Days, 1 Month
  - Backend calculates actual follow-up date (today + selected days) in IST and stores as DATE
- 2026-02-08: Timezone Fix — TIMESTAMP WITH TIME ZONE
  - All timestamp columns changed to TIMESTAMP WITH TIME ZONE; pg.Pool uses `-c timezone=Asia/Kolkata`

## External Dependencies
- **React**: Frontend library.
- **TypeScript**: Superset of JavaScript for type-safety.
- **Vite**: Build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **localStorage**: Browser-based data persistence.
- **Node.js/Express**: Backend server.
- **PostgreSQL**: Database for persistent storage.
- **Socket.IO**: Real-time bidirectional event-based communication.