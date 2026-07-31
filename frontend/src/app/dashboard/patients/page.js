'use client';
import { useState, useEffect } from 'react';
import { patientApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import { FiUsers, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import PatientFormModal from '@/components/patient/PatientFormModal';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { edit: patient|null }

  const load = () => {
    setLoading(true);
    patientApi.getMine()
      .then((res) => setPatients(res.data.items || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRemove = async (patient) => {
    if (!confirm(`Remove ${patient.name} from your family list?`)) return;
    try {
      await patientApi.remove(patient._id);
      setPatients((ps) => ps.filter((p) => p._id !== patient._id));
      toast.success('Removed.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Family</h1>
          <p className="text-sm text-gray-500 mt-1">Every booking is tagged to a Patient ID — add family members here to book tests for them too.</p>
        </div>
        <button onClick={() => setModal({ edit: null })} className="btn-primary text-sm flex items-center gap-1.5">
          <FiPlus /> Add Family Member
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="card text-center py-16">
          <FiUsers className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No family members added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {patients.map((p) => (
            <div key={p._id} className="card flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{p.name} {p.relation === 'self' && <span className="text-xs font-normal text-primary-600">(You)</span>}</p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{p.relation}{p.age ? ` · ${p.age} yrs` : ''}{p.gender ? ` · ${p.gender}` : ''}</p>
                <p className="text-[11px] text-gray-400 mt-1">{p.patientId}</p>
              </div>
              {p.relation !== 'self' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setModal({ edit: p })} className="text-gray-400 hover:text-primary-600" title="Edit"><FiEdit2 /></button>
                  <button onClick={() => handleRemove(p)} className="text-gray-400 hover:text-red-600" title="Remove"><FiTrash2 /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PatientFormModal
          initial={modal.edit}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            setPatients((ps) => modal.edit
              ? ps.map((p) => (p._id === saved._id ? saved : p))
              : [...ps, saved]);
          }}
        />
      )}
    </div>
  );
}
