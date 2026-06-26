'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PageLoader } from '@/components/ui/Spinner';
import { labApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import Link from 'next/link';
import { FiCheckCircle, FiXCircle, FiStar, FiHome, FiClock, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ids.length < 2) return;
    setLoading(true);
    labApi.compare({ ids: ids.join(',') })
      .then((res) => setLabs(res.data.labs || res.data || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const Row = ({ label, render }) => (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4 text-sm font-medium text-gray-500 bg-gray-50 w-40">{label}</td>
      {labs.map((lab) => (
        <td key={lab._id} className="py-3 px-4 text-sm text-gray-700 text-center">
          {render(lab)}
        </td>
      ))}
    </tr>
  );

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Compare Labs</h1>
          <p className="text-gray-500 text-sm mt-1">Side-by-side comparison of diagnostic labs</p>
        </div>

        {ids.length < 2 ? (
          <div className="card text-center py-16">
            <p className="text-gray-500 mb-4">Select at least 2 labs to compare.</p>
            <Link href="/labs" className="btn-primary">Browse Labs</Link>
          </div>
        ) : loading ? (
          <PageLoader />
        ) : labs.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">No labs found for comparison.</div>
        ) : (
          <div className="card p-0 overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-4 bg-gray-50 text-left text-sm font-medium text-gray-500">Feature</th>
                  {labs.map((lab) => (
                    <th key={lab._id} className="py-4 px-4 text-center">
                      <Link href={`/labs/${lab.slug}`} className="font-semibold text-primary-600 hover:underline text-sm">
                        {lab.name}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5 font-normal flex items-center justify-center gap-1">
                        <FiMapPin className="text-xs" />{lab.city}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="Rating" render={(lab) => lab.ratingAvg > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <FiStar className="text-yellow-400 fill-yellow-400" />
                    {lab.ratingAvg.toFixed(1)} ({lab.reviewCount})
                  </span>
                ) : <span className="text-gray-400">–</span>} />

                <Row label="Verified" render={(lab) => lab.verificationStatus === 'verified'
                  ? <FiCheckCircle className="text-green-500 mx-auto" />
                  : <FiXCircle className="text-gray-300 mx-auto" />} />

                <Row label="Home Collection" render={(lab) => lab.homeCollection
                  ? <FiCheckCircle className="text-green-500 mx-auto" />
                  : <FiXCircle className="text-gray-300 mx-auto" />} />

                <Row label="Report Delivery" render={(lab) => lab.reportDeliveryTime || '–'} />

                <Row label="Sample Collection" render={(lab) => lab.sampleCollectionTime || '–'} />

                <Row label="Opening Hours" render={(lab) => (
                  <span className="text-xs">{lab.openingHours || '–'}</span>
                )} />

                <Row label="Accreditation" render={(lab) => (
                  lab.accreditation?.length > 0
                    ? <div className="flex flex-wrap gap-1 justify-center">
                        {lab.accreditation.map((a) => (
                          <span key={a} className="badge bg-purple-50 text-purple-700 text-xs">{a}</span>
                        ))}
                      </div>
                    : <span className="text-gray-400">–</span>
                )} />

                <Row label="Featured" render={(lab) => lab.featured
                  ? <span className="badge bg-yellow-50 text-yellow-700 text-xs">Yes</span>
                  : <span className="text-gray-400">–</span>} />

                <tr>
                  <td className="py-4 px-4 bg-gray-50" />
                  {labs.map((lab) => (
                    <td key={lab._id} className="py-4 px-4 text-center">
                      <Link href={`/labs/${lab.slug}`} className="btn-primary text-sm py-1.5 px-4">
                        View Lab
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function CompareLabsPage() {
  return (
    <Suspense fallback={<><Navbar /><PageLoader /><Footer /></>}>
      <CompareContent />
    </Suspense>
  );
}
