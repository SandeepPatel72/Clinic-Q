# ClinicFlow Full-Stack Reproduction Prompt

This document contains instructions to rebuild the Full-Stack (React + Express + MySQL) edition.

## 1. System Identity
**Name:** ClinicFlow Full-Stack OPD Suite.
**Stack:** React (Frontend) | Express.js (Backend) | MySQL (Database).

## 2. Database Schema (MySQL)
- `patients` table: Primary storage for status, timestamps, and clinical notes.
- `messages` table: Relational storage for conversation logs linked via `patientId`.

## 3. Backend Logic (Node.js)
- Port: 3000.
- Features: CORS enabled, JSON body parsing, `mysql2/promise` pooling.
- API Design: Async CRUD endpoints for all patient lifecycle events.

## 4. Frontend Requirements
- Replace local `useState` only updates with async `fetch` calls to `http://localhost:3000/api`.
- Initial load must fetch the entire patient state from the server.
- Implement a loading state for database synchronization.

## 5. Visual Identity (Maintained)
- **Queue ID Badge:** Slate-900 with clear `#` spacing.
- **Patient Name:** `text-[1.15rem] font-bold uppercase`.
- **Radium Glow:** Pulsing indigo pulse for all visitor entries.
