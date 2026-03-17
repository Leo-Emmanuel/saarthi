import { useCallback, useEffect, useState } from 'react';
import api from '../config/axios';
import '../styles/dashboard.css';

/**
 * StaffPanel — create/list/delete teacher and admin accounts.
 */
export default function StaffPanel() {
    console.log('[StaffPanel] rendering');
    const [staff, setStaff] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('teacher');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const loadStaff = useCallback(async () => {
        setFetchError('');
        try {
            const res = await api.get('/admin/staff');
            console.log('[StaffPanel] staff loaded:', res.data);
            setStaff(Array.isArray(res.data) ? res.data : []);
        } catch {
            setFetchError('Failed to load staff. Please refresh and try again.');
        }
    }, []);

    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setRole('teacher');
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        try {
            const res = await api.post('/admin/staff', {
                name,
                email,
                password,
                role,
            });
            setMessage(res.data?.message || 'Staff member created successfully');
            setIsError(false);
            resetForm();
            await loadStaff();
        } catch (error) {
            setMessage(error?.response?.data?.error || 'Failed to create staff member');
            setIsError(true);
        }
    };

    const handleDelete = async (staffMember) => {
        const targetId = staffMember?._id;
        if (!targetId) return;
        if (!window.confirm(`Delete ${staffMember.name} (${staffMember.role})?`)) return;

        setMessage('');
        setIsError(false);
        try {
            const res = await api.delete(`/admin/staff/${targetId}`);
            setMessage(res.data?.message || 'Staff member deleted');
            setIsError(false);
            setStaff((prev) => prev.filter((s) => s._id !== targetId));
        } catch (error) {
            setMessage(error?.response?.data?.error || 'Failed to delete staff member');
            setIsError(true);
        }
    };

    return (
        <>
            <div
                className="p-6 rounded-lg shadow-md mb-8"
                style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    border: '3px solid var(--border)',
                }}
            >
                <h2 className="mb-4" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                    Staff Management
                </h2>
                {message && (
                    <div
                        className="p-2 mb-4 rounded"
                        style={{
                            background: isError ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.12)',
                            color: isError ? 'var(--danger)' : 'var(--success)',
                            border: `2px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
                        }}
                    >
                        {message}
                    </div>
                )}
                {fetchError && (
                    <div
                        className="p-2 mb-4 rounded"
                        role="alert"
                        style={{
                            background: 'rgba(255,68,68,0.15)',
                            color: 'var(--danger)',
                            border: '2px solid var(--danger)',
                        }}
                    >
                        {fetchError}
                    </div>
                )}

                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Full Name"
                        className="input-dark w-full"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        className="input-dark w-full"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password (min 6 chars)"
                        className="input-dark w-full"
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <select
                        className="input-dark w-full"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="md:col-span-2 btn btn-primary">
                        Add Staff Member
                    </button>
                </form>
            </div>

            <div className="table-shell p-6 mb-8">
                <h2 className="mb-4" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Staff Members
                </h2>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((s) => (
                                <tr key={s._id}>
                                    <td>{s.name}</td>
                                    <td>{s.email}</td>
                                    <td>
                                        <span
                                            className="badge"
                                            style={{
                                                background: s.role === 'admin' ? 'rgba(245, 184, 73, 0.16)' : 'rgba(70, 130, 255, 0.16)',
                                                color: s.role === 'admin' ? '#f5b849' : '#6ea8ff',
                                                border: `1px solid ${s.role === 'admin' ? '#f5b849' : '#6ea8ff'}`,
                                            }}
                                        >
                                            {s.role}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={() => handleDelete(s)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {staff.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-5 py-5 text-center" style={{ color: 'var(--text-secondary)' }}>
                                        No staff members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
