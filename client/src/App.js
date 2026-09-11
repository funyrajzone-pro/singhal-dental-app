import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

export default function App() {
  const [view, setView] = useState('LANDING');
  const [activeTab, setActiveTab] = useState('APPOINTMENTS');
  const [userRole, setUserRole] = useState('');
  const [patient, setPatient] = useState(null);

  // Form & Selection States
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [doctorsList, setDoctorsList] = useState([]);
  const [patientList, setPatientList] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Booking States
  const [selectedDoctor, setSelectedDoctor] = useState('DOC101');
  const [bookingDate, setBookingDate] = useState('2026-09-12');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 11:00 AM');
  const [problemDesc, setProblemDesc] = useState('');
  const [patientHistory, setPatientHistory] = useState([]);

  const defaultSlots = [
    '10:00 AM - 11:00 AM',
    '11:30 AM - 12:30 PM',
    '04:00 PM - 05:00 PM',
    '05:30 PM - 06:30 PM'
  ];

  const defaultDoctors = [
    { id: 'DOC101', name: 'Dr. Himanshu Singhal', specialty: 'Orthodontics & Implantology', mobile: '9876543210' },
    { id: 'DOC102', name: 'Dr. Neha Sharma', specialty: 'Endodontist (Root Canal Specialist)', mobile: '9876543211' }
  ];

  useEffect(() => {
    // Sync cached appointments on startup
    const localApps = JSON.parse(localStorage.getItem('appointments_db') || '[]');
    setAllAppointments(localApps);
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_BASE}/doctors`);
      if (res.ok) {
        const data = await res.json();
        setDoctorsList(Array.isArray(data) && data.length > 0 ? data : defaultDoctors);
      } else {
        setDoctorsList(defaultDoctors);
      }
    } catch {
      setDoctorsList(defaultDoctors);
    }
  };

  const syncData = () => {
    const localApps = JSON.parse(localStorage.getItem('appointments_db') || '[]');
    setAllAppointments(localApps);
    if (patient) {
      setPatientHistory(localApps.filter(a => a.patientId === patient.id || a.patientId === loginId));
    }
  };

  const handleLogin = async (e, role) => {
    e.preventDefault();
    setUserRole(role);

    if (role === 'PATIENT') {
      const pObj = { id: loginId || 'SDC1001', name: loginId || 'SDC1001' };
      setPatient(pObj);
      setView('PATIENT_DASH');
      const localApps = JSON.parse(localStorage.getItem('appointments_db') || '[]');
      setPatientHistory(localApps.filter(a => a.patientId === pObj.id));
    } else if (role === 'DOCTOR') {
      setView('DOCTOR_DASH');
      syncData();
    } else if (role === 'ADMIN') {
      setView('ADMIN_DASH');
      syncData();
      fetchPatientsList();
    }
  };

  const fetchPatientsList = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/all-patients`);
      if (res.ok) {
        const data = await res.json();
        setPatientList(Array.isArray(data) ? data : []);
      }
    } catch {
      setPatientList([
        { id: 'SDC1001', name: 'v', guardianName: 'm', mobile: '7676786867', address: 'j' },
        { id: 'SDC1002', name: 'a', guardianName: 'm', mobile: '55675765765', address: 'h' }
      ]);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    const docObj = doctorsList.find(d => d.id === selectedDoctor) || doctorsList[0] || defaultDoctors[0];

    const newAppointment = {
      id: 'APP_' + Date.now(),
      patientId: patient?.id || loginId || 'SDC1001',
      patient_name: patient?.name || loginId || 'SDC1001',
      doctorId: selectedDoctor || docObj.id,
      doctor_name: docObj.name,
      appointment_date: bookingDate,
      time_slot: selectedSlot,
      problem: problemDesc,
      doctor_remark: 'Pending Diagnosis',
      total_fee: 500
    };

    // Store in Persistent Storage
    const existingApps = JSON.parse(localStorage.getItem('appointments_db') || '[]');
    const updatedApps = [newAppointment, ...existingApps];
    localStorage.setItem('appointments_db', JSON.stringify(updatedApps));

    // Try Sync with Backend
    try {
      await fetch(`${API_BASE}/patient/book-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointment)
      });
    } catch (err) {
      console.log('Backend sync offline, saved to local state');
    }

    alert('Appointment Booked Successfully!');
    setProblemDesc('');
    setPatientHistory(updatedApps.filter(a => a.patientId === newAppointment.patientId));
    setAllAppointments(updatedApps);
  };

  const filteredAppointments = (allAppointments || []).filter(a =>
    (a.patient_name || a.patientId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.doctor_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1100px', margin: 'auto', backgroundColor: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        
        {/* HEADER */}
        <header style={{ borderBottom: '2px solid #0056b3', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#0056b3', fontSize: '28px' }}>Singhal Dental Clinic</h1>
          {view !== 'LANDING' && (
            <button onClick={() => { setView('LANDING'); setSearchQuery(''); }} style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
          )}
        </header>

        {/* LANDING PORTAL */}
        {view === 'LANDING' && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <h2>Select Portal to Continue</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
              <button onClick={() => setView('PATIENT_LOGIN')} style={btnPrimaryStyle}>Patient Portal</button>
              <button onClick={() => setView('DOCTOR_LOGIN')} style={{ ...btnPrimaryStyle, backgroundColor: '#28a745' }}>Doctor Portal</button>
              <button onClick={() => setView('ADMIN_LOGIN')} style={{ ...btnPrimaryStyle, backgroundColor: '#343a40' }}>Admin Panel</button>
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
          </div>
        )}

        {/* DOCTOR LOGIN */}
        {view === 'DOCTOR_LOGIN' && (
          <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <h2>Doctor Login</h2>
            <form onSubmit={(e) => handleLogin(e, 'DOCTOR')}>
              <input placeholder="Doctor ID (DOC101)" value={loginId} onChange={e => setLoginId(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ ...btnPrimaryStyle, backgroundColor: '#28a745' }}>Login</button>
            </form>
          </div>
        )}

        {/* ADMIN LOGIN */}
        {view === 'ADMIN_LOGIN' && (
          <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <h2>Admin Login</h2>
            <form onSubmit={(e) => handleLogin(e, 'ADMIN')}>
              <input placeholder="Admin ID" value={loginId} onChange={e => setLoginId(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ ...btnPrimaryStyle, backgroundColor: '#343a40' }}>Login</button>
            </form>
          </div>
        )}

        {/* PATIENT DASHBOARD */}
        {view === 'PATIENT_DASH' && (
          <div>
            <h2>Patient Dashboard</h2>
            <p><strong>Welcome:</strong> {patient?.name} ({patient?.id})</p>

            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #e0e0e0' }}>
              <h3 style={{ color: '#0056b3', marginTop: 0 }}>Book New Appointment</h3>
              <form onSubmit={handleBookAppointment}>
                <label><strong>Select Doctor:</strong></label>
                <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} required style={inputStyle}>
                  {doctorsList.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>

                <label><strong>Select Date:</strong></label>
                <input 
                  type="date" 
                  value={bookingDate} 
                  onChange={e => setBookingDate(e.target.value)} 
                  required 
                  style={inputStyle} 
                />

                {/* SLOTS OPTION - PERMANENTLY VISIBLE */}
                <div style={{ margin: '15px 0' }}>
                  <label style={{ display: 'block', marginBottom: '8px' }}><strong>Select Time Slot:</strong></label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {defaultSlots.map(slot => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '5px',
                          border: selectedSlot === slot ? '2px solid #0056b3' : '1px solid #ccc',
                          backgroundColor: selectedSlot === slot ? '#0056b3' : '#fff',
                          color: selectedSlot === slot ? '#fff' : '#333',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <label><strong>Describe Your Dental Problem:</strong></label>
                <textarea 
                  value={problemDesc} 
                  onChange={e => setProblemDesc(e.target.value)} 
                  placeholder="e.g. Tooth pain, Root Canal consult..." 
                  required 
                  style={{ ...inputStyle, height: '70px' }} 
                />

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
                  <th>Fee Status</th>
                </tr>
              </thead>
              <tbody>
                {patientHistory.length > 0 ? (
                  patientHistory.map(hist => (
                    <tr key={hist.id}>
                      <td>{hist.appointment_date} ({hist.time_slot})</td>
                      <td>{hist.doctor_name}</td>
                      <td>{hist.problem}</td>
                      <td>{hist.doctor_remark}</td>
                      <td>Total: ₹{hist.total_fee}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>No appointments booked yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ADMIN & DOCTOR DASHBOARDS */}
        {(view === 'ADMIN_DASH' || view === 'DOCTOR_DASH') && (
          <div>
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
              <button onClick={() => setActiveTab('APPOINTMENTS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'APPOINTMENTS' ? '#0056b3' : '#e9ecef', color: activeTab === 'APPOINTMENTS' ? '#fff' : '#333' }}>Appointment List</button>
              <button onClick={() => setActiveTab('PATIENTS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'PATIENTS' ? '#0056b3' : '#e9ecef', color: activeTab === 'PATIENTS' ? '#fff' : '#333' }}>Patient List & Search</button>
              {view === 'ADMIN_DASH' && (
                <button onClick={() => setActiveTab('DOCTORS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'DOCTORS' ? '#0056b3' : '#e9ecef', color: activeTab === 'DOCTORS' ? '#fff' : '#333' }}>Doctors List</button>
              )}
            </div>

            {/* TAB 1: APPOINTMENTS */}
            {activeTab === 'APPOINTMENTS' && (
              <div>
                <h3>Appointments List ({view === 'DOCTOR_DASH' ? 'Doctor Portal' : 'Admin Portal'})</h3>
                <input placeholder="Search by Patient Name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '15px' }} />
                <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f2f2f2' }}>
                    <tr>
                      <th>Patient Name & ID</th>
                      <th>Doctor</th>
                      <th>Date & Slot</th>
                      <th>Problem</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map(app => (
                        <tr key={app.id}>
                          <td><strong>{app.patient_name}</strong> ({app.patientId})</td>
                          <td>{app.doctor_name}</td>
                          <td>{app.appointment_date} ({app.time_slot})</td>
                          <td>{app.problem}</td>
                          <td><span style={{ color: 'green', fontWeight: 'bold' }}>Confirmed</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>No appointment records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: PATIENTS */}
            {activeTab === 'PATIENTS' && (
              <div>
                <h3>Registered Patients</h3>
                <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f2f2f2' }}>
                    <tr>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Guardian Name</th>
                      <th>Mobile</th>
                      <th>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientList.map(p => (
                      <tr key={p.id}>
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

            {/* TAB 3: DOCTORS (ADMIN ONLY) */}
            {activeTab === 'DOCTORS' && view === 'ADMIN_DASH' && (
              <div>
                <h3>Doctors List</h3>
                <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f2f2f2' }}>
                    <tr>
                      <th>Doctor ID</th>
                      <th>Doctor Name</th>
                      <th>Specialty</th>
                      <th>Contact Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(doctorsList.length > 0 ? doctorsList : defaultDoctors).map(doc => (
                      <tr key={doc.id}>
                        <td><strong>{doc.id}</strong></td>
                        <td>{doc.name}</td>
                        <td>{doc.specialty || 'General Dentistry'}</td>
                        <td>{doc.mobile || '9876543210'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' };
const btnPrimaryStyle = { backgroundColor: '#0056b3', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' };
const tabBtnStyle = { padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };