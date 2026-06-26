'use client';
import { useState, useEffect } from 'react';
import { reportApi } from '@/lib/api';
import { formatDate } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { FiDownload, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchReports = () => {
    setLoading(true);
    reportApi.getAll({ limit: 100 })
      .then((res) => setReports(res.data.items || res.data.reports || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !bookingId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('report', file);
      formData.append('booking', bookingId);
      await reportApi.upload(formData);
      toast.success('Report uploaded!');
      setUploadModal(false);
      setBookingId('');
      setFile(null);
      fetchReports();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button onClick={() => setUploadModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <FiUpload /> Upload Report
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Booking</th>
                <th className="table-header">File</th>
                <th className="table-header">Status</th>
                <th className="table-header">Uploaded By</th>
                <th className="table-header">Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-sm">{r.booking?.bookingNo || r.booking}</td>
                  <td className="table-cell">{r.fileName || 'report'}</td>
                  <td className="table-cell"><Badge status={r.status} /></td>
                  <td className="table-cell">{r.uploadedBy?.name || '-'}</td>
                  <td className="table-cell">{formatDate(r.createdAt)}</td>
                  <td className="table-cell">
                    {r.fileUrl && (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-600">
                        <FiDownload />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Report">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking ID *</label>
            <input required value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="input font-mono" placeholder="Booking ObjectId" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report File *</label>
            <input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} className="input" />
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — Max 10MB</p>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setUploadModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={uploading} className="btn-primary">{uploading ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
