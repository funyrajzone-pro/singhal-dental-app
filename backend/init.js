const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'singhal_dental',
  password: '1234',
  port: 5432,
});

async function setupDatabase() {
  try {
    // 1. Purane mismatched tables ko drop karein
    await pool.query(`
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS doctors CASCADE;
      DROP TABLE IF EXISTS patients CASCADE;
    `);

    // 2. Clear aur Updated Tables banayein
    await pool.query(`
      CREATE TABLE patients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        guardian_name VARCHAR(100),
        address TEXT,
        mobile VARCHAR(15),
        dob DATE,
        photo_base64 TEXT,
        password VARCHAR(255),
        is_first_login BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE doctors (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        specialties TEXT[],
        password VARCHAR(255)
      );

      CREATE TABLE appointments (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(50) REFERENCES patients(id),
        doctor_id VARCHAR(50) REFERENCES doctors(id),
        problem TEXT,
        appointment_date DATE,
        time_slot VARCHAR(20),
        doctor_remark TEXT,
        total_fee NUMERIC DEFAULT 0,
        deposit_amount NUMERIC DEFAULT 0,
        balance_amount NUMERIC DEFAULT 0
      );
    `);

    // 3. Initial Doctors Seed Data Insert Karein
    await pool.query(`
      INSERT INTO doctors (id, name, specialties, password) 
      VALUES 
        ('DOC101', 'Dr. Rajesh Singhal', ARRAY['Root Canal', 'Implants'], '1234'),
        ('DOC102', 'Dr. Neha Sharma', ARRAY['Orthodontics', 'Braces'], '1234');
    `);

    console.log('✅ Success: Purane tables reset ho gaye aur new Database Schema successfully ban gaya!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Reset Failed:', err.message);
    process.exit(1);
  }
}

setupDatabase();