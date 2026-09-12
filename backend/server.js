const express = require('express');
const cors = require('cors');
const jwt = require('jwt-simple');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_123';

// ---------------------------------------------------------
// File Storage & Multer Setup
// ---------------------------------------------------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ---------------------------------------------------------
// Middlewares
// ---------------------------------------------------------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------------------------------------
// In-Memory Database / Mock Data State
// ---------------------------------------------------------
let doctorsDB = [
  {
    id: 'DOC101',
    name: 'Dr. Himanshu Singhal',
    qualifications: 'B.D.S, F.I.O., MIDA (Reg. - A9948)',
    specialties: ['Orthodontics', 'Implantology', 'मुख एवं दन्त रोग विशेषज्ञ'],
    experience: '10+ Years',
    photoUrl: '',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123',
    slotConfig: { startHour: 10, totalSlots: 15, intervalMins: 16 }
  },
  {
    id: 'DOC102',
    name: 'Dr. Shalini Singhal',
    qualifications: 'B.D.S, FIFA, MIDA (Reg. - A3726)',
    specialties: ['मुख एवं दन्त रोग विशेषज्ञ', 'फैलोशिप इन फेशियल एस्थेटिक्स', 'इम्प्लांटोलॉजिस्ट'],
    experience: 'पूर्व चिकि. आशा डेन्टल क्लीनिक ग्वालियर',
    photoUrl: '',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123',
    slotConfig: { startHour: 10, totalSlots: 15, intervalMins: 16 }
  },
  {
    id: 'DOC103',
    name: 'Dr. Piyush Singhal',
    qualifications: 'BDS, PGC, PGDC, MIDA (Reg. - A2248)',
    specialties: ['मुख एवं दन्त रोग विशेषज्ञ', 'डेन्टल इम्प्लांट स्पेशलिस्ट', 'सर्टिफाइड बेसल इम्प्लांटोलॉजिस्ट IFFI'],
    experience: 'पी.जी.सी. इन बेसल इम्प्लांटोलॉजी',
    photoUrl: '',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123',
    slotConfig: { startHour: 10, totalSlots: 15, intervalMins: 16 }
  },
  {
    id: 'DOC104',
    name: 'Dr. Sonali Gupta Singhal',
    qualifications: 'B.D.S, MIDA (Reg. - A1375)',
    specialties: ['मुख एवं दन्त रोग विशेषज्ञ'],
    experience: 'पूर्व चिकि. न्यू होराइजन डेन्टल कॉलेज बिलासपुर',
    photoUrl: '',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123',
    slotConfig: { startHour: 10, totalSlots: 15, intervalMins: 16 }
  }
];

let adminUser = {
  id: 'ADMIN01',
  password: 'AdminPassword123',
  is_first_login: true
};

let patientsDB = [
  { id: 'SDC1001', name: 'SDC1001 Patient', guardianName: 'Guardian Name', mobile: '9876543210', address: 'Jhansi', password: 'Pass1001', is_first_login: true }
];

let appointmentsDB = [];
let patientIdCounter = 1002;
let appointmentCounter = 5001;

// Default Slots Fallback
const defaultTimeSlots = ['10:00 AM - 11:00 AM', '11:30 AM - 12:30 PM', '04:00 PM - 05:00 PM', '05:30 PM - 06:30 PM'];

// ---------------------------------------------------------
// Authentication Middlewares
// ---------------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Unauthorized role' });
    }
    next();
  };
};

// ---------------------------------------------------------
// PUBLIC ROUTES & DOCTORS LIST
// ---------------------------------------------------------

app.get('/api/doctors', (req, res) => {
  const publicDocList = doctorsDB.map(({ password, ...doc }) => doc);
  res.json(publicDocList);
});

app.get('/api/doctors/:id', (req, res) => {
  const doc = doctorsDB.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });
  const { password, ...docData } = doc;
  res.json(docData);
});

// ---------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ---------------------------------------------------------

