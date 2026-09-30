import React, { useState, useEffect } from 'react';
import { adminAPI } from '@food/api';
import { toast } from 'sonner';
import { X, Loader2, Navigation, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react';

export default function AssignDeliveryModal({ 
  orderId, 
  isOpen, 
  onClose, 
  onAssigned,
  currentPartnerName = '',
  currentPartnerPhone = ''
}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [currentPartnerId, setCurrentPartnerId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPartners();
    }
  }, [isOpen, orderId]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAvailableDeliveryPartners({ orderId });
      if (res?.data?.success) {
        setPartners(res.data.data.availablePartners || []);
        if (res.data.data.currentPartnerId) {
          setCurrentPartnerId(res.data.data.currentPartnerId);
        }
      }
    } catch (error) {
      toast.error('Failed to load available partners');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (partnerId) => {
    try {
      setAssigningId(partnerId);
      const res = await adminAPI.assignDeliveryPartner(orderId, partnerId);
      if (res?.data?.success) {
        const isReassign = !!(currentPartnerName || currentPartnerId);
        toast.success(isReassign ? 'Delivery partner reassigned successfully!' : 'Delivery partner assigned successfully!');
        onAssigned();
        onClose();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign partner');
    } finally {
      setAssigningId(null);
    }
  };

  if (!isOpen) return null;

  const isReassignMode = !!(currentPartnerName || currentPartnerId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            {isReassignMode ? (
              <RefreshCw className="w-5 h-5 text-blue-600" />
            ) : (
              <UserCheck className="w-5 h-5 text-orange-600" />
            )}
            <h2 className="text-lg font-bold text-gray-800">
              {isReassignMode ? 'Reassign Delivery Partner' : 'Assign Delivery Partner'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Partner Alert Banner (If Reassigning) */}
        {currentPartnerName && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div>
              <span className="font-medium text-amber-700">Currently Assigned: </span>
              <span className="font-bold">{currentPartnerName}</span>
              {currentPartnerPhone && <span className="ml-1 text-amber-600">({currentPartnerPhone})</span>}
            </div>
            <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded text-[10px] font-semibold">
              Needs Reassignment
            </span>
          </div>
        )}

        {/* Partners List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-gray-500 font-medium">Finding available partners...</p>
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Navigation className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-800 font-semibold mb-1">No Partners Available</p>
              <p className="text-sm text-gray-500 max-w-xs">
                There are currently no online delivery partners available for this order's zone.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {partners.map((partner) => {
                const isCurrent = partner.isCurrentPartner || (currentPartnerId && String(partner._id) === String(currentPartnerId));
                return (
                  <li key={partner._id} className={`bg-white rounded-xl p-4 border shadow-sm flex items-center justify-between transition-all ${isCurrent ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        {partner.profilePhoto ? (
                          <img src={partner.profilePhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-gray-200">
                            {partner.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
                          {partner.name}
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                              Current
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-500">{partner.phone}</p>
                        {partner.zone ? (
                          <p className="text-[11px] text-gray-500">Zone: {partner.zone}</p>
                        ) : null}
                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${isCurrent ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-600'}`}>
                          {isCurrent ? 'Assigned to this order' : 'Online & Available'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(partner._id)}
                      disabled={assigningId === partner._id || isCurrent}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                        isCurrent
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          : assigningId === partner._id
                          ? 'bg-primary/20 text-primary cursor-not-allowed'
                          : isReassignMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95'
                          : 'bg-primary text-white hover:bg-primary/90 shadow-sm active:scale-95'
                      }`}
                    >
                      {assigningId === partner._id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isReassignMode ? 'Reassigning...' : 'Assigning...'}
                        </>
                      ) : isCurrent ? (
                        'Assigned'
                      ) : (
                        <>
                          {isReassignMode ? 'Reassign' : 'Assign'}
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
