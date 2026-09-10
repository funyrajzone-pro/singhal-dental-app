const express = require('express');
const cors = require('cors');
const jwt = require('jwt-simple');
const path = require('path');
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_123';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Initial Doctors Data
let doctors = [
  {
    id: 'DOC101',
    name: 'Dr. Himanshu Singhal',
    qualifications: 'B.D.S, F.I.O., MIDA (Reg. - A9948)',
    specialties: ['मुख एवं दन्त रोग विशेषज्ञ', 'फैलोशिप इन ऑर्थोडोंटिक (ए.एफ.ओ.)', 'इम्प्लांटोलॉजिस्ट'],
    experience: 'पूर्व चिकित्सा अधिकारी सी.एच.सी. मऊ, पूर्व चिकित्सक ॐ डेन्टल केयर मोदीनगर',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123'
  },
  {
    id: 'DOC102',
    name: 'Dr. Shalini Singhal',
    qualifications: 'B.D.S, FIFA, MIDA (Reg. - A3726)',
    specialties: ['मुख एवं दन्त रोग विशेषज्ञ', 'फैलोशिप इन फेशियल एस्थेटिक्स', 'इम्प्लांटोलॉजिस्ट'],
    experience: 'पूर्व चिकि. आशा डेन्टल क्लीनिक ग्वालियर',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123'
  },
  {
    id: 'DOC103',
    name: 'Dr. Piyush Singhal',
    qualifications: 'BDS, PGC, PGDC, MIDA (Reg. - A2248)',
    specialties: ['मुख एवं दन्त रोग विशेषज्ञ', 'डेन्टल इम्प्लांट स्पेशलिस्ट', 'सर्टिफाइड बेसल इम्प्लांटोलॉजिस्ट IFFI', 'Zygomatic Dental Implant Master'],
    experience: 'पी.जी.सी. इन बेसल इम्प्लांटोलॉजी, Life Member of Indian Society of Oral Implantologists',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123'
  },
  {
    id: 'DOC104',
    name: 'Dr. Sonali Gupta Singhal',
    qualifications: 'B.D.S, MIDA (Reg. - A1375)',
    specialties: ['मुख एवं दन्त रोग विशेषज्ञ'],
    experience: 'पूर्व चिकि. न्यू होराइजन डेन्टल कॉलेज बिलासपुर, पूर्व चिकित्सक त्रिपाठी दंत चिकित्सालय बिलासपुर',
    photoBase64: '',
    is_first_login: true,
    password: 'DefaultPassword123'
  }
];

let adminUser = {
  id: 'ADMIN01',
  password: 'AdminPassword123',
  is_first_login: true
};

let patients = [];
let appointments = [];
let patientIdCounter = 1001;

function generate15MorningSlots() {
  const slots = [];
  let startTime = 10 * 60;
  const interval = 16;
  for (let i = 0; i < 15; i++) {
    let hrs = Math.floor(startTime / 60);
    let mins = startTime % 60;
    let period = hrs >= 12 ? 'PM' : 'AM';
    let displayHrs = hrs > 12 ? hrs - 12 : hrs;
    let formattedMins = mins < 10 ? `0${mins}` : mins;
    slots.push(`${displayHrs}:${formattedMins} ${period}`);
    startTime += interval;
  }
  return slots;
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// APIs
app.get('/api/doctors', (req, res) => {
  const publicDocList = doctors.map(({ password, ...doc }) => doc);
  res.json(publicDocList);
});

app.post('/api/patient/register', (req, res) => {
  const { name, guardianName, address, mobile, dob, photoBase64 } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'Name and Mobile required' });

  const patientId = `SDC${patientIdCounter++}`;
  const defaultPassword = 'Pass' + Math.floor(1000 + Math.random() * 9000);

  const newPatient = {
    id: patientId,
    name,
    guardianName,
    address,
    mobile,
    dob,
    photoBase64: photoBase64 || '',
    password: defaultPassword,
    is_first_login: true
  };

  patients.push(newPatient);
  res.json({ message: 'Patient registered', patientId, defaultPassword });
});

app.post('/api/patient/login', (req, res) => {
  const { patientId, password } = req.body;
  const p = patients.find(p => p.id === patientId && p.password === password);
  if (!p) return res.status(401).json({ error: 'Invalid ID or Password' });

  const token = jwt.encode({ id: p.id, role: 'PATIENT' }, JWT_SECRET);
  const { password: _, ...patientData } = p;
  res.json({ token, patient: patientData, is_first_login: p.is_first_login });
});