app.post('/api/patient/register', upload.single('photo'), (req, res) => {
  const { name, guardianName, address, mobile, dob, photoBase64 } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'Name and Mobile required' });

  const patientId = `SDC${patientIdCounter++}`;
  const defaultPassword = 'Pass' + Math.floor(1000 + Math.random() * 9000);
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const newPatient = {
    id: patientId,
    name,
    guardianName: guardianName || '',
    address: address || '',
    mobile,
    dob: dob || '',
    photoUrl,
    photoBase64: photoBase64 || '',
    password: defaultPassword,
    is_first_login: true,
    createdAt: new Date().toISOString()
  };

  patientsDB.push(newPatient);
  res.json({ message: 'Patient registered successfully', patientId, defaultPassword, patient: newPatient });
});

app.post('/api/patient/login', (req, res) => {
  const { patientId, password } = req.body;
  const p = patientsDB.find(patient => patient.id === patientId && patient.password === password);
  if (!p) return res.status(401).json({ error: 'Invalid ID or Password' });

  const token = jwt.encode({ id: p.id, role: 'PATIENT' }, JWT_SECRET);
  const { password: _, ...patientData } = p;
  res.json({ token, patient: patientData, is_first_login: p.is_first_login });
});

app.post('/api/doctor/login', (req, res) => {
  const { id, password } = req.body;
  const doc = doctorsDB.find(d => d.id === id && d.password === password);
  if (!doc) return res.status(401).json({ error: 'Invalid Credentials' });

  const token = jwt.encode({ id: doc.id, role: 'DOCTOR' }, JWT_SECRET);
  const { password: _, ...docData } = doc;
  res.json({ token, doctor: docData, is_first_login: doc.is_first_login });
});

app.post('/api/admin/login', (req, res) => {
  const { id, password } = req.body;
  if (adminUser.id === id && adminUser.password === password) {
    const token = jwt.encode({ id: adminUser.id, role: 'ADMIN' }, JWT_SECRET);
    res.json({ token, is_first_login: adminUser.is_first_login });
  } else {
    res.status(401).json({ error: 'Invalid Admin Credentials' });
  }
});

// ---------------------------------------------------------
// PATIENT APPOINTMENT ROUTES
// ---------------------------------------------------------

app.get('/api/patient/available-slots', (req, res) => {
  const { doctorId, date } = req.query;

  const bookedSlots = appointmentsDB
    .filter(a => a.doctorId === doctorId && a.appointment_date === date && a.status !== 'CANCELLED')
    .map(a => a.time_slot);

  const available = defaultTimeSlots.filter(s => !bookedSlots.includes(s));
  res.json(available);
});

app.post('/api/patient/book-appointment', (req, res) => {
  const { patientId, doctorId, date, slot, problem } = req.body;

  const doc = doctorsDB.find(d => d.id === doctorId);
  const patient = patientsDB.find(p => p.id === patientId);

  const newAppointment = {
    id: req.body.id || ('APP_' + Date.now()),
    patientId: patientId || 'SDC1001',
    patient_name: req.body.patient_name || req.body.patientName || (patient ? patient.name : 'Patient ' + patientId),
    doctorId: doctorId || 'DOC101',
    doctor_name: req.body.doctor_name || (doc ? doc.name : 'Dr. Himanshu Singhal'),
    appointment_date: date || req.body.appointment_date,
    time_slot: slot || req.body.time_slot || '10:00 AM - 11:00 AM',
    problem: problem || req.body.problem || '',
    doctor_remark: req.body.doctor_remark || 'Pending',
    total_fee: req.body.total_fee || 500,
    deposit_amount: 0,
    balance_amount: req.body.total_fee || 500,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  };

  appointmentsDB.push(newAppointment);
  res.status(200).json({ success: true, message: 'Appointment booked successfully', appointment: newAppointment });
});

