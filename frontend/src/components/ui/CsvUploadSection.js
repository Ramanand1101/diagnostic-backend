'use client';
import { useRef, useState } from 'react';
import { FiDownload, FiUploadCloud, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

function ResultModal({ result, onClose }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600">{result.created || 0}</p>
          <p className="text-xs text-green-700 mt-1">Created</p>
        </div>
        {result.updated !== undefined && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
            <p className="text-xs text-blue-700 mt-1">Updated</p>
          </div>
        )}
        <div className={`rounded-xl p-4 ${result.errors?.length ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-2xl font-bold ${result.errors?.length ? 'text-red-500' : 'text-gray-500'}`}>
            {result.errors?.length || 0}
          </p>
          <p className={`text-xs mt-1 ${result.errors?.length ? 'text-red-600' : 'text-gray-500'}`}>Errors</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-700">{result.total || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Total Rows</p>
        </div>
      </div>

      {result.errors?.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          <p className="text-sm font-medium text-gray-700 mb-2">Row errors:</p>
          {result.errors.map((e, i) => (
            <div key={i} className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <span className="font-medium">Row {e.row}:</span> {e.error}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onClose} className="btn-primary text-sm">Done</button>
      </div>
    </div>
  );
}

export default function CsvUploadSection({
  title = 'Bulk Upload via CSV',
  description,
  onDemoDownload,   // () => Promise  — calls demo-csv API
  onUpload,         // (file) => Promise — calls bulk-csv API
  demoFileName = 'template.csv',
  onSuccess,        // called after successful upload
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDemoDownload = async () => {
    try {
      const res = await onDemoDownload();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = demoFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const res = await onUpload(file);
      setResult(res.data);
      if (res.data.created > 0 || res.data.updated > 0) {
        toast.success(`Done! ${res.data.created || 0} created, ${res.data.updated || 0} updated`);
        onSuccess?.();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="border border-dashed border-gray-200 rounded-xl p-5 bg-gray-50/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDemoDownload}
              className="flex items-center gap-1.5 text-xs border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <FiDownload size={12} /> Demo CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-60"
            >
              <FiUploadCloud size={12} />
              {uploading ? 'Uploading…' : 'Upload CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Result modal overlay */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upload Result</h3>
              <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
            </div>
            <ResultModal result={result} onClose={() => setResult(null)} />
          </div>
        </div>
      )}
    </>
  );
}