app.post('/api/doctor/login', (req, res) => {
  const { id, password } = req.body;
  const doc = doctors.find(d => d.id === id && d.password === password);
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

// Update Passwords
app.post('/api/patient/update-password', authenticateToken, (req, res) => {
  const p = patients.find(patient => patient.id === req.user.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  p.password = req.body.newPassword;
  p.is_first_login = false;
  res.json({ message: 'Password updated' });
});

app.post('/api/doctor/update-password', authenticateToken, (req, res) => {
  const doc = doctors.find(d => d.id === req.user.id);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });
  doc.password = req.body.newPassword;
  doc.is_first_login = false;
  res.json({ message: 'Doctor password updated' });
});

app.post('/api/admin/update-password', authenticateToken, (req, res) => {
  if (req.user.id !== adminUser.id) return res.status(403).json({ error: 'Unauthorized' });
  adminUser.password = req.body.newPassword;
  adminUser.is_first_login = false;
  res.json({ message: 'Admin password updated' });
});

// Update & Delete Doctor Profile Data
app.post('/api/doctor/update-profile', authenticateToken, (req, res) => {
  const targetId = req.body.id || req.user.id;
  const docIndex = doctors.findIndex(d => d.id === targetId);
  if (docIndex === -1) return res.status(404).json({ error: 'Doctor not found' });

  doctors[docIndex] = {
    ...doctors[docIndex],
    name: req.body.name || doctors[docIndex].name,
    qualifications: req.body.qualifications || doctors[docIndex].qualifications,
    specialties: req.body.specialties || doctors[docIndex].specialties,
    experience: req.body.experience || doctors[docIndex].experience,
    photoBase64: req.body.photoBase64 !== undefined ? req.body.photoBase64 : doctors[docIndex].photoBase64
  };

  res.json({ message: 'Doctor profile updated', doctor: doctors[docIndex] });
});

app.delete('/api/doctor/delete/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  doctors = doctors.filter(d => d.id !== req.params.id);
  res.json({ message: 'Doctor deleted successfully' });
});

app.get('/api/appointments/available-slots', (req, res) => {
  const { doctorId, date } = req.query;
  const morningSlots = generate15MorningSlots();
  const bookedSlots = appointments.filter(a => a.doctorId === doctorId && a.date === date).map(a => a.timeSlot);

  res.json({ slots: morningSlots.map(slot => ({ slot, available: !bookedSlots.includes(slot) })) });
});

app.post('/api/appointments/book', authenticateToken, (req, res) => {
  const { doctorId, problem, date, timeSlot } = req.body;
  const p = patients.find(patient => patient.id === req.user.id);
  const doc = doctors.find(d => d.id === doctorId);

  if (!p || !doc) return res.status(400).json({ error: 'Invalid details' });

  const dayApps = appointments.filter(a => a.doctorId === doctorId && a.date === date);
  if (dayApps.length >= 15) return res.status(400).json({ error: '15 slots daily limit reached for this doctor' });

  const newApp = {
    id: 'APP' + Date.now(),
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
    problem,
    doctor_remark: '',
    total_fee: 0,
    deposit_amount: 0,
    balance_amount: 0
  };

  appointments.push(newApp);
  res.json({ message: 'Booked successfully', appointment: newApp });
});

app.get('/api/patient/:id/history', authenticateToken, (req, res) => {
  res.json(appointments.filter(a => a.patientId === req.params.id));
});

app.get('/api/doctor/:id/appointments', authenticateToken, (req, res) => {
  res.json(appointments.filter(a => a.doctorId === req.params.id));
});

app.post('/api/doctor/appointment/update-details', authenticateToken, (req, res) => {
  const { appointmentId, doctorRemark, totalFee, depositAmount } = req.body;
  const app = appointments.find(a => a.id === appointmentId);
  if (!app) return res.status(404).json({ error: 'Appointment not found' });

  if (doctorRemark !== undefined) app.doctor_remark = doctorRemark;
  if (totalFee !== undefined) app.total_fee = Number(totalFee);
  if (depositAmount !== undefined) app.deposit_amount = Number(depositAmount);
  app.balance_amount = app.total_fee - app.deposit_amount;

  res.json({ message: 'Updated', appointment: app });
});

// Admin All Data & Search Endpoints
app.get('/api/admin/all-patients', authenticateToken, (req, res) => {
  const publicPatients = patients.map(({ password, ...p }) => p);
  res.json(publicPatients);
});

app.get('/api/admin/all-appointments', authenticateToken, (req, res) => {
  res.json(appointments);
});

// Serve static React build files for production/online deployment
app.use(express.static(path.join(__dirname, '../client/build')));

// Express 5 compatible catch-all route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));