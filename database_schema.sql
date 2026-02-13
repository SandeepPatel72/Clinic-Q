-- Clinic-Q OPD Management Database Schema
-- PostgreSQL Database Setup Script
-- Version 1.50
-- Last Updated: February 8, 2026

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS patient CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS plan_inquiries CASCADE;
DROP TABLE IF EXISTS complaint_tags CASCADE;
DROP TABLE IF EXISTS diagnosis_tags CASCADE;
DROP TABLE IF EXISTS medicine_tags CASCADE;
DROP TABLE IF EXISTS app_sett CASCADE;

-- =============================================
-- PATIENT MASTER TABLE
-- =============================================
-- Stores unique patient information (can lookup by mobile)
-- Same mobile can have multiple patients (family members)
CREATE TABLE patient (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    city VARCHAR(255),
    mobile VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- VISITS TABLE
-- =============================================
-- Each clinic visit is a separate record
-- Links to patient master via patient_id for returning patients
-- Includes vitals (bp, temperature, pulse, weight, spo2)
-- Complaints, diagnosis, prescription stored as JSONB arrays
CREATE TABLE visits (
    id VARCHAR(50) PRIMARY KEY,
    queue_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    city VARCHAR(100),
    mobile VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    in_time TIMESTAMP WITH TIME ZONE,
    out_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    medicines TEXT,
    has_unread_alert BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    patient_id INTEGER REFERENCES patient(id),
    bp VARCHAR(20),
    temperature NUMERIC,
    pulse INTEGER,
    weight NUMERIC,
    spo2 INTEGER,
    complaints JSONB DEFAULT '[]'::jsonb,
    diagnosis JSONB DEFAULT '[]'::jsonb,
    prescription JSONB DEFAULT '[]'::jsonb,
    advice TEXT,
    follow_up_date DATE
);

-- =============================================
-- MESSAGES TABLE
-- =============================================
-- Chat messages between operator and doctor for each patient
CREATE TABLE messages (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL,
    timestamp BIGINT NOT NULL
);

-- =============================================
-- EVENTS TABLE
-- =============================================
-- Calendar events for doctors and operators
-- Event types: NORMAL, OPERATION, VISIT, HOSPITAL RELATED, SOCIAL
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'NORMAL',
    remind_me BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PLAN INQUIRIES TABLE
-- =============================================
-- Stores pricing plan inquiry submissions from the marketing website
CREATE TABLE plan_inquiries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    address TEXT,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    days INTEGER DEFAULT 0,
    amount INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- COMPLAINT TAGS TABLE
-- =============================================
-- Auto-learning complaint suggestions for doctor consultation
CREATE TABLE complaint_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DIAGNOSIS TAGS TABLE
-- =============================================
-- Auto-learning diagnosis suggestions for doctor consultation
CREATE TABLE diagnosis_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- MEDICINE TAGS TABLE
-- =============================================
-- Auto-learning medicine name suggestions for prescriptions
CREATE TABLE medicine_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- APP SETTINGS TABLE
-- =============================================
-- Application license/subscription settings
CREATE TABLE app_sett (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    recharge_value NUMERIC NOT NULL DEFAULT 900,
    day_cost NUMERIC NOT NULL DEFAULT 30,
    number_of_days INTEGER NOT NULL DEFAULT 30,
    end_date DATE NOT NULL
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_mobile ON visits(mobile);
CREATE INDEX idx_patient_mobile ON patient(mobile);
CREATE INDEX idx_patient_name ON patient(name);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_messages_patient_id ON messages(patient_id);
CREATE INDEX idx_plan_inquiries_email ON plan_inquiries(email);
CREATE INDEX idx_plan_inquiries_mobile ON plan_inquiries(mobile);

-- =============================================
-- VERIFY SETUP
-- =============================================
-- Run this to verify all tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- You should see 9 tables: patient, visits, messages, events, plan_inquiries,
-- complaint_tags, diagnosis_tags, medicine_tags, app_sett

-- =============================================
-- TABLE REFERENCE
-- =============================================
-- 
-- patient: Master patient records
--   - id: Auto-increment primary key
--   - Used for patient lookup by mobile number
--   - Returning patients reuse existing records
--
-- visits: Each clinic visit
--   - id: UUID string
--   - queue_id: Daily queue number (resets each day)
--   - status: WAITING | OPD | COMPLETED
--   - category: PATIENT | VISITOR
--   - type: GEN PATIENT | REF PATIENT | REL PATIENT | FAMILY | RELATIVE | MR
--   - sort_order: Controls queue ordering for WAITING patients
--   - patient_id: Links to patient master table
--   - Vitals: bp, temperature, pulse, weight, spo2
--   - complaints/diagnosis/prescription: JSONB arrays for structured medical data
--   - advice: Doctor's advice text
--   - follow_up_date: Next follow-up date
--
-- messages: Real-time chat
--   - sender: OPERATOR | DOCTOR
--   - patient_id: Links to visits.id (CASCADE delete)
--
-- events: Calendar
--   - event_type: NORMAL | OPERATION | VISIT | HOSPITAL RELATED | SOCIAL
--   - remind_me: Shows notification dot on calendar menu
--   - created_by: OPERATOR | DOCTOR
--
-- plan_inquiries: Marketing website plan inquiries
--   - plan_type: FREE TRIAL | STARTER PLAN | PROFESSIONAL PLAN | PAID SUPPORT PLAN
--   - days: Plan duration in days
--   - amount: Plan cost amount
--
-- complaint_tags: Auto-learning complaint suggestions for doctor consultation
--   - name: Unique complaint tag name
--   - usage_count: Tracks how often the tag is used for sorting suggestions
--
-- diagnosis_tags: Auto-learning diagnosis suggestions for doctor consultation
--   - name: Unique diagnosis tag name
--   - usage_count: Tracks how often the tag is used for sorting suggestions
--
-- medicine_tags: Auto-learning medicine name suggestions for prescriptions
--   - name: Unique medicine name
--   - usage_count: Tracks how often the medicine is used for sorting suggestions
--
-- app_sett: Application license/subscription settings (start_date, end_date, recharge details)
--   - start_date/end_date: License validity period
--   - recharge_value: Cost per recharge
--   - day_cost: Daily cost calculation
--   - number_of_days: Recharge duration in days
--
-- NOTES:
-- - All TIMESTAMP columns are TIMESTAMP WITH TIME ZONE for IST timezone support
-- - Data reset feature clears: visits, patient, messages, events, complaint_tags, diagnosis_tags
--   (preserves: plan_inquiries, medicine_tags, app_sett)

-- =============================================
-- END OF SCHEMA
-- =============================================
