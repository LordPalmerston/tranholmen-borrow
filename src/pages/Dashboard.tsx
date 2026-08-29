import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Check, MapPin, Camera, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'borrowing' | 'lending'>('borrowing');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerAddresses, setOwnerAddresses] = useState<Record<string, string>>({});

  const fetchTransactions = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const field = activeTab === 'borrowing' ? 'borrower_id' : 'owner_id';
      const q = query(collection(db, 'transactions'), where(field, '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const fetched: any[] = [];
      const ownersToFetch = new Set<string>();
      
      querySnapshot.forEach((d) => {
        const data = d.data();
        fetched.push({ id: d.id, ...data });
        if (activeTab === 'borrowing' && (data.status === 'approved' || data.status === 'active')) {
          ownersToFetch.add(data.owner_id);
        }
      });
      
      // Fetch owner addresses for approved/active borrows
      const addresses: Record<string, string> = {};
      for (const ownerId of Array.from(ownersToFetch)) {
        if (!ownerAddresses[ownerId]) {
          const ownerDoc = await getDoc(doc(db, 'users', ownerId));
          if (ownerDoc.exists()) {
            addresses[ownerId] = ownerDoc.data().street_address;
          }
        }
      }
      
      setOwnerAddresses(prev => ({...prev, ...addresses}));
      
      // Sort by created_at desc (in memory for MVP to avoid index requirements)
      fetched.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis());
      setTransactions(fetched);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, currentUser]);

  const handleApprove = async (transactionId: string, itemId: string) => {
    try {
      await updateDoc(doc(db, 'transactions', transactionId), {
        status: 'approved',
        start_time: new Date()
      });
      await updateDoc(doc(db, 'items', itemId), {
        status: 'active'
      });
      fetchTransactions();
    } catch (error) {
      console.error("Error approving request:", error);
    }
  };

  const handleStartBorrow = async (transactionId: string) => {
    try {
      await updateDoc(doc(db, 'transactions', transactionId), {
        status: 'active',
        // Assuming a standard 2-day borrow period for MVP
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      });
      fetchTransactions();
    } catch (error) {
      console.error("Error starting borrow:", error);
    }
  };

  return (
    <div className="pb-8">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 sticky top-[60px] bg-gray-50 z-10 pt-2">
        <button
          className={`flex-1 py-3 text-center text-sm font-medium border-b-2 ${
            activeTab === 'borrowing' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('borrowing')}
        >
          Borrowing
        </button>
        <button
          className={`flex-1 py-3 text-center text-sm font-medium border-b-2 ${
            activeTab === 'lending' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('lending')}
        >
          Lending
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No {activeTab} transactions found.
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map(tx => (
            <div key={tx.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900">{tx.item_title}</h3>
                <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                  tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  tx.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  tx.status === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {tx.status}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                <span className="font-medium text-gray-900">Project:</span> {tx.project_description}
              </p>

              {/* LENDING VIEW */}
              {activeTab === 'lending' && tx.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => handleApprove(tx.id, tx.item_id)}
                    className="flex-1 bg-primary text-white py-2 rounded-md text-sm font-medium flex justify-center items-center"
                  >
                    <Check size={16} className="mr-1" /> Approve
                  </button>
                </div>
              )}

              {/* BORROWING VIEW */}
              {activeTab === 'borrowing' && tx.status === 'approved' && (
                <div className="mt-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="flex items-start">
                    <MapPin size={16} className="text-primary mt-0.5 mr-2 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Pickup Address Revealed</p>
                      <p className="text-sm text-gray-900">{ownerAddresses[tx.owner_id] || 'Loading address...'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => handleStartBorrow(tx.id)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium"
                    >
                      I Picked It Up
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'borrowing' && tx.status === 'active' && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center text-orange-600 mb-3 bg-orange-50 p-2 rounded">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm font-medium">Active Loan</span>
                  </div>
                  <button 
                    onClick={() => navigate(`/return/${tx.id}`)}
                    className="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium flex justify-center items-center"
                  >
                    <Camera size={16} className="mr-2" /> Return Item
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
