import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [view, setView] = useState('LANDING');
  const [activeTab, setActiveTab] = useState('APPOINTMENTS'); // APPOINTMENTS, PATIENTS, DOCTORS
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
  const [editDocModal, setEditDocModal] = useState(null);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = () => {
    fetch(`${API_BASE}/doctors`).then(res => res.json()).then(data => setDoctorsList(data)).catch(() => {});
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
          setPatient(data.patient);
          setView('PATIENT_DASH');
          fetchPatientHistory(data.patient.id, data.token);
        } else if (role === 'DOCTOR') {
          setDoctor(data.doctor);
          setView('DOCTOR_DASH');
          fetchDoctorData(data.doctor.id, data.token);
        } else if (role === 'ADMIN') {
          setView('ADMIN_DASH');
          fetchAdminData(data.token);
        }
      }
    } else {
      alert(data.error);
    }
  };

  const handleForcePasswordChange = async (e) => {
    e.preventDefault();
    const endpoint = userRole === 'PATIENT' ? '/patient/update-password' : userRole === 'DOCTOR' ? '/doctor/update-password' : '/admin/update-password';
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ newPassword })
    });
    if (res.ok) {
      alert('Password Updated Successfully!');
      if (userRole === 'PATIENT') setView('PATIENT_DASH');
      else if (userRole === 'DOCTOR') { setView('DOCTOR_DASH'); fetchDoctorData(doctor.id); }
      else { setView('ADMIN_DASH'); fetchAdminData(); }
    } else alert('Failed to update password');
  };

  const fetchDoctorData = async (docId, token = authToken) => {
    const resApps = await fetch(`${API_BASE}/doctor/${docId}/appointments`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (resApps.ok) setAllAppointments(await resApps.json());
    const resPatients = await fetch(`${API_BASE}/admin/all-patients`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (resPatients.ok) setPatientList(await resPatients.json());
  };

  const fetchAdminData = async (token = authToken) => {
    const resApps = await fetch(`${API_BASE}/admin/all-appointments`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (resApps.ok) setAllAppointments(await resApps.json());
    const resPatients = await fetch(`${API_BASE}/admin/all-patients`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (resPatients.ok) setPatientList(await resPatients.json());
  };

  const fetchPatientHistory = async (id, token = authToken) => {
    const res = await fetch(`${API_BASE}/patient/${id}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setPatientHistory(await res.json());
  };

  const saveDoctorProfile = async (profileData) => {
    const res = await fetch(`${API_BASE}/doctor/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(profileData)
    });
    if (res.ok) {
      alert('Profile Updated Successfully!');
      fetchDoctors();
      setEditDocModal(null);
    } else alert('Update Failed');
  };

  const deleteDoctor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Doctor?')) return;
    const res = await fetch(`${API_BASE}/doctor/delete/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      alert('Doctor Deleted');
      fetchDoctors();
    }
  };

  // Filtered Patients and Appointments Search
  const filteredPatients = patientList.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mobile.includes(searchQuery)
  );

  const filteredAppointments = allAppointments.filter(a =>
    a.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1100px', margin: 'auto', backgroundColor: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        
        <header style={{ borderBottom: '2px solid #0056b3', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#0056b3', fontSize: '28px' }}>Singhal Dental Clinic</h1>
          {authToken && <button onClick={() => { setView('LANDING'); setAuthToken(''); setSearchQuery(''); }} style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>}
        </header>

        {/* LANDING VIEW */}
        {view === 'LANDING' && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <h2>Select Portal to Continue</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
              <button onClick={() => setView('PATIENT_LOGIN')} style={{ padding: '15px 30px', fontSize: '16px', backgroundColor: '#0056b3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Patient Portal</button>
              <button onClick={() => setView('DOCTOR_LOGIN')} style={{ padding: '15px 30px', fontSize: '16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Doctor Portal</button>
              <button onClick={() => setView('ADMIN_LOGIN')} style={{ padding: '15px 30px', fontSize: '16px', backgroundColor: '#343a40', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Admin Panel</button>
            </div>
          </div>
        )}

        {/* PATIENT LOGIN & REGISTRATION */}
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

        {view === 'PATIENT_REG' && (
          <div style={{ maxWidth: '500px', margin: 'auto' }}>
            <h2>New Patient Registration</h2>
            {!createdCredentials ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch(`${API_BASE}/patient/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regData) });
                const data = await res.json();
                if (res.ok) setCreatedCredentials(data);
                else alert(data.error);
              }}>
                <input placeholder="Full Name" onChange={e => setRegData({...regData, name: e.target.value})} required style={inputStyle} />
                <input placeholder="Father/Husband Name" onChange={e => setRegData({...regData, guardianName: e.target.value})} required style={inputStyle} />
                <input placeholder="Address" onChange={e => setRegData({...regData, address: e.target.value})} required style={inputStyle} />
                <input placeholder="Mobile Number" onChange={e => setRegData({...regData, mobile: e.target.value})} required style={inputStyle} />
                <input type="date" onChange={e => setRegData({...regData, dob: e.target.value})} required style={inputStyle} />
                <label><strong>Patient Photo (Mobile Camera / Upload):</strong></label>
                <input type="file" accept="image/*" capture="user" onChange={(e) => handleImageUpload(e, (base64) => setRegData({...regData, photoBase64: base64}))} style={inputStyle} />
                {regData.photoBase64 && <img src={regData.photoBase64} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '5px' }} />}
                <button type="submit" style={btnPrimaryStyle}>Submit Registration</button>
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

        {/* DOCTOR LOGIN */}
        {view === 'DOCTOR_LOGIN' && (
          <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <h2>Doctor Login</h2>
            <form onSubmit={(e) => handleLogin(e, 'DOCTOR')}>
              <input placeholder="Doctor ID (DOC101 - DOC104)" value={loginId} onChange={e => setLoginId(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={inputStyle} />
              <button type="submit" style={btnPrimaryStyle}>Login</button>
            </form>
            <button onClick={() => setView('LANDING')} style={btnSecondaryStyle}>Back</button>
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
            <button onClick={() => setView('LANDING')} style={btnSecondaryStyle}>Back</button>
          </div>
        )}

        {/* DOCTOR & ADMIN DASHBOARDS (WITH PATIENT & APPOINTMENTS TAB + SEARCH) */}
        {(view === 'ADMIN_DASH' || view === 'DOCTOR_DASH') && (
          <div>
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
              <button onClick={() => setActiveTab('APPOINTMENTS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'APPOINTMENTS' ? '#0056b3' : '#e9ecef', color: activeTab === 'APPOINTMENTS' ? '#fff' : '#333' }}>Appointment List</button>
              <button onClick={() => setActiveTab('PATIENTS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'PATIENTS' ? '#0056b3' : '#e9ecef', color: activeTab === 'PATIENTS' ? '#fff' : '#333' }}>Patient List & Search</button>
              {view === 'ADMIN_DASH' && <button onClick={() => setActiveTab('DOCTORS')} style={{ ...tabBtnStyle, backgroundColor: activeTab === 'DOCTORS' ? '#0056b3' : '#e9ecef', color: activeTab === 'DOCTORS' ? '#fff' : '#333' }}>Doctors List ({doctorsList.length})</button>}
            </div>

            {/* TAB 1: APPOINTMENTS LIST */}
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
                    {filteredAppointments.map(app => (
                      <tr key={app.id}>
                        <td>{app.patient_name} ({app.patientId})</td>
                        <td>{app.doctor_name}</td>
                        <td>{app.appointment_date.split('T')[0]} ({app.time_slot})</td>
                        <td>{app.problem}</td>
                        <td><button onClick={() => setSelectedPatientRecord(app)} style={btnPrimaryStyle}>View/Edit Details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: PATIENTS LIST WITH SEARCH */}
            {activeTab === 'PATIENTS' && (
              <div>
                <h3>Registered Patients Search</h3>
                <input placeholder="Search Patient by Name, ID (SDC1001), or Mobile..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '15px' }} />
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
                    {filteredPatients.map(p => (
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

            {/* TAB 3: DOCTORS MANAGEMENT (ADMIN ONLY) */}
            {activeTab === 'DOCTORS' && view === 'ADMIN_DASH' && (
              <div>
                <h3>Manage Doctors Profiles</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {doctorsList.map(doc => (
                    <div key={doc.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fff' }}>
                      {doc.photoBase64 && <img src={doc.photoBase64} alt="" style={{ width: '70px', height: '70px', borderRadius: '50%' }} />}
                      <h4>{doc.name} ({doc.id})</h4>
                      <p><strong>Qualifications:</strong> {doc.qualifications}</p>
                      <p><strong>Specialties:</strong> {doc.specialties?.join(', ')}</p>
                      <p><em>{doc.experience}</em></p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setEditDocModal(doc)} style={{ ...btnPrimaryStyle, backgroundColor: '#ffc107', color: '#000' }}>Edit Profile Data</button>
                        <button onClick={() => deleteDoctor(doc.id)} style={{ ...btnPrimaryStyle, backgroundColor: '#dc3545' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EDIT DOCTOR MODAL POPUP (PRE-FILLED DATA) */}
        {editDocModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3>Edit Doctor Profile: {editDocModal.name}</h3>
              <label>Doctor Name:</label>
              <input value={editDocModal.name} onChange={e => setEditDocModal({ ...editDocModal, name: e.target.value })} style={inputStyle} />

              <label>Qualifications:</label>
              <input value={editDocModal.qualifications} onChange={e => setEditDocModal({ ...editDocModal, qualifications: e.target.value })} style={inputStyle} />

              <label>Specialties (Comma Separated):</label>
              <input value={editDocModal.specialties?.join(', ')} onChange={e => setEditDocModal({ ...editDocModal, specialties: e.target.value.split(',').map(s => s.trim()) })} style={inputStyle} />

              <label>Experience Details:</label>
              <textarea value={editDocModal.experience} onChange={e => setEditDocModal({ ...editDocModal, experience: e.target.value })} style={{ ...inputStyle, height: '60px' }} />

              <label>Update Photo:</label>
              <input type="file" accept="image/*" capture="user" onChange={(e) => handleImageUpload(e, (base64) => setEditDocModal({ ...editDocModal, photoBase64: base64 }))} style={inputStyle} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={() => saveDoctorProfile(editDocModal)} style={btnPrimaryStyle}>Save & Update Profile</button>
                <button onClick={() => setEditDocModal(null)} style={btnSecondaryStyle}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW/EDIT APPOINTMENT DETAILS MODAL */}
        {selectedPatientRecord && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3>Appointment & Medical Record</h3>
              <p><strong>Patient Name:</strong> {selectedPatientRecord.patient_name} ({selectedPatientRecord.patientId})</p>
              <p><strong>Doctor:</strong> {selectedPatientRecord.doctor_name}</p>
              <p><strong>Problem:</strong> {selectedPatientRecord.problem}</p>

              <label>Doctor Remark/Diagnosis:</label>
              <textarea defaultValue={selectedPatientRecord.doctor_remark} id="editRemark" style={{ ...inputStyle, height: '60px' }} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <div>
                  <label>Total Fee (₹):</label>
                  <input type="number" defaultValue={selectedPatientRecord.total_fee} id="editTotalFee" style={inputStyle} />
                </div>
                <div>
                  <label>Deposit Amount (₹):</label>
                  <input type="number" defaultValue={selectedPatientRecord.deposit_amount} id="editDeposit" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={async () => {
                  const remark = document.getElementById('editRemark').value;
                  const totalFee = document.getElementById('editTotalFee').value;
                  const deposit = document.getElementById('editDeposit').value;

                  const res = await fetch(`${API_BASE}/doctor/appointment/update-details`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ appointmentId: selectedPatientRecord.id, doctorRemark: remark, totalFee, depositAmount: deposit })
                  });
                  if (res.ok) {
                    alert('Record Saved!');
                    setSelectedPatientRecord(null);
                    if (userRole === 'ADMIN') fetchAdminData();
                    else fetchDoctorData(doctor.id);
                  }
                }} style={btnPrimaryStyle}>Save Record</button>
                <button onClick={() => setSelectedPatientRecord(null)} style={btnSecondaryStyle}>Close</button>
              </div>
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
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '25px', borderRadius: '8px', maxWidth: '500px', width: '90%' };