-- Clinic-Q Database Backup
-- Generated: February 11, 2026
-- Version: 1.50

-- =============================================
-- DROP EXISTING TABLES (if running fresh)
-- =============================================

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
-- CREATE TABLES
-- =============================================

-- Patient Master Table (stores unique patient information)
CREATE TABLE patient (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    city VARCHAR(255),
    mobile VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visits Table (each clinic visit record with vitals and prescriptions)
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

-- Messages Table (chat messages for patient communication)
CREATE TABLE messages (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL,
    timestamp BIGINT NOT NULL
);

-- Events Table (calendar events)
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

-- Plan Inquiries Table (marketing website plan submissions)
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

-- Complaint Tags Table (auto-learning complaint suggestions)
CREATE TABLE complaint_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Diagnosis Tags Table (auto-learning diagnosis suggestions)
CREATE TABLE diagnosis_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medicine Tags Table (auto-learning medicine name suggestions)
CREATE TABLE medicine_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- App Settings Table (application license/subscription settings)
CREATE TABLE app_sett (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    recharge_value NUMERIC NOT NULL DEFAULT 900,
    day_cost NUMERIC NOT NULL DEFAULT 30,
    number_of_days INTEGER NOT NULL DEFAULT 30,
    end_date DATE NOT NULL
);

-- =============================================
-- CREATE INDEXES
-- =============================================

CREATE INDEX idx_patient_mobile ON patient(mobile);
CREATE INDEX idx_patient_name ON patient(name);

CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_mobile ON visits(mobile);

CREATE INDEX idx_messages_patient_id ON messages(patient_id);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_created_by ON events(created_by);

CREATE INDEX idx_plan_inquiries_email ON plan_inquiries(email);
CREATE INDEX idx_plan_inquiries_mobile ON plan_inquiries(mobile);

-- =============================================
-- INSERT DATA - PATIENT MASTER (57 rows)
-- =============================================

INSERT INTO patient (id, name, age, gender, city, mobile, created_at) VALUES
(1, 'Anand Ratnani', 25, 'Male', 'New York', NULL, '2026-01-26 10:01:20.523+00'),
(2, 'Arunaben Limbani', 25, 'Female', 'New York', NULL, '2026-01-26 10:01:46.073+00'),
(3, 'BHARAT PATEL', 25, 'Male', 'New York', '903333656652', '2026-01-26 09:59:46.895+00'),
(4, 'Bajaj Jindal', 25, 'Male', 'New York', NULL, '2026-01-27 06:25:00.658+00'),
(5, 'Bhavin Thakkar', 25, 'Male', 'New York', '9845124578', '2026-01-27 03:15:56.155+00'),
(6, 'Binal Patel', 32, 'Female', 'New York', NULL, '2026-01-27 03:16:16.31+00'),
(7, 'Chetan Rudani', 32, 'Male', 'Toronto', '9865326598', '2026-01-26 10:00:04.865+00'),
(8, 'David Mayor', 25, 'Male', 'New York', '989898', '2026-01-27 05:13:39.232+00'),
(9, 'David Tendulkar', 25, 'Male', 'New York', '15515151', '2026-01-27 06:04:32.9+00'),
(10, 'Deena Vasani', 25, 'Female', 'New York', NULL, '2026-01-26 10:03:19.061+00'),
(11, 'Denish Patel', 25, 'Male', 'New York', '9865321245', '2026-01-28 16:06:28.008+00'),
(12, 'Hetal Bhagat', 25, 'Male', 'New York', NULL, '2026-01-27 03:16:54.381+00'),
(13, 'Maya Ben Prajapati', 25, 'Female', 'Paris', NULL, '2026-01-27 06:42:49.154+00'),
(14, 'Mayur Patel', 43, 'Female', 'Tokyo', '444444', '2026-01-27 05:14:34.326+00'),
(15, 'Mayur Patel Bhimani', 25, 'Male', 'Sydney', NULL, '2026-01-28 17:28:54.861+00'),
(16, 'Pankaj Lawyer', 25, 'Male', 'New York', NULL, '2026-01-27 05:14:21.765+00'),
(17, 'Pankaj Singa', 25, 'Male', 'New York', NULL, '2026-01-26 10:01:32.053+00'),
(18, 'Praveen patekl', 25, 'Male', 'New York', NULL, '2026-01-27 06:25:10.777+00'),
(19, 'Pushpa bhau', 25, 'Male', 'New York', NULL, '2026-01-27 06:42:35.974+00'),
(20, 'Sandeep Patel', 25, 'Male', 'New York', '09033338800', '2026-01-27 06:25:32.569+00'),
(21, 'Suresh Nayani', 25, 'Male', 'New York', NULL, '2026-01-26 10:02:43.105+00'),
(22, 'TVISHAA PATEL', 25, 'Female', 'New York', NULL, '2026-01-26 10:00:57.107+00'),
(23, 'Vijay Manani', 25, 'Male', 'New York', '1245789865', '2026-01-27 03:16:08.306+00'),
(24, 'Vipul Sudhar', 25, 'Male', 'Sydney', '9865326598', '2026-01-26 10:00:19.143+00'),
(25, 'Vishal Jain M', 25, 'Male', 'New York', NULL, '2026-01-27 06:21:41.59+00'),
(26, 'VAIDIK SANDEEP BHAGAT', 25, 'Male', 'Berlin', '9098653265', '2026-01-30 08:01:52.319+00'),
(27, 'Mittal Shah', 22, 'Female', 'Toronto', '1234567890', '2026-01-30 08:11:02.539+00'),
(28, 'Vishah K Patel', 25, 'Male', 'Singapore', '1000010000', '2026-01-30 08:13:08.295+00'),
(29, 'Mittal Tendulkar', 25, 'Female', 'Paris', '15515151', '2026-01-30 10:19:33.223+00'),
(30, 'Vishal Manani', 30, 'Male', 'Toronto', '9427513371', '2026-01-30 11:35:36.975+00'),
(31, 'Vaishali Patel', 29, 'Female', 'Dhavda', '9033886600', '2026-02-01 18:52:07.512+00'),
(32, 'Meet D Pandya', 33, 'Male', 'Paris', '7359852000', '2026-02-01 18:52:44.799+00'),
(33, 'Divyesh Panchal', 37, 'Male', 'Tokyo', '1234567890', '2026-02-01 19:15:11.486+00'),
(34, 'Manisha Dev Patel', 22, 'Female', 'Dubai', '4564564560', '2026-02-01 19:19:05.717+00'),
(35, 'Jayesh Manani', 33, 'Male', 'New York', '9879879870', '2026-02-01 19:20:03.784+00'),
(36, 'Parthi Varsani', 36, 'Male', 'Sydney', NULL, '2026-02-01 19:20:41.21+00'),
(37, 'Mayur BHAGAT', 34, 'Male', 'Dhavda', '9427513366', '2026-02-02 07:25:59.884+00'),
(38, 'Denisha Jain', 33, 'Female', 'Dubai', '9090909090', '2026-02-03 04:23:59.694+00'),
(39, 'Mayank Patidar', 25, 'Male', 'Toronto', '9494949494', '2026-02-03 04:24:27.865+00'),
(40, 'Shruti Limbani', 41, 'Female', 'Paris', '9595959595', '2026-02-03 04:24:51.923+00'),
(41, 'Manilal Nayani', 25, 'Male', 'Berlin', '9494158578', '2026-02-03 06:23:09.807+00'),
(42, 'Vishal Kesharani', 25, 'Male', 'New York', '9639639630', '2026-02-03 09:43:00.249+00'),
(43, 'Test Patient', 30, 'Male', 'Ahmedabad', '9876543210', '2026-02-06 10:33:35+00'),
(44, '9066906600', 25, 'Female', 'Paris', 'Mitali Sing', '2026-02-06 10:35:54.697+00'),
(45, 'Piyush Varma', 30, 'Male', 'Tokyo', '9033334444', '2026-02-07 07:15:25.192+00'),
(46, 'Dinial K. Rupala', 36, 'Male', 'Dubai', '9494158745', '2026-02-07 07:15:49.446+00'),
(47, 'Vipul D. Parasiya', 36, 'Male', 'Nakhatrana - નખત્રાણા', '9725013371', '2026-02-07 18:58:34.881+00'),
(48, 'Vipul Karsariya', 27, 'Male', 'Berlin', '9475094750', '2026-02-07 19:31:22.146+00'),
(49, 'Bhagwatiben Patel', 35, 'Female', 'London', '8080707050', '2026-02-07 19:36:21.939+00'),
(50, 'Suresh B Surani', 36, 'Male', 'Vithon', '9696969696', '2026-02-07 20:05:29.167+00'),
(51, 'Rushil Darji', 18, 'Male', NULL, '7359852000', '2026-02-08 08:05:42.781+00'),
(52, 'Raiyalal K Bhagat', 63, 'Male', 'Tokyo', '9427094279', '2026-02-08 08:28:02.129+00'),
(53, 'Harshaben Limbani', 34, 'Female', 'Toronto', '9797250010', '2026-02-08 08:33:05.044+00'),
(54, 'Bhavin B Surani', 35, 'Male', 'Dhavda - ધાવડા', '9878997899', '2026-02-08 08:37:48.397+00'),
(55, 'Mittal D Vyas', 27, 'Male', 'Mumbai', '5689562356', '2026-02-08 08:50:04.089+00'),
(56, 'Bhavik R Ruparel', 42, 'Male', 'Dubai', '9797599990', '2026-02-08 08:51:59.852+00'),
(57, 'Mulshankar Devilal Mali', 45, 'Male', 'Sydney', '9494558899', '2026-02-08 14:46:16.066+00');

-- Reset the sequence to continue after the last inserted ID
SELECT setval('patient_id_seq', (SELECT MAX(id) FROM patient));

-- =============================================
-- INSERT DATA - COMPLAINT TAGS (6 rows)
-- =============================================

INSERT INTO complaint_tags (id, name, usage_count, created_at) VALUES
(1, 'Headache', 8, '2026-02-07 19:54:11.585292+00'),
(2, 'Fever', 8, '2026-02-07 19:55:36.48219+00'),
(5, 'Allergy', 1, '2026-02-07 20:07:56.750635+00'),
(15, 'Vomiting', 2, '2026-02-08 08:51:27.311647+00'),
(20, 'Sore Throat', 2, '2026-02-08 14:53:31.069256+00'),
(21, 'Hearing Loss', 2, '2026-02-08 14:53:31.072938+00');

-- Reset the sequence to continue after the last inserted ID
SELECT setval('complaint_tags_id_seq', (SELECT MAX(id) FROM complaint_tags));

-- =============================================
-- INSERT DATA - DIAGNOSIS TAGS (5 rows)
-- =============================================

INSERT INTO diagnosis_tags (id, name, usage_count, created_at) VALUES
(1, 'Yellow Fever', 7, '2026-02-07 19:54:11.588082+00'),
(3, 'Thyroide', 1, '2026-02-07 20:07:56.753009+00'),
(8, 'Liver Infection', 2, '2026-02-08 08:51:27.313214+00'),
(11, 'Tonsil stones', 1, '2026-02-08 14:48:20.72896+00'),
(12, 'Cancer in Tongue', 2, '2026-02-08 14:53:31.08427+00');

-- Reset the sequence to continue after the last inserted ID
SELECT setval('diagnosis_tags_id_seq', (SELECT MAX(id) FROM diagnosis_tags));

-- =============================================
-- INSERT DATA - MEDICINE TAGS (8 rows)
-- =============================================

INSERT INTO medicine_tags (id, name, usage_count, created_at) VALUES
(1, 'Paracitamol', 2, '2026-02-07 19:54:11.591253+00'),
(2, 'Ciplox', 1, '2026-02-07 19:54:11.594125+00'),
(3, 'Nioxinatone', 6, '2026-02-07 19:55:36.4989+00'),
(4, 'Ciplox D200', 1, '2026-02-07 20:07:56.764285+00'),
(5, 'Pimotrex OZ', 1, '2026-02-07 20:07:56.767192+00'),
(10, 'Ciplex 200', 1, '2026-02-08 08:51:27.31651+00'),
(13, 'Moxiflame Azure 10mg', 1, '2026-02-08 14:48:20.731787+00'),
(14, 'Prexilenia ZS', 2, '2026-02-08 14:53:31.086965+00');

-- Reset the sequence to continue after the last inserted ID
SELECT setval('medicine_tags_id_seq', (SELECT MAX(id) FROM medicine_tags));

-- =============================================
-- INSERT DATA - APP SETTINGS (1 row)
-- =============================================

INSERT INTO app_sett (id, start_date, recharge_value, day_cost, number_of_days, end_date) VALUES
(1, '2026-02-08', 900, 30, 30, '2026-03-08');

-- Reset the sequence to continue after the last inserted ID
SELECT setval('app_sett_id_seq', (SELECT MAX(id) FROM app_sett));

-- =============================================
-- INSERT DATA - VISITS (61 rows)
-- =============================================

INSERT INTO visits (id, queue_id, name, age, gender, category, type, city, mobile, status, created_at, in_time, out_time, notes, medicines, has_unread_alert, sort_order, patient_id, bp, temperature, pulse, weight, spo2, complaints, diagnosis, prescription, advice, follow_up_date) VALUES
('b5cd8de4-a1e5-4f0d-930c-3a14f0e868be', 1, 'BHARAT PATEL', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '903333656652', 'COMPLETED', '2026-01-26 09:59:46.895+00', '2026-01-26 09:59:46.895+00', '2026-01-26 10:00:42.255+00', 'Blood Report', 'Medicine 12', false, 0, 3, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('70a4fac5-226f-483c-b3bc-45992fac7381', 2, 'Chetan Rudani', 32, 'Male', 'PATIENT', 'REF PATIENT', 'Toronto', '9865326598', 'WAITING', '2026-01-26 10:00:04.865+00', '2026-01-26 10:00:04.865+00', NULL, NULL, NULL, false, 1, 7, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('ca730db7-d8a6-4e28-a5b3-18b9f2b47f83', 0, 'Vipul Sudhar', 25, 'Male', 'VISITOR', 'RELATIVE', 'Sydney', '9865326598', 'COMPLETED', '2026-01-26 10:00:19.143+00', '2026-01-26 10:00:19.143+00', '2026-01-26 10:01:12.397+00', NULL, NULL, false, 0, 24, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('6df3e013-1614-4402-89b9-bf76f46050f6', 3, 'TVISHAA PATEL', 25, 'Female', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'COMPLETED', '2026-01-26 10:00:57.107+00', '2026-01-26 10:00:57.107+00', '2026-01-26 10:03:11.936+00', NULL, NULL, false, 0, 22, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('5afd8109-db29-457d-bf25-1cff69c84395', 4, 'Anand Ratnani', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'WAITING', '2026-01-26 10:01:20.523+00', '2026-01-26 10:01:20.523+00', NULL, NULL, NULL, false, 2, 1, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('7bb9025c-518a-4c47-892c-21d94b960099', 0, 'Pankaj Singa', 25, 'Male', 'VISITOR', 'MR', 'New York', NULL, 'WAITING', '2026-01-26 10:01:32.053+00', '2026-01-26 10:01:32.053+00', NULL, NULL, NULL, false, 4, 17, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('7347fea1-5c6c-4c60-9a86-5893282ee6b2', 0, 'Arunaben Limbani', 25, 'Female', 'VISITOR', 'FAMILY', 'New York', NULL, 'COMPLETED', '2026-01-26 10:01:46.073+00', '2026-01-26 10:01:46.073+00', '2026-01-26 11:34:09.342+00', NULL, NULL, false, 0, 2, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('72cbea05-d979-4953-8440-3cdcd7e925d8', 5, 'Suresh Nayani', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'WAITING', '2026-01-26 10:02:43.105+00', '2026-01-26 10:02:43.105+00', NULL, NULL, NULL, false, 3, 21, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('ad867b25-fc54-424a-bba3-ee595138d647', 6, 'Deena Vasani', 25, 'Female', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'WAITING', '2026-01-26 10:03:19.061+00', '2026-01-26 10:03:19.061+00', NULL, NULL, NULL, false, 5, 10, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('e4c2fcc1-1f9d-4ed3-a0e5-2d8e1aaeaa8a', 1, 'Bhavin Thakkar', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '9845124578', 'COMPLETED', '2026-01-27 03:15:56.155+00', '2026-01-27 03:15:56.155+00', '2026-01-27 06:38:04.378+00', NULL, NULL, false, 0, 5, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('b120d721-4a9b-4b6f-85e8-c662a7ba4cb5', 2, 'Vijay Manani', 25, 'Male', 'PATIENT', 'REF PATIENT', 'New York', '1245789865', 'COMPLETED', '2026-01-27 03:16:08.306+00', '2026-01-27 03:16:08.306+00', '2026-01-27 05:14:00.159+00', NULL, NULL, false, 0, 23, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('23d0b8b1-7afe-43f6-bd7a-017ecaa1312d', 3, 'Binal Patel', 32, 'Female', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'COMPLETED', '2026-01-27 03:16:16.31+00', '2026-01-27 03:16:16.31+00', '2026-01-27 05:13:14.81+00', NULL, NULL, true, 0, 6, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('3ee03693-ce2b-4b10-b7f8-a0957342a8c5', 0, 'Hetal Bhagat', 25, 'Male', 'VISITOR', 'FAMILY', 'New York', NULL, 'COMPLETED', '2026-01-27 03:16:54.381+00', '2026-01-27 03:16:54.381+00', '2026-01-27 05:13:23.445+00', NULL, NULL, false, 0, 12, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('042839aa-efce-4b07-b52d-44df8de1e90a', 4, 'David Mayor', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '989898', 'COMPLETED', '2026-01-27 05:13:39.232+00', '2026-01-27 05:13:39.232+00', '2026-01-27 05:13:42.255+00', NULL, NULL, false, 0, 8, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('28c5a7b8-dd9f-4cb0-b079-bc6ce048597b', 5, 'Pankaj Lawyer', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'COMPLETED', '2026-01-27 05:14:21.765+00', '2026-01-27 05:14:21.765+00', '2026-01-27 05:14:44.689+00', NULL, NULL, false, 0, 16, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('94fb54b0-4985-49f8-86f9-a1a9526d4299', 6, 'Mayur Patel', 43, 'Female', 'PATIENT', 'GEN PATIENT', 'Tokyo', '444444', 'COMPLETED', '2026-01-27 05:14:34.326+00', '2026-01-27 05:14:34.326+00', '2026-01-27 05:16:26.111+00', NULL, NULL, false, 0, 14, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('cd75afe5-4b18-47e1-abe7-1309fbbf0ed5', 7, 'David Tendulkar', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '15515151', 'COMPLETED', '2026-01-27 06:04:32.9+00', '2026-01-27 06:04:32.9+00', '2026-01-27 06:04:37.783+00', NULL, NULL, false, 0, 9, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('63145892-1d50-4813-82ce-7a8943b5c7c2', 8, 'Vishal Jain M', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'COMPLETED', '2026-01-27 06:21:41.59+00', '2026-01-27 06:21:41.59+00', '2026-01-27 06:21:52.808+00', NULL, NULL, false, 0, 25, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('7c99b587-e3cc-4bd7-99fc-4b57270dd3d6', 9, 'Bajaj Jindal', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'COMPLETED', '2026-01-27 06:25:00.658+00', '2026-01-27 06:25:00.658+00', '2026-01-27 06:25:17.656+00', NULL, NULL, false, 0, 4, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('d1abc216-0481-495c-9e1b-f326f551cc3b', 10, 'Praveen patekl', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'COMPLETED', '2026-01-27 06:25:10.777+00', '2026-01-27 06:25:10.777+00', '2026-01-27 06:42:21.811+00', NULL, NULL, false, 0, 18, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('56b2fdfb-4f52-4843-bda8-f6bbe89fe274', 11, 'Sandeep Patel', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '09033338800', 'COMPLETED', '2026-01-27 06:25:32.569+00', '2026-01-27 06:25:32.569+00', '2026-01-27 06:34:21.94+00', NULL, NULL, false, 0, 20, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('abf11798-751b-4f4a-a6af-4dd6ffc7a758', 12, 'Pushpa bhau', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', NULL, 'COMPLETED', '2026-01-27 06:42:35.974+00', '2026-01-27 06:42:35.974+00', '2026-01-27 10:42:36.176+00', NULL, NULL, false, 0, 19, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('9b4de867-4b9b-4199-a5a5-ed719cd44580', 13, 'Maya Ben Prajapati', 25, 'Female', 'PATIENT', 'GEN PATIENT', 'Paris', NULL, 'OPD', '2026-01-27 06:42:49.154+00', '2026-01-27 06:42:49.154+00', NULL, NULL, NULL, false, 0, 13, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('d61ed78b-97ba-4791-b2c2-06cb74b0a1b4', 1, 'Denish Patel', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '9865321245', 'COMPLETED', '2026-01-28 16:06:28.008+00', '2026-01-28 16:06:28.008+00', '2026-01-28 17:55:09.502+00', NULL, NULL, false, 0, 11, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('ba09e673-2a85-43e1-8275-deee402db931', 2, 'Mayur Patel Bhimani', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'Sydney', NULL, 'COMPLETED', '2026-01-28 17:28:54.861+00', '2026-01-28 17:28:54.861+00', '2026-01-28 17:34:19.216+00', NULL, NULL, false, 0, 15, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('0c2a3e42-459d-4001-b832-f5b60f96a685', 1, 'VAIDIK SANDEEP BHAGAT', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'Berlin', '9098653265', 'COMPLETED', '2026-01-30 08:01:52.319+00', '2026-01-30 08:01:52.319+00', '2026-01-30 08:12:39.855+00', 'Sugar Level 122', 'Paracetamol 30', false, 0, 26, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('a2292ef7-88a7-4c07-a94f-e0e05bb7da33', 2, 'Mittal Shah', 23, 'Female', 'PATIENT', 'GEN PATIENT', 'Toronto', '1234567890', 'COMPLETED', '2026-01-30 08:11:02.539+00', '2026-01-30 08:11:02.539+00', '2026-01-30 11:34:59.293+00', NULL, NULL, false, 0, 27, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('ffa294c4-5a80-47b6-a2ed-c6f3002dc6e1', 0, 'Vishah K Patel', 25, 'Male', 'VISITOR', 'MR', 'Singapore', '1000010000', 'COMPLETED', '2026-01-30 08:13:08.295+00', '2026-01-30 08:13:08.295+00', '2026-01-30 11:29:26.298+00', NULL, NULL, false, 0, 28, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('d49da2f2-37df-4531-a4df-52cdbd7dff1b', 3, 'Mittal Tendulkar', 25, 'Female', 'PATIENT', 'GEN PATIENT', 'Paris', '15515151', 'COMPLETED', '2026-01-30 10:19:33.223+00', '2026-01-30 10:19:33.223+00', '2026-01-30 18:04:05.307+00', NULL, NULL, false, 0, 29, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('5daf2088-4269-4120-9351-4d55ce507d9d', 4, 'Vishal Manani', 30, 'Male', 'PATIENT', 'GEN PATIENT', 'Toronto', '9427513371', 'OPD', '2026-01-30 11:35:36.975+00', '2026-01-30 11:35:36.975+00', NULL, NULL, NULL, false, 0, 30, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('1da30a81-5150-410a-bbac-43b5b72e3f0b', 1, 'VAIDIK SANDEEP BHAGAT', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'Berlin', '9098653265', 'COMPLETED', '2026-02-01 18:30:15.671+00', '2026-02-01 18:30:15.671+00', '2026-02-01 18:31:11.629+00', E'Sugar Level : 140\nBP : High\nWeight : 63kg', E'Tab. Paracetamol 1-0-1\nSyrup. Doughex   10-10-10', false, 0, 26, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('4f4f2df2-61c2-4ec1-bb65-ae224f2d906a', 2, 'Vaishali Patel', 29, 'Female', 'PATIENT', 'GEN PATIENT', 'Dhavda', '9033886600', 'COMPLETED', '2026-02-01 18:52:07.512+00', '2026-02-01 18:52:07.512+00', '2026-02-01 19:15:41.422+00', NULL, NULL, false, 0, 31, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('7134856c-14a8-44d1-883d-5ff02ae1549c', 3, 'Meet D Pandya', 33, 'Male', 'PATIENT', 'REL PATIENT', 'Paris', '7359852000', 'OPD', '2026-02-01 18:52:44.799+00', '2026-02-01 18:52:44.799+00', NULL, NULL, NULL, false, 0, 32, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('a169c9e0-324c-495c-bd74-8c7ed852b42f', 4, 'Divyesh Panchal', 37, 'Male', 'PATIENT', 'GEN PATIENT', 'Tokyo', '1234567890', 'WAITING', '2026-02-01 19:15:11.486+00', '2026-02-01 19:15:11.486+00', NULL, NULL, NULL, false, 1, 33, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('70a75554-1ce2-4b84-a21c-36fc1c2aaf96', 5, 'Manisha Dev Patel', 22, 'Female', 'PATIENT', 'GEN PATIENT', 'Dubai', '4564564560', 'WAITING', '2026-02-01 19:19:05.717+00', '2026-02-01 19:19:05.717+00', NULL, NULL, NULL, false, 2, 34, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('584eac09-44b8-461e-a4bc-bc8b8af88aa7', 0, 'Jayesh Manani', 33, 'Male', 'VISITOR', 'SOCIAL', 'New York', '9879879870', 'COMPLETED', '2026-02-01 19:20:03.784+00', '2026-02-01 19:20:03.784+00', '2026-02-01 19:21:51.749+00', NULL, NULL, false, 0, 35, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('4a077a56-f8ce-4082-a1bc-fa5b344295b4', 6, 'Parthi Varsani', 36, 'Male', 'PATIENT', 'GEN PATIENT', 'Sydney', NULL, 'WAITING', '2026-02-01 19:20:41.21+00', '2026-02-01 19:20:41.21+00', NULL, NULL, NULL, false, 3, 36, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('7aa46525-d20f-4248-97f7-08578c1a71f2', 1, 'Mayur BHAGAT', 34, 'Male', 'PATIENT', 'GEN PATIENT', 'Dhavda', '9427513366', 'COMPLETED', '2026-02-02 07:25:59.884+00', '2026-02-02 07:25:59.884+00', '2026-02-02 07:31:48.557+00', NULL, NULL, false, 0, 37, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('d0c7089e-09d9-4dee-a485-3fcc01f074b4', 1, 'Vishal Manani', 30, 'Male', 'PATIENT', 'GEN PATIENT', 'Toronto', '9427513371', 'COMPLETED', '2026-02-03 04:23:21.311+00', '2026-02-03 04:23:21.311+00', '2026-02-03 04:26:50.829+00', NULL, NULL, false, 0, 30, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('29bf2f56-4057-47de-9b5d-2d419a37c562', 2, 'Denisha Jain', 33, 'Female', 'PATIENT', 'REF PATIENT', 'Dubai', '9090909090', 'COMPLETED', '2026-02-03 04:23:59.694+00', '2026-02-03 04:23:59.694+00', '2026-02-03 04:28:37.843+00', E'BP 210\nWeight 52kg', 'Paracetamol 52x30 Days', false, 0, 38, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('29177d07-038e-486b-bead-329d4854b3b3', 0, 'Mayank Patidar', 25, 'Male', 'VISITOR', 'VISITOR', 'Toronto', '9494949494', 'COMPLETED', '2026-02-03 04:24:27.865+00', '2026-02-03 04:24:27.865+00', '2026-02-03 09:50:13.391+00', NULL, NULL, false, 0, 39, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('a7331e15-225f-47f5-9dd8-999699c09c39', 3, 'Shruti Limbani', 41, 'Female', 'PATIENT', 'GEN PATIENT', 'Paris', '9595959595', 'COMPLETED', '2026-02-03 04:24:51.923+00', '2026-02-03 04:24:51.923+00', '2026-02-03 14:15:42.8+00', 'Blood Pressure 150', 'Cornex Plus Syr 1x0x1', false, 0, 40, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('f6b2a885-3ce8-415a-846e-eb1ce60f1801', 4, 'Manilal Nayani', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'Berlin', '9494158578', 'COMPLETED', '2026-02-03 06:23:09.807+00', '2026-02-03 06:23:09.807+00', '2026-02-03 08:27:39.773+00', NULL, NULL, false, 0, 41, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('ddb5b3e9-5c04-4b66-95ce-f6033aa5ec89', 5, 'Denish Patel', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '9865321245', 'COMPLETED', '2026-02-03 08:18:00.94+00', '2026-02-03 08:18:00.94+00', '2026-02-03 08:26:08.849+00', E'Fever, Headache and Bloss Loss', 'Rx Paracetamol 32 2x0x2', false, 0, 11, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('efb51f1d-20e0-4564-aa67-ca001e56d9b8', 6, 'VAIDIK SANDEEP BHAGAT', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'Berlin', '9098653265', 'COMPLETED', '2026-02-03 08:26:49.211+00', '2026-02-03 08:26:49.211+00', '2026-02-03 09:50:26.594+00', E'BP is now Level\nWeight 3 kg Loss', E'Parabolic Syrup 2--0--2\n', false, 0, 26, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('bb906cc2-abd7-423f-9958-a0b47cb9eddd', 7, 'Vishal Kesharani', 25, 'Male', 'PATIENT', 'GEN PATIENT', 'New York', '9639639630', 'COMPLETED', '2026-02-03 09:43:00.249+00', '2026-02-03 09:43:00.249+00', '2026-02-03 10:41:10.523+00', NULL, NULL, false, 0, 42, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('add07bdb-fd9b-4601-b498-26c09b33f269', 1, 'Vishal Manani', 30, 'Male', 'PATIENT', 'GEN PATIENT', 'Toronto', '9427513371', 'COMPLETED', '2026-02-04 06:52:10.341+00', '2026-02-04 06:52:10.341+00', '2026-02-04 09:32:17.407+00', E'Fever with 103\nVomiting 2 times', 'Rx Paracetamol 2x2x2', false, 0, 30, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('56294009-ce85-44c2-b923-1cc75a79da7f', 1, 'Mitali Patidar', 25, 'Female', 'PATIENT', 'GEN PATIENT', 'Paris', '9066906600', 'COMPLETED', '2026-02-06 10:35:54.697+00', '2026-02-06 10:35:54.697+00', '2026-02-06 10:46:48.844+00', E'No Fever\nInflamation', 'Replix 12-x-12', true, 0, 44, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('d36c0e1c-2d23-4f8e-85ba-c5222dacdd6f', 1, 'Piyush Varma', 30, 'Male', 'PATIENT', 'GEN PATIENT', 'Tokyo', '9033334444', 'COMPLETED', '2026-02-07 07:15:25.192+00', '2026-02-07 07:15:25.192+00', '2026-02-07 15:39:13.422+00', E'Fever 102\nBP 138', 'Paracetamol Tab 32 5 Days', false, 0, 45, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('10a0ade9-8423-459b-be8a-ed2c1ab84103', 2, 'Dinial K. Rupala', 36, 'Male', 'PATIENT', 'GEN PATIENT', 'Dubai', '9494158745', 'COMPLETED', '2026-02-07 07:15:49.446+00', '2026-02-07 07:15:49.446+00', '2026-02-07 13:59:07.893+00', NULL, NULL, false, 0, 46, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('5757f776-7718-442b-aa17-88bb6796bdd2', 3, 'Denisha Jain', 33, 'Female', 'PATIENT', 'GEN PATIENT', 'Dubai', '9090909090', 'COMPLETED', '2026-02-07 13:47:26.982+00', '2026-02-07 13:47:26.982+00', '2026-02-07 14:12:54.014+00', NULL, NULL, false, 0, 38, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('7dceff79-eb34-4033-9908-4507bb45a0e8', 4, 'Shruti Limbani', 41, 'Female', 'PATIENT', 'GEN PATIENT', 'Paris', '9595959595', 'COMPLETED', '2026-02-07 15:40:37.357+00', '2026-02-07 15:40:37.357+00', '2026-02-07 18:35:15.415+00', NULL, NULL, false, 0, 40, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('52c48104-8049-41bb-8463-fe3b866d0902', 0, 'Vipul D. Parasiya', 36, 'Male', 'VISITOR', 'VISITOR', 'Nakhatrana - નખત્રાણા', '9725013371', 'COMPLETED', '2026-02-07 18:58:34.881+00', '2026-02-07 18:58:34.881+00', '2026-02-07 20:42:45.918+00', NULL, NULL, false, 0, 47, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('b8873a69-edec-4d41-87b9-505c0ebaf2f4', 1, 'Bhagwatiben Patel', 35, 'Female', 'PATIENT', 'GEN PATIENT', 'London', '8080707050', 'COMPLETED', '2026-02-07 19:36:21.939+00', '2026-02-07 19:36:21.939+00', '2026-02-08 14:46:42.893+00', NULL, NULL, false, 0, 49, '120/82', 99.0, 84, 72.0, 99, '["Fever", "Headache"]'::jsonb, '["Yellow Fever"]'::jsonb, '[{"days": "1", "dose": "1", "name": "Nioxinatone", "type": "Inj", "instructions": "After Food"}]'::jsonb, NULL, '2026-02-14'),
('66139adb-6fe4-4d62-9dd1-6e7a65fb7320', 2, 'Suresh B Surani', 36, 'Male', 'PATIENT', 'GEN PATIENT', 'Vithon', '9696969696', 'COMPLETED', '2026-02-07 20:05:29.167+00', '2026-02-07 20:05:29.167+00', '2026-02-08 08:43:47.192+00', NULL, NULL, false, 0, 50, NULL, NULL, NULL, NULL, NULL, '["Fever", "Allergy"]'::jsonb, '["Thyroide"]'::jsonb, '[{"days": "8", "dose": "1-0-1", "name": "Ciplox D200", "type": "Tab", "instructions": "Before Food"}, {"days": "8", "dose": "0-0-1", "name": "Pimotrex OZ", "type": "Drops", "instructions": "After Food"}]'::jsonb, NULL, '2026-02-16'),
('f493ad88-94a2-46bc-99ae-165142da4d2d', 3, 'Raiyalal K Bhagat', 63, 'Male', 'PATIENT', 'GEN PATIENT', 'Tokyo', '9427094279', 'COMPLETED', '2026-02-08 08:28:39.049+00', '2026-02-08 08:28:39.049+00', '2026-02-08 08:57:54.408+00', NULL, NULL, false, 0, 52, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL),
('eec8cae0-0c66-46a0-bd41-2ec513ccf9ad', 4, 'Harshaben Limbani', 34, 'Female', 'PATIENT', 'GEN PATIENT', 'Toronto', '9797250010', 'COMPLETED', '2026-02-08 08:33:05.044+00', '2026-02-08 08:33:05.044+00', '2026-02-08 08:51:27.587+00', NULL, NULL, false, 0, 53, '118/36', 98.0, 88, 69.0, 99, '["Fever", "Vomiting"]'::jsonb, '["Liver Infection"]'::jsonb, '[{"days": "7", "dose": "1-0-1", "name": "Ciplex 200", "type": "Tab", "instructions": "After Food"}]'::jsonb, NULL, '2026-02-15'),
('a495f333-15a2-4062-a714-720903b1a343', 5, 'Bhavin B Surani', 35, 'Male', 'PATIENT', 'GEN PATIENT', 'Dhavda - ધાવડા', '9878997899', 'COMPLETED', '2026-02-08 08:37:48.397+00', '2026-02-08 08:37:48.397+00', '2026-02-08 10:13:02.728+00', NULL, NULL, false, 0, 54, NULL, NULL, NULL, NULL, NULL, '["Headache"]'::jsonb, '["Liver Infection"]'::jsonb, '[{"days": "10", "dose": "0-1-0", "name": "Paracitamol", "type": "Tab", "instructions": "After Food"}]'::jsonb, NULL, '2026-02-16'),
('5ae3a9cc-ebf5-4b17-8ee4-27f889b9bf42', 6, 'Mittal D Vyas', 27, 'Male', 'PATIENT', 'GEN PATIENT', 'Mumbai', '5689562356', 'COMPLETED', '2026-02-08 08:50:04.089+00', '2026-02-08 08:50:04.089+00', '2026-02-08 14:48:20.815+00', NULL, NULL, false, 0, 55, '80/120', 99.9, 84, 54.0, 94, '["Vomiting"]'::jsonb, '["Tonsil stones"]'::jsonb, '[{"days": "12", "dose": "1-0-1", "name": "Moxiflame Azure 10mg", "type": "Tab", "instructions": "After Food"}]'::jsonb, NULL, '2026-02-16'),
('e989fb8e-02f6-4895-b4a3-a35be1901258', 7, 'Bhavik R Ruparel', 42, 'Male', 'PATIENT', 'GEN PATIENT', 'Dubai', '9797599990', 'COMPLETED', '2026-02-08 08:51:59.852+00', '2026-02-08 08:51:59.852+00', '2026-02-08 15:00:21.278+00', NULL, NULL, false, 0, 56, '80/120', 98.6, 78, 66.0, 96, '["Sore Throat", "Hearing Loss"]'::jsonb, '["Cancer in Tongue"]'::jsonb, '[{"days": "5", "dose": "5", "name": "Prexilenia ZS", "type": "Inj", "instructions": "As Directed"}]'::jsonb, 'Take Warm Luke water and Kimo Therapy', '2026-02-23'),
('83a12e45-06d6-4128-ab2e-6f87c0338b1d', 8, 'Mulshankar Devilal Mali', 45, 'Male', 'PATIENT', 'GEN PATIENT', 'Sydney', '9494558899', 'COMPLETED', '2026-02-08 14:46:16.066+00', '2026-02-08 14:46:16.066+00', '2026-02-08 14:53:34.649+00', NULL, NULL, false, 0, 57, NULL, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL);

-- =============================================
-- INSERT DATA - EVENTS (6 rows)
-- =============================================

INSERT INTO events (id, title, event_date, event_time, description, event_type, remind_me, created_by, created_at, updated_at) VALUES
(1, 'Visit to Hospital Opening', '2026-01-31', '06:30:00', 'Visit to KD Hospital opening. Invited by DR. Shah', 'VISIT', true, 'OPERATOR', '2026-01-30 12:03:59.340302+00', '2026-01-30 12:03:59.340302+00'),
(3, 'Meeting with Dr. Sinha', '2026-01-30', '22:05:00', 'Dr Sinha at Zydus Meeting', 'VISIT', true, 'OPERATOR', '2026-01-30 15:09:33.006483+00', '2026-01-30 15:09:33.006483+00'),
(4, 'Operation Schedule for Mayank', '2026-02-03', '20:05:00', 'Mr. Mayank Patidar', 'OPERATION', true, 'OPERATOR', '2026-02-03 04:27:38.660483+00', '2026-02-03 12:35:25.374699+00'),
(5, 'Tvishaa Birthday', '2026-02-21', '18:00:00', NULL, 'NORMAL', false, 'OPERATOR', '2026-02-03 14:17:54.489518+00', '2026-02-03 14:17:54.489518+00'),
(6, 'Hetal Birthday', '2026-02-12', '20:50:00', 'Hetal Birthday at Sankus Hotel', 'NORMAL', true, 'OPERATOR', '2026-02-03 14:18:26.474078+00', '2026-02-03 14:18:26.474078+00'),
(7, 'Today Event to mall', '2026-02-06', '20:15:00', 'Mall VIsit for Purchase', 'VISIT', false, 'OPERATOR', '2026-02-06 10:41:52.572626+00', '2026-02-06 10:41:52.572626+00');

-- Reset the sequence to continue after the last inserted ID
SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));

-- =============================================
-- INSERT DATA - PLAN INQUIRIES (1 row)
-- =============================================

INSERT INTO plan_inquiries (id, name, hospital_name, address, mobile, email, plan_type, days, amount, created_at) VALUES
(3, 'Mayank Patel', 'Jivan Shree Orthopedic', E'Main Bazar, Sola\nNr. Vasukaka, Gota', '9878986599', 'doc.123@gmail.com', 'PAID SUPPORT PLAN', 30, 750, '2026-02-06 06:22:26.461435+00');

-- Reset the sequence to continue after the last inserted ID
SELECT setval('plan_inquiries_id_seq', (SELECT MAX(id) FROM plan_inquiries));

-- =============================================
-- INSERT DATA - MESSAGES (14 rows)
-- =============================================

INSERT INTO messages (id, patient_id, text, sender, timestamp) VALUES
('81b2dd6d-ddfc-4c12-a7c0-ca10e06feed6', '5afd8109-db29-457d-bf25-1cff69c84395', 'hi', 'OPERATOR', 1769421933827),
('a1c6b4c8-c091-482b-bd84-d15053df5013', '5afd8109-db29-457d-bf25-1cff69c84395', 'Bolo', 'DOCTOR', 1769421946436),
('995b6219-f987-448e-9af3-8729c2454aad', '23d0b8b1-7afe-43f6-bd7a-017ecaa1312d', 'Report', 'DOCTOR', 1769490774277),
('3340a2a9-8417-407e-9647-5dc8fd45703c', '23d0b8b1-7afe-43f6-bd7a-017ecaa1312d', 'OK', 'OPERATOR', 1769490779260),
('756443ab-498c-4e7d-99ce-df6c949efc86', 'd61ed78b-97ba-4791-b2c2-06cb74b0a1b4', 'YES', 'OPERATOR', 1769616400923),
('eb110ec2-7265-416a-8f91-18d41872f4f3', 'ffa294c4-5a80-47b6-a2ed-c6f3002dc6e1', 'Bolo', 'OPERATOR', 1769760827414),
('24d5e928-472b-4768-929a-657e0db309ec', 'ffa294c4-5a80-47b6-a2ed-c6f3002dc6e1', 'OK', 'DOCTOR', 1769760836063),
('29777570-bf2f-491d-b36e-be9aec1299e3', 'efb51f1d-20e0-4564-aa67-ca001e56d9b8', 'ok', 'OPERATOR', 1770122158903),
('3ef9c937-3556-4104-88ce-3673c82e80ed', 'efb51f1d-20e0-4564-aa67-ca001e56d9b8', 'NICE', 'DOCTOR', 1770122166298),
('ef952e83-23d0-4b44-a086-2d8af62f1ebf', 'add07bdb-fd9b-4601-b498-26c09b33f269', 'hi', 'OPERATOR', 1770197365261),
('d6004b5c-fb05-4706-b60d-97258282e3fb', 'add07bdb-fd9b-4601-b498-26c09b33f269', 'ok', 'DOCTOR', 1770197371630),
('922cf240-984d-40f3-b6e0-8bf63b0ad4d9', '56294009-ce85-44c2-b923-1cc75a79da7f', 'ok', 'OPERATOR', 1770374764336),
('b1fa42b8-c125-4940-ae6c-0005c0d6f13c', '56294009-ce85-44c2-b923-1cc75a79da7f', 'ok', 'DOCTOR', 1770374781689),
('d0559850-a4b9-4b29-8d41-cd30ef6b0d3a', '5ae3a9cc-ebf5-4b17-8ee4-27f889b9bf42', 'Blood Report', 'DOCTOR', 1770541352048);

-- =============================================
-- VERIFY DATA
-- =============================================

-- Expected row counts after import:
-- patient: 57 rows
-- visits: 61 rows
-- messages: 14 rows
-- events: 6 rows
-- plan_inquiries: 1 row
-- complaint_tags: 6 rows
-- diagnosis_tags: 5 rows
-- medicine_tags: 8 rows
-- app_sett: 1 row
-- Total: 159 rows

-- Uncomment to verify after import:
-- SELECT 'patient' AS table_name, COUNT(*) AS row_count FROM patient
-- UNION ALL SELECT 'visits', COUNT(*) FROM visits
-- UNION ALL SELECT 'messages', COUNT(*) FROM messages
-- UNION ALL SELECT 'events', COUNT(*) FROM events
-- UNION ALL SELECT 'plan_inquiries', COUNT(*) FROM plan_inquiries
-- UNION ALL SELECT 'complaint_tags', COUNT(*) FROM complaint_tags
-- UNION ALL SELECT 'diagnosis_tags', COUNT(*) FROM diagnosis_tags
-- UNION ALL SELECT 'medicine_tags', COUNT(*) FROM medicine_tags
-- UNION ALL SELECT 'app_sett', COUNT(*) FROM app_sett;

-- =============================================
-- END OF BACKUP
-- =============================================