app.post('/api/appointments/book', authenticateToken, authorizeRoles('PATIENT', 'ADMIN'), (req, res) => {
  const { doctorId, problem, date, timeSlot, patientId } = req.body;
  const targetPatientId = (req.user.role === 'ADMIN' && patientId) ? patientId : req.user.id;

  const p = patientsDB.find(patient => patient.id === targetPatientId);
  const doc = doctorsDB.find(d => d.id === doctorId);

  if (!p || !doc) return res.status(400).json({ error: 'Invalid Doctor or Patient details' });

  const dayApps = appointmentsDB.filter(a => a.doctorId === doctorId && a.appointment_date === date && a.status !== 'CANCELLED');
  if (dayApps.some(a => a.time_slot === timeSlot)) {
    return res.status(400).json({ error: 'This time slot is already booked' });
  }

  const newApp = {
    id: 'APP_' + (appointmentCounter++),
    patientId: p.id,
    patient_name: p.name,
    guardian_name: p.guardianName,
    address: p.address,
    mobile: p.mobile,
    dob: p.dob,
    doctorId: doc.id,
    doctor_name: doc.name,
    appointment_date: date,
    time_slot: timeSlot,
    problem: problem || '',
    doctor_remark: '',
    prescriptions: [],
    attachments: [],
    total_fee: 500,
    deposit_amount: 0,
    balance_amount: 500,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  };

  appointmentsDB.push(newApp);
  res.json({ message: 'Appointment booked successfully', appointment: newApp });
});

app.get('/api/patient/:id/history', (req, res) => {
  const patientId = req.params.id;
  const history = appointmentsDB.filter(a => a.patientId === patientId);
  res.json(history);
});

// ---------------------------------------------------------
// ADMIN & DOCTOR APPOINTMENT ROUTES
// ---------------------------------------------------------

app.get('/api/admin/all-appointments', (req, res) => {
  res.json(appointmentsDB);
});

app.get('/api/doctor/:id/appointments', (req, res) => {
  const docId = req.params.id;
  const docApps = appointmentsDB.filter(a => a.doctorId === docId);
  res.json(docApps.length > 0 ? docApps : appointmentsDB);
});

app.post('/api/doctor/appointment/update-details', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), upload.array('attachments'), (req, res) => {
  const { appointmentId, doctorRemark, totalFee, depositAmount, status, prescriptions } = req.body;
  const appItem = appointmentsDB.find(a => a.id === appointmentId);
  if (!appItem) return res.status(404).json({ error: 'Appointment not found' });

  if (doctorRemark !== undefined) appItem.doctor_remark = doctorRemark;
  if (totalFee !== undefined) appItem.total_fee = Number(totalFee);
  if (depositAmount !== undefined) appItem.deposit_amount = Number(depositAmount);
  appItem.balance_amount = appItem.total_fee - appItem.deposit_amount;
  if (status) appItem.status = status;

  if (prescriptions) {
    appItem.prescriptions = typeof prescriptions === 'string' ? JSON.parse(prescriptions) : prescriptions;
  }

  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map(f => `/uploads/${f.filename}`);
    appItem.attachments = (appItem.attachments || []).concat(filePaths);
  }

  res.json({ message: 'Appointment updated successfully', appointment: appItem });
});

app.get('/api/admin/all-patients', (req, res) => {
  const publicPatients = patientsDB.map(({ password, ...p }) => p);
  res.json(publicPatients);
});

// ---------------------------------------------------------
// PASSWORD UPDATES & ADMIN CONTROLS
// ---------------------------------------------------------

app.post('/api/patient/update-password', authenticateToken, authorizeRoles('PATIENT'), (req, res) => {
  const p = patientsDB.find(patient => patient.id === req.user.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  p.password = req.body.newPassword;
  p.is_first_login = false;
  res.json({ message: 'Password updated successfully' });
});

app.post('/api/doctor/update-password', authenticateToken, authorizeRoles('DOCTOR'), (req, res) => {
  const doc = doctorsDB.find(d => d.id === req.user.id);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });
  doc.password = req.body.newPassword;
  doc.is_first_login = false;
  res.json({ message: 'Doctor password updated successfully' });
});

app.post('/api/admin/update-password', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  adminUser.password = req.body.newPassword;
  adminUser.is_first_login = false;
  res.json({ message: 'Admin password updated successfully' });
});

app.delete('/api/doctor/delete/:id', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  doctorsDB = doctorsDB.filter(d => d.id !== req.params.id);
  res.json({ message: 'Doctor deleted successfully' });
});

// ---------------------------------------------------------
// STATIC SERVING & PRODUCTION FALLBACK (FIXED FOR RENDER)
// ---------------------------------------------------------
const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Backend Server is running successfully!');
  });
}

// ---------------------------------------------------------
// SERVER INITIALIZATION (RENDER PORT BINDING FIX)
// ---------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});