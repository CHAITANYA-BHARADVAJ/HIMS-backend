-- ============================================================
-- HIMS — Complete Supabase (PostgreSQL) Migration
-- Converted from MongoDB/Mongoose schemas (04-schemas.html)
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- or via supabase db push if using the CLI.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Helper: auto-update updated_at on every row change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ████████████████████████████████████████████████████████████
-- 1. PATIENT MANAGEMENT SERVICE  (was: patient_db)
-- ████████████████████████████████████████████████████████████

-- Enum types
CREATE TYPE gender_enum       AS ENUM ('male', 'female', 'other');
CREATE TYPE blood_group_enum  AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-');

-- Sequence for UHID auto-generation
CREATE SEQUENCE uhid_seq START 1;

CREATE TABLE patients (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uhid                    TEXT UNIQUE NOT NULL DEFAULT '',  -- auto-filled by trigger
  first_name              TEXT NOT NULL CHECK (char_length(first_name) <= 100),
  last_name               TEXT NOT NULL CHECK (char_length(last_name) <= 100),
  date_of_birth           DATE NOT NULL,
  gender                  gender_enum,
  blood_group             blood_group_enum,
  phone                   TEXT UNIQUE NOT NULL CHECK (phone ~ '^\+?[0-9]{10,15}$'),
  email                   TEXT CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address                 TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate UHID: HIMS-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generate_uhid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uhid IS NULL OR NEW.uhid = '' THEN
    NEW.uhid := 'HIMS-'
      || EXTRACT(YEAR FROM NOW())::INT::TEXT
      || '-'
      || LPAD(NEXTVAL('uhid_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_uhid
  BEFORE INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION generate_uhid();

CREATE TRIGGER trg_patients_updated
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes (matching original)
CREATE INDEX idx_patients_name ON patients (last_name, first_name);
-- phone and uhid are already UNIQUE → implicitly indexed


-- ████████████████████████████████████████████████████████████
-- 2. OPD & APPOINTMENT SERVICE  (was: opd_db)
-- ████████████████████████████████████████████████████████████

CREATE TYPE appointment_status_enum AS ENUM (
  'scheduled', 'checked_in', 'in_progress',
  'completed', 'cancelled', 'no_show'
);

-- Departments master table
CREATE TABLE departments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT UNIQUE NOT NULL,
  code       TEXT UNIQUE NOT NULL,           -- e.g. 'CARD', 'ORTH'
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_departments_updated
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Doctors (linked to Keycloak user via user_id)
CREATE TABLE doctors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL,      -- Keycloak / Supabase Auth uid
  full_name       TEXT NOT NULL,
  specialization  TEXT,
  department_id   UUID NOT NULL REFERENCES departments(id),
  is_available    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_doctors_updated
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_doctors_department ON doctors (department_id);

-- Appointments
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  doctor_id       UUID REFERENCES doctors(id),
  department_id   UUID NOT NULL REFERENCES departments(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          appointment_status_enum DEFAULT 'scheduled',
  token_number    INT,                       -- auto-assigned per dept per day
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-assign token_number per department per day
CREATE OR REPLACE FUNCTION assign_token_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token_number IS NULL THEN
    SELECT COALESCE(MAX(token_number), 0) + 1
      INTO NEW.token_number
      FROM appointments
     WHERE department_id = NEW.department_id
       AND scheduled_at::DATE = NEW.scheduled_at::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointments_token
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION assign_token_number();

CREATE INDEX idx_appointments_patient    ON appointments (patient_id);
CREATE INDEX idx_appointments_doctor     ON appointments (doctor_id);
CREATE INDEX idx_appointments_dept_date  ON appointments (department_id, scheduled_at);
CREATE INDEX idx_appointments_status     ON appointments (status);


-- ████████████████████████████████████████████████████████████
-- 3. CLINICAL / EMR SERVICE  (was: clinical_db)
-- ████████████████████████████████████████████████████████████

CREATE TYPE consultation_status_enum AS ENUM ('open', 'completed', 'referred');
CREATE TYPE referral_priority_enum   AS ENUM ('routine', 'urgent', 'emergency');

CREATE TABLE consultations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patients(id),
  appointment_id    UUID UNIQUE NOT NULL REFERENCES appointments(id),  -- 1:1
  doctor_id         UUID NOT NULL REFERENCES doctors(id),
  chief_complaint   TEXT,
  history_of_illness TEXT,
  examination_notes TEXT,
  diagnosis         TEXT,
  icd10_codes       TEXT[],                  -- e.g. ARRAY['J06.9','R05']
  follow_up_date    DATE,
  status            consultation_status_enum DEFAULT 'open',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_consultations_updated
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_consultations_patient ON consultations (patient_id, created_at DESC);
CREATE INDEX idx_consultations_doctor  ON consultations (doctor_id, created_at DESC);

-- Prescription items (was: embedded array in MongoDB)
CREATE TABLE prescription_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id  UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  drug_name        TEXT NOT NULL,
  dosage           TEXT,                     -- e.g. '500mg'
  frequency        TEXT,                     -- e.g. 'Twice daily after meals'
  duration_days    INT,
  instructions     TEXT,
  dispensed        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prescription_items_consultation ON prescription_items (consultation_id);

-- Referrals (was: embedded array in MongoDB)
CREATE TABLE referrals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id     UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  referred_to_dept    TEXT,
  referred_to_doctor  UUID REFERENCES doctors(id),
  reason              TEXT NOT NULL,
  priority            referral_priority_enum DEFAULT 'routine',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_referrals_updated
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_referrals_consultation ON referrals (consultation_id);


-- ████████████████████████████████████████████████████████████
-- 4. LIMS SERVICE  (was: lims_db)
-- ████████████████████████████████████████████████████████████

CREATE TYPE lab_order_status_enum AS ENUM (
  'pending', 'sample_collected', 'processing', 'resulted', 'delivered'
);
CREATE TYPE lab_priority_enum AS ENUM ('routine', 'urgent', 'stat');

-- Lab tests master catalog
CREATE TABLE lab_tests_catalog (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name        TEXT NOT NULL,
  test_code        TEXT UNIQUE NOT NULL,
  category         TEXT,                     -- e.g. 'Haematology', 'Biochemistry'
  default_unit     TEXT,
  reference_range  TEXT,
  price            NUMERIC(10,2) DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Lab orders
CREATE TABLE lab_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  consultation_id  UUID REFERENCES consultations(id),  -- nullable for walk-ins
  ordered_by       UUID NOT NULL REFERENCES doctors(id),
  status           lab_order_status_enum DEFAULT 'pending',
  priority         lab_priority_enum DEFAULT 'routine',
  -- Report stored in Supabase Storage (replaces S3)
  report_path      TEXT,                     -- storage bucket path, e.g. 'lab-reports/2026/09/order-id.pdf'
  report_file_name TEXT,
  report_uploaded_at TIMESTAMPTZ,
  report_uploaded_by UUID REFERENCES doctors(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_lab_orders_updated
  BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_lab_orders_patient ON lab_orders (patient_id, created_at DESC);
CREATE INDEX idx_lab_orders_status  ON lab_orders (status, priority);

-- Lab order items (was: embedded array in MongoDB)
CREATE TABLE lab_order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id     UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  test_id          UUID NOT NULL REFERENCES lab_tests_catalog(id),
  test_name        TEXT,                     -- denormalized for convenience
  result_value     TEXT,
  result_unit      TEXT,
  reference_range  TEXT,
  is_abnormal      BOOLEAN DEFAULT FALSE,
  resulted_at      TIMESTAMPTZ
);

CREATE INDEX idx_lab_order_items_order ON lab_order_items (lab_order_id);


-- ████████████████████████████████████████████████████████████
-- 5. PHARMACY SERVICE  (was: pharmacy_db)
-- ████████████████████████████████████████████████████████████

CREATE TYPE drug_unit_enum AS ENUM (
  'tablet', 'capsule', 'vial', 'ml', 'mg', 'sachet', 'tube', 'strip'
);

-- Drug master catalog
CREATE TABLE drugs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  generic_name    TEXT,
  category        TEXT,
  unit            drug_unit_enum,
  price_per_unit  NUMERIC(10,2) NOT NULL CHECK (price_per_unit >= 0),
  reorder_level   INT DEFAULT 10,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_drugs_updated
  BEFORE UPDATE ON drugs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Drug stock / inventory batches
CREATE TABLE drug_stock (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_id       UUID NOT NULL REFERENCES drugs(id),
  batch_number  TEXT NOT NULL,
  expiry_date   DATE NOT NULL,
  quantity      INT NOT NULL CHECK (quantity >= 0),
  received_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drug_stock_drug_expiry ON drug_stock (drug_id, expiry_date);
CREATE INDEX idx_drug_stock_quantity    ON drug_stock (quantity);  -- for low-stock alerts

-- Dispense orders
CREATE TABLE dispense_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  prescription_id  UUID REFERENCES prescription_items(id),  -- optional link
  dispensed_by     UUID NOT NULL,            -- pharmacist user ID
  dispensed_at     TIMESTAMPTZ DEFAULT NOW(),
  total_amount     NUMERIC(10,2),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispense_orders_patient ON dispense_orders (patient_id);

-- Dispense order items (was: embedded array in MongoDB)
CREATE TABLE dispense_order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispense_order_id UUID NOT NULL REFERENCES dispense_orders(id) ON DELETE CASCADE,
  drug_id          UUID NOT NULL REFERENCES drugs(id),
  drug_name        TEXT,                     -- denormalized
  batch_id         UUID REFERENCES drug_stock(id),
  quantity         INT NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX idx_dispense_items_order ON dispense_order_items (dispense_order_id);

-- -------------------------------------------------------
-- Pharmacy: ACID dispense function (replaces Mongoose transaction)
-- Deducts stock FIFO by expiry, creates dispense record atomically.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION dispense_drugs(
  p_patient_id       UUID,
  p_prescription_id  UUID,
  p_dispensed_by     UUID,
  p_items            JSONB   -- array of { "drug_id": "...", "drug_name": "...", "quantity": N }
)
RETURNS UUID AS $$
DECLARE
  v_order_id    UUID;
  v_item        JSONB;
  v_batch       RECORD;
  v_total       NUMERIC := 0;
  v_unit_price  NUMERIC;
  v_remaining   INT;
BEGIN
  -- Create the dispense order
  INSERT INTO dispense_orders (patient_id, prescription_id, dispensed_by, total_amount)
  VALUES (p_patient_id, p_prescription_id, p_dispensed_by, 0)
  RETURNING id INTO v_order_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_remaining := (v_item->>'quantity')::INT;

    -- Get drug price
    SELECT price_per_unit INTO v_unit_price
      FROM drugs WHERE id = (v_item->>'drug_id')::UUID;

    -- Deduct from batches FIFO (earliest expiry first), skip expired
    FOR v_batch IN
      SELECT id, quantity FROM drug_stock
       WHERE drug_id = (v_item->>'drug_id')::UUID
         AND expiry_date > CURRENT_DATE
         AND quantity > 0
       ORDER BY expiry_date ASC
       FOR UPDATE                             -- row-level lock
    LOOP
      IF v_remaining <= 0 THEN EXIT; END IF;

      IF v_batch.quantity >= v_remaining THEN
        UPDATE drug_stock SET quantity = quantity - v_remaining WHERE id = v_batch.id;

        INSERT INTO dispense_order_items
          (dispense_order_id, drug_id, drug_name, batch_id, quantity, unit_price)
        VALUES
          (v_order_id, (v_item->>'drug_id')::UUID, v_item->>'drug_name',
           v_batch.id, v_remaining, v_unit_price);

        v_total := v_total + (v_remaining * v_unit_price);
        v_remaining := 0;
      ELSE
        UPDATE drug_stock SET quantity = 0 WHERE id = v_batch.id;

        INSERT INTO dispense_order_items
          (dispense_order_id, drug_id, drug_name, batch_id, quantity, unit_price)
        VALUES
          (v_order_id, (v_item->>'drug_id')::UUID, v_item->>'drug_name',
           v_batch.id, v_batch.quantity, v_unit_price);

        v_total := v_total + (v_batch.quantity * v_unit_price);
        v_remaining := v_remaining - v_batch.quantity;
      END IF;
    END LOOP;

    IF v_remaining > 0 THEN
      RAISE EXCEPTION 'Insufficient stock for drug %', v_item->>'drug_name';
    END IF;
  END LOOP;

  -- Update total
  UPDATE dispense_orders SET total_amount = v_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;


-- ████████████████████████████████████████████████████████████
-- 6. FINANCE SERVICE  (was: finance_db)
-- ████████████████████████████████████████████████████████████

CREATE TYPE invoice_status_enum AS ENUM (
  'draft', 'issued', 'partially_paid', 'paid', 'cancelled'
);
CREATE TYPE charge_type_enum AS ENUM (
  'consultation', 'lab', 'pharmacy', 'procedure', 'misc'
);
CREATE TYPE payment_method_enum AS ENUM (
  'cash', 'card', 'upi', 'insurance', 'waiver'
);

CREATE TABLE invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  visit_date       DATE NOT NULL,
  status           invoice_status_enum DEFAULT 'draft',
  discount_amount  NUMERIC(10,2) DEFAULT 0,
  tax_amount       NUMERIC(10,2) DEFAULT 0,
  total_amount     NUMERIC(10,2),            -- computed on issue
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_invoices_patient ON invoices (patient_id, visit_date DESC);
CREATE INDEX idx_invoices_status  ON invoices (status);

-- Invoice line items (was: embedded array in MongoDB)
CREATE TABLE invoice_line_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  charge_type  charge_type_enum,
  description  TEXT NOT NULL,
  source_id    UUID,                         -- ref to lab_order / dispense_order / etc.
  quantity     INT DEFAULT 1 CHECK (quantity >= 1),
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total   NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX idx_line_items_invoice ON invoice_line_items (invoice_id);

-- Invoice payments (was: embedded array in MongoDB)
CREATE TABLE invoice_payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL CHECK (amount >= 0.01),
  method        payment_method_enum,
  reference_no  TEXT,
  paid_at       TIMESTAMPTZ DEFAULT NOW(),
  collected_by  UUID NOT NULL                -- staff user ID
);

CREATE INDEX idx_payments_invoice ON invoice_payments (invoice_id);

-- -------------------------------------------------------
-- Finance: Bill summary view (replaces MongoDB aggregation pipeline)
-- -------------------------------------------------------
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.patient_id,
  i.visit_date,
  i.status,
  COALESCE(li.subtotal, 0)                                   AS subtotal,
  i.discount_amount,
  i.tax_amount,
  COALESCE(li.subtotal, 0) - i.discount_amount + i.tax_amount AS total,
  COALESCE(py.amount_paid, 0)                                 AS amount_paid,
  COALESCE(li.subtotal, 0) - i.discount_amount + i.tax_amount
    - COALESCE(py.amount_paid, 0)                              AS balance_due
FROM invoices i
LEFT JOIN (
  SELECT invoice_id, SUM(line_total) AS subtotal
    FROM invoice_line_items GROUP BY invoice_id
) li ON li.invoice_id = i.id
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS amount_paid
    FROM invoice_payments GROUP BY invoice_id
) py ON py.invoice_id = i.id;


-- ████████████████████████████████████████████████████████████
-- 7. ROW LEVEL SECURITY (RLS)
-- ████████████████████████████████████████████████████████████
-- Enable RLS on all tables. Policies below are starter examples;
-- tighten them based on your Keycloak/Supabase Auth roles.

ALTER TABLE patients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests_catalog    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_stock           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispense_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispense_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments     ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (starter policy — refine per role)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'patients','departments','doctors','appointments',
      'consultations','prescription_items','referrals',
      'lab_tests_catalog','lab_orders','lab_order_items',
      'drugs','drug_stock','dispense_orders','dispense_order_items',
      'invoices','invoice_line_items','invoice_payments'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'allow_authenticated_' || tbl, tbl
    );
  END LOOP;
END;
$$;
