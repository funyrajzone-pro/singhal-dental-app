import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

// Default Fallback Slots Constant
const DEFAULT_SLOTS = [
  '10:00 AM - 11:00 AM',
  '11:30 AM - 12:30 PM',
  '04:00 PM - 05:00 PM',
  '06:00 PM - 07:00 PM'
];

export default function App() {
  const [view, setView] = useState('LANDING');
  const [activeTab, setActiveTab] = useState('APPOINTMENTS');
  const [userRole, setUserRole] = useState('');
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [authToken, setAuthToken] = useState('');

  // Login & Registration States
  const [regData, setRegData] = useState({ name: '', guardianName: '', address: '', mobile: '', dob: '', photoBase64: '' });
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Data Lists
  const [doctorsList, setDoctorsList] = useState([]);
  const [patientList, setPatientList] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Booking States
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const [patientHistory, setPatientHistory] = useState([]);

  // Modals & Edits
  const [selectedPatientRecord, setSelectedPatientRecord] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_BASE}/doctors`);
      const data = await res.json();
      setDoctorsList(Array.isArray(data) ? data : []);
    } catch {
      setDoctorsList([]);
    }
  };

  const handleLogout = () => {
    setView('LANDING');
    setAuthToken('');
    setUserRole('');
    setSearchQuery('');
    setPatient(null);
    setDoctor(null);
    setLoginId('');
    setLoginPass('');
    setCreatedCredentials(null);
  };

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e, role) => {
    e.preventDefault();
    const endpoint = role === 'PATIENT' ? '/patient/login' : role === 'DOCTOR' ? '/doctor/login' : '/admin/login';
    const payload = role === 'PATIENT' ? { patientId: loginId, password: loginPass } : { id: loginId, password: loginPass };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setAuthToken(data.token);
        setUserRole(role);
        if (data.is_first_login) {
          setView('FORCE_CHANGE_PASS');
        } else {
          if (role === 'PATIENT') {
            const currentPatient = data.patient || { id: loginId, name: 'Patient' };
            setPatient(currentPatient);
            setView('PATIENT_DASH');
            fetchPatientHistory(currentPatient.id, data.token);
          } else if (role === 'DOCTOR') {
            setDoctor(data.doctor || { id: loginId });
            setView('DOCTOR_DASH');
            fetchDoctorData(loginId, data.token);
          } else if (role === 'ADMIN') {
            setView('ADMIN_DASH');
            fetchAdminData(data.token);
          }
        }
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('Network error during login');
    }
  };

  const handleForcePasswordChange = async (e) => {
    e.preventDefault();
    const endpoint = userRole === 'PATIENT' ? '/patient/update-password' : userRole === 'DOCTOR' ? '/doctor/update-password' : '/admin/update-password';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        alert('Password Updated Successfully!');
        if (userRole === 'PATIENT') setView('PATIENT_DASH');
        else if (userRole === 'DOCTOR') setView('DOCTOR_DASH');
        else setView('ADMIN_DASH');
      } else {
        alert('Failed to update password');
      }
    } catch {
      alert('Error updating password');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/patient/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });
      const data = await res.json();
      if (res.ok) setCreatedCredentials(data);
      else alert(data.error || 'Registration failed');
    } catch {
      alert('Network error during registration');
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert('Please select an available time slot.');
      return;
    }
    const currentPatientId = patient?.id || loginId;
    try {
      const res = await fetch(`${API_BASE}/patient/book-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ patientId: currentPatientId, doctorId: selectedDoctor, date: bookingDate, slot: selectedSlot, problem: problemDesc })
      });
      if (res.ok) {
        alert('Appointment Booked Successfully!');
        setSelectedDoctor('');
        setBookingDate('');
        setAvailableSlots([]);
        setSelectedSlot('');
        setProblemDesc('');
        fetchPatientHistory(currentPatientId, authToken);
      } else {
        alert('Booking Failed!');
      }
    } catch {
      alert('Error booking appointment');
    }
  };

  const fetchDoctorData = async (docId, token = authToken) => {
    try {
      const [resApps, resPatients] = await Promise.all([
        fetch(`${API_BASE}/doctor/${docId}/appointments`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/all-patients`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (resApps.ok) setAllAppointments(await resApps.json());
      if (resPatients.ok) setPatientList(await resPatients.json());
    } catch (err) {
      console.error('Error fetching doctor data:', err);
    }
  };

  const fetchAdminData = async (token = authToken) => {
    try {
      const [resApps, resPatients] = await Promise.all([
        fetch(`${API_BASE}/admin/all-appointments`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/all-patients`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (resApps.ok) setAllAppointments(await resApps.json());
      if (resPatients.ok) setPatientList(await resPatients.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const fetchPatientHistory = async (id, token = authToken) => {
    try {
      const res = await fetch(`${API_BASE}/patient/${id}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPatientHistory(Array.isArray(data) ? data : []);
      }
    } catch {
      setPatientHistory([]);
    }
  };

  // Simplified Slot Handling Logic with Instant Fallback
  const handleDateChange = async (date) => {
    setBookingDate(date);
    setSelectedSlot('');
    
    // Set fallback immediately to prevent UI lag/blank UI
    setAvailableSlots(DEFAULT_SLOTS);

    if (selectedDoctor && date) {
      try {
        const res = await fetch(`${API_BASE}/patient/available-slots?doctorId=${selectedDoctor}&date=${date}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          const slots = await res.json();
          if (Array.isArray(slots) && slots.length > 0) {
            setAvailableSlots(slots);
          }
        }
      } catch (err) {
        // Keeps DEFAULT_SLOTS in state on network/API failure
      }
    }
  };

  const filteredPatients = (patientList || []).filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.mobile || '').includes(searchQuery)
  );

  const filteredAppointments = (allAppointments || []).filter(a =>
    (a.patient_name || a.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.patientId || a.patient_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.doctor_name || a.doctorName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1100px', margin: 'auto', backgroundColor: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        
        <header style={{ borderBottom: '2px solid #0056b3', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#0056b3', fontSize: '28px' }}>Singhal Dental Clinic</h1>
          {authToken && <button onClick={handleLogout} style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>}
        </header>

        {/* LANDING VIEW */}
        {view === 'LANDING' && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <h2>Select Portal to Continue</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
              <button onClick={() => setView('PATIENT_LOGIN')} style={{ ...btnPrimaryStyle, padding: '15px 30px', fontSize: '16px' }}>Patient Portal</button>
              <button onClick={() => setView('DOCTOR_LOGIN')} style={{ ...btnPrimaryStyle, backgroundColor: '#28a745', padding: '15px 30px', fontSize: '16px' }}>Doctor Portal</button>
              <button onClick={() => setView('ADMIN_LOGIN')} style={{ ...btnPrimaryStyle, backgroundColor: '#343a40', padding: '15px 30px', fontSize: '16px' }}>Admin Panel</button>
            </div>
          </div>
        )}

        {/* PATIENT LOGIN */}
        {view === 'PATIENT_LOGIN' && (
          <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <h2>Patient Login</h2>
            <form onSubmit={(e) => handleLogin(e, 'PATIENT')}>
              <input placeholder="Patient ID (e.g. SDC1001)" value={loginId} onChange={e => setLoginId(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} />
              <button type="submit" style={btnPrimaryStyle}>Login</button>
            </form>
            <p style={{ marginTop: '15px' }}><button onClick={() => setView('PATIENT_REG')} style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer' }}>New Patient? Register Here</button></p>
            <button onClick={() => setView('LANDING')} style={btnSecondaryStyle}>Back</button>
          </div>
        )}

        {/* PATIENT REGISTRATION */}
        {view === 'PATIENT_REG' && (
          <div style={{ maxWidth: '500px', margin: 'auto' }}>
            <h2>New Patient Registration</h2>
            {!createdCredentials ? (
              <form onSubmit={handleRegister}>
                <input placeholder="Full Name" onChange={e => setRegData({...regData, name: e.target.value})} required style={inputStyle} />
                <input placeholder="Father/Husband Name" onChange={e => setRegData({...regData, guardianName: e.target.value})} required style={inputStyle} />
                <input placeholder="Address" onChange={e => setRegData({...regData, address: e.target.value})} required style={inputStyle} />
                <input placeholder="Mobile Number" onChange={e => setRegData({...regData, mobile: e.target.value})} required style={inputStyle} />
                <input type="date" onChange={e => setRegData({...regData, dob: e.target.value})} required style={inputStyle} />
                <label><strong>Patient Photo:</strong></label>
                <input type="file" accept="image/*" capture="user" onChange={(e) => handleImageUpload(e, (base64) => setRegData({...regData, photoBase64: base64}))} style={inputStyle} />
                {regData.photoBase64 && <img src={regData.photoBase64} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '5px', marginTop: '10px' }} />}
                <button type="submit" style={{ ...btnPrimaryStyle, marginTop: '15px' }}>Submit Registration</button>
              </form>
            ) : (
              <div style={{ border: '2px solid green', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                <h3 style={{ color: 'green' }}>Registration Successful!</h3>
                <p><strong>Patient ID:</strong> {createdCredentials.patientId}</p>
                <p><strong>Default Password:</strong> {createdCredentials.defaultPassword}</p>
                <button onClick={() => setView('PATIENT_LOGIN')} style={btnPrimaryStyle}>Proceed to Login</button>
              </div>
            )}
          </div>
        )}

        {/* FORCE CHANGE PASSWORD */}
        {view === 'FORCE_CHANGE_PASS' && (
          <div style={{ maxWidth: '400px', margin: 'auto', border: '2px solid #ffc107', padding: '20px', borderRadius: '8px' }}>
            <h2>Update Default Password ({userRole})</h2>
            <p>Please change your password for security purposes.</p>
            <form onSubmit={handleForcePasswordChange}>
              <input type="password" placeholder="New Password" onChange={e => setNewPassword(e.target.value)} required style={inputStyle} />
              <button type="submit" style={btnPrimaryStyle}>Update Password & Continue</button>
            </form>
          </div>
        )}

        {/* PATIENT DASHBOARD */}
        {view === 'PATIENT_DASH' && (
          <div>
            <h2>Patient Dashboard</h2>
            <p><strong>Welcome:</strong> {patient?.name || loginId} ({patient?.id || loginId})</p>

            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #e0e0e0' }}>
              <h3 style={{ color: '#0056b3' }}>Book New Appointment</h3>
              <form onSubmit={handleBooking}>
                <label><strong>Select Doctor:</strong></label>
                <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} required style={inputStyle}>
                  <option value="">-- Choose Doctor --</option>
                  {(doctorsList || []).map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialties?.join(', ') || 'General'})</option>
                  ))}
                </select>

                {/* SELECT DATE & FETCH SLOTS */}
                <label><strong>Select Date:</strong></label>
                <input 
                  type="date" 
                  value={bookingDate} 
                  onChange={(e) => handleDateChange(e.target.value)} 
                  required 
                  style={inputStyle} 
                />

                {/* ALWAYS RENDER SLOTS IF DATE IS SELECTED */}
                {bookingDate && (
                  <div style={{ margin: '15px 0' }}>
                    <label><strong>Select Available Time Slot:</strong></label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {(availableSlots.length > 0 ? availableSlots : DEFAULT_SLOTS).map(slot => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          style={{
                            ...btnSecondaryStyle,
                            backgroundColor: selectedSlot === slot ? '#28a745' : '#6c757d',
                            color: '#fff',
                            border: selectedSlot === slot ? '2px solid #1e7e34' : 'none'
                          }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label><strong>Describe Your Dental Problem:</strong></label>
                <textarea value={problemDesc} onChange={e => setProblemDesc(e.target.value)} placeholder="e.g. Tooth pain, Root Canal consult..." required style={{ ...inputStyle, height: '70px' }} />

                <button type="submit" style={{ ...btnPrimaryStyle, marginTop: '10px' }}>Confirm Appointment</button>
              </form>
            </div>

            <h3>Your Appointments & Prescriptions History</h3>
            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f2f2f2' }}>
                <tr>
                  <th>Date & Slot</th>
                  <th>Doctor</th>
                  <th>Problem</th>
                  <th>Diagnosis / Remark</th>
                  <th>Fee & Payment</th>
                </tr>
              </thead>
              <tbody>
                {(patientHistory || []).map(hist => (
                  <tr key={hist.id}>
                    <td>{hist.appointment_date?.split('T')[0]} ({hist.time_slot})</td>
                    <td>{hist.doctor_name}</td>
                    <td>{hist.problem}</td>
                    <td>{hist.doctor_remark || 'Pending Diagnosis'}</td>
                    <td>Total: ₹{hist.total_fee || 0} | Paid: ₹{hist.deposit_amount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DOCTOR LOGIN */}
        {view === 'DOCTOR_LOGIN' && (
          <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <h2>Doctor Login</h2>
            <form onSubmit={(e) => handleLogin(e, 'DOCTOR')}>
              <input placeholder="Doctor ID (DOC101 - DOC104)" value={loginId} onChange={e => setLoginId(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} />
              <button type="submit" style={btnPrimaryStyle}>Login</button>
            </form>
            <button onClick={() => setView('LANDING')} style={{ ...btnSecondaryStyle, marginTop: '10px' }}>Back</button>
          </div>
        )}

        {/* ADMIN LOGIN */}
        {view === 'ADMIN_LOGIN' && (
          <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <h2>Admin Login</h2>
            <form onSubmit={(e) => handleLogin(e, 'ADMIN')}>
              <input placeholder="Admin ID" value={loginId} onChange={e => setLoginId(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ ...btnPrimaryStyle, backgroundColor: '#343a40' }}>Login as Admin</button>
            </form>
            <button onClick={() => setView('LANDING')} style={{ ...btnSecondaryStyle, marginTop: '10px' }}>Back</button>
          </div>
        )}

        {/* ADMIN & DOCTOR DASHBOARDS */}
        {(view === 'ADMIN_DASH' || view === 'DOCTOR_DASH') && (
          <div>
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
              <button onClick={() => setActiveTab('APPOINTMENTS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'APPOINTMENTS' ? '#0056b3' : '#e9ecef', color: activeTab === 'APPOINTMENTS' ? '#fff' : '#333' }}>Appointment List</button>
              <button onClick={() => setActiveTab('PATIENTS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'PATIENTS' ? '#0056b3' : '#e9ecef', color: activeTab === 'PATIENTS' ? '#fff' : '#333' }}>Patient List & Search</button>
              {view === 'ADMIN_DASH' && <button onClick={() => setActiveTab('DOCTORS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'DOCTORS' ? '#0056b3' : '#e9ecef', color: activeTab === 'DOCTORS' ? '#fff' : '#333' }}>Doctors List</button>}
            </div>

            {activeTab === 'APPOINTMENTS' && (
              <div>
                <h3>Appointments List</h3>
                <input placeholder="Search by Patient Name, ID, or Doctor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '15px' }} />
                <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f2f2f2' }}>
                    <tr>
                      <th>Patient Name & ID</th>
                      <th>Doctor</th>
                      <th>Date & Slot</th>
                      <th>Problem</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredAppointments || []).map(app => (
                      <tr key={app.id}>
                        <td>{app.patient_name || app.patientName} ({app.patientId || app.patient_id})</td>
                        <td>{app.doctor_name || app.doctorName}</td>
                        <td>{app.appointment_date?.split('T')[0]} ({app.time_slot || app.timeSlot})</td>
                        <td>{app.problem}</td>
                        <td><button onClick={() => setSelectedPatientRecord(app)} style={btnPrimaryStyle}>View/Edit Details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'PATIENTS' && (
              <div>
                <h3>Registered Patients</h3>
                <input placeholder="Search Patient..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '15px' }} />
                <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f2f2f2' }}>
                    <tr>
                      <th>Photo</th>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Guardian</th>
                      <th>Mobile</th>
                      <th>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredPatients || []).map(p => (
                      <tr key={p.id}>
                        <td>{p.photoBase64 ? <img src={p.photoBase64} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : 'No Image'}</td>
                        <td><strong>{p.id}</strong></td>
                        <td>{p.name}</td>
                        <td>{p.guardianName}</td>
                        <td>{p.mobile}</td>
                        <td>{p.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'DOCTORS' && view === 'ADMIN_DASH' && (
              <div>
                <h3>Doctors List</h3>
                <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f2f2f2' }}>
                    <tr>
                      <th>Doctor ID</th>
                      <th>Name</th>
                      <th>Specialties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(doctorsList || []).map(doc => (
                      <tr key={doc.id}>
                        <td><strong>{doc.id}</strong></td>
                        <td>{doc.name}</td>
                        <td>{Array.isArray(doc.specialties) ? doc.specialties.join(', ') : doc.specialties || 'General'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RECORD VIEW MODAL */}
        {selectedPatientRecord && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
              <h3>Appointment Record Details</h3>
              <p><strong>Patient ID:</strong> {selectedPatientRecord.patientId || selectedPatientRecord.patient_id}</p>
              <p><strong>Patient Name:</strong> {selectedPatientRecord.patient_name || selectedPatientRecord.patientName}</p>
              <p><strong>Problem:</strong> {selectedPatientRecord.problem}</p>
              <p><strong>Doctor:</strong> {selectedPatientRecord.doctor_name || selectedPatientRecord.doctorName}</p>
              <button onClick={() => setSelectedPatientRecord(null)} style={btnSecondaryStyle}>Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Global UI Styles
const inputStyle = { width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' };
const btnPrimaryStyle = { backgroundColor: '#0056b3', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '5px', cursor: 'pointer' };
const btnSecondaryStyle = { backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '5px', cursor: 'pointer' };
const tabBtnStyle = { padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };