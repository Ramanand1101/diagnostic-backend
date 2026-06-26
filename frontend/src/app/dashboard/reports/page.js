'use client';
import { useState, useEffect } from 'react';
import { reportApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Spinner from '@/components/ui/Spinner';
import { FiDownload, FiShare2, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    reportApi.getAll()
      .then((res) => setReports(res.data.items || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleShare = (token) => {
    const url = `${window.location.origin}/reports/share/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Share link copied!'));
  };

  const handleDownload = async (report) => {
    setDownloading(report._id);
    try {
      const res = await reportApi.getDownloadUrl(report._id);
      const link = document.createElement('a');
      link.href = res.data.url;
      link.download = report.fileName || 'report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>

      {loading ? <PageLoader /> : reports.length === 0 ? (
        <div className="card text-center py-16">
          <FiFileText className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No reports available yet</p>
          <p className="text-sm text-gray-400 mt-1">Reports will appear here once your tests are processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isDownloading = downloading === report._id;
            const compressionPct = report.originalSize && report.fileSize
              ? Math.round((1 - report.fileSize / report.originalSize) * 100)
              : 0;

            return (
              <div key={report._id} className="card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center text-accent-500 flex-shrink-0">
                    <FiFileText className="text-lg" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{report.fileName || 'Report'}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(report.createdAt)} &bull; Booking: #{report.booking?.bookingNo || report.booking}
                    </p>
                    {report.fileSize > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatBytes(report.fileSize)}
                        {compressionPct > 0 && (
                          <span className="ml-1 text-green-600">· {compressionPct}% compressed</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="badge bg-green-50 text-green-700 text-xs capitalize">{report.status}</span>

                  {report.sharedToken && (
                    <button
                      onClick={() => handleShare(report.sharedToken)}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                      title="Copy share link"
                    >
                      <FiShare2 />
                    </button>
                  )}

                  {report.storageKey && (
                    <button
                      onClick={() => handleDownload(report)}
                      disabled={isDownloading}
                      className="text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-60"
                      title="Download report"
                    >
                      {isDownloading ? <Spinner size="sm" /> : <FiDownload />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
