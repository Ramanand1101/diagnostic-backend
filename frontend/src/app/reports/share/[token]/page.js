'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { reportApi } from '@/lib/api';
import { formatDate } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import { FiDownload, FiFileText, FiShield } from 'react-icons/fi';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';

export default function SharedReportPage() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportApi.getShared(token)
      .then((res) => setReport(res.data.report || res.data))
      .catch(() => setError('This report link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <PageLoader />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiFileText className="text-2xl" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Report Not Found</h1>
      <p className="text-gray-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
        <HealthOnTimeLogo />
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
          <FiShield /> Verified Report
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="card text-center mb-6">
          <div className="w-16 h-16 bg-accent-50 text-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFileText className="text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Diagnostic Report</h1>
          <p className="text-sm text-gray-500 mb-6">
            Report for Booking #{report.booking?.bookingNo || report.booking}
          </p>

          <dl className="grid grid-cols-2 gap-4 text-left border-t border-gray-100 pt-6 mb-6">
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wider mb-1">File Name</dt>
              <dd className="text-sm font-medium text-gray-900">{report.fileName || 'report'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wider mb-1">Uploaded On</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDate(report.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</dt>
              <dd className="text-sm font-medium text-gray-900 capitalize">{report.status}</dd>
            </div>
            {report.uploadedBy?.name && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-1">Uploaded By</dt>
                <dd className="text-sm font-medium text-gray-900">{report.uploadedBy.name}</dd>
              </div>
            )}
          </dl>

          {report.fileUrl && (
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 py-3 px-8"
            >
              <FiDownload /> Download Report
            </a>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          This is a securely shared diagnostic report from HealthOnTime.
          Do not share this link publicly.
        </p>
      </main>
    </div>
  );
}
