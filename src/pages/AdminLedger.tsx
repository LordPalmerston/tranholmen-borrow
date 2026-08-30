import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, ArrowLeft, Calendar, Package, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const AdminLedger = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  useEffect(() => {
    if (!userProfile?.is_admin) {
      setLoading(false);
      return;
    }
    
    const fetchAll = async () => {
      try {
        const q = query(collection(db, 'transactions'), orderBy('created_at', 'desc'));
        const snap = await getDocs(q);
        const fetched: any[] = [];
        const uids = new Set<string>();
        
        snap.forEach(doc => {
          const data = doc.data();
          fetched.push({ id: doc.id, ...data });
          if (data.borrower_id) uids.add(data.borrower_id);
          if (data.owner_id) uids.add(data.owner_id);
        });
        
        setTransactions(fetched);

        // Fetch user names
        const newUsersMap: Record<string, string> = {};
        for (const uid of uids) {
          try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              const udata = userSnap.data();
              newUsersMap[uid] = `${udata.first_name} ${udata.last_name}`;
            } else {
              newUsersMap[uid] = 'Unknown User';
            }
          } catch (e) {
            newUsersMap[uid] = 'Unknown User';
          }
        }
        setUsersMap(newUsersMap);

      } catch (err: any) {
        console.error("Admin fetch error", err);
        setError(err.message || "Failed to fetch transactions.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), 'MMM d, yyyy HH:mm');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading ledger...</div>;
  }

  if (!userProfile?.is_admin) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">You must be an administrator to view the master ledger.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-white rounded-lg font-medium">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center mb-6 pt-4 sticky top-[60px] bg-white z-10 pb-4 border-b border-gray-100">
        <Link to="/profile" className="p-2 mr-3 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Master Ledger</h1>
          <p className="text-sm text-gray-500">Complete, immutable log of all activity.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Borrower / Owner</th>
                <th className="px-4 py-3">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                    No transactions found in the database.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr 
                    key={tx.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1.5 text-gray-400" />
                        {formatDate(tx.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[150px]" title={tx.item_title}>
                      {tx.item_title || 'Unknown Item'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        tx.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        tx.status === 'active' ? 'bg-green-100 text-green-800' :
                        tx.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="truncate max-w-[150px] font-medium text-gray-900" title={usersMap[tx.borrower_id]}>
                        B: {usersMap[tx.borrower_id] || 'Loading...'}
                      </div>
                      <div className="truncate max-w-[150px] text-gray-500" title={usersMap[tx.owner_id]}>
                        O: {usersMap[tx.owner_id] || 'Loading...'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {tx.hidden_by_owner && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded mr-1">Hide: O</span>}
                      {tx.hidden_by_borrower && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">Hide: B</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-900 flex items-center">
                <Package size={18} className="mr-2 text-primary" />
                Transaction Details
              </h2>
              <button 
                onClick={() => setSelectedTx(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedTx.item_title}</h3>
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold capitalize ${
                  selectedTx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  selectedTx.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  selectedTx.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedTx.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Status: {selectedTx.status}
                </span>
              </div>

              <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Borrower</span>
                  <span className="text-sm font-medium text-gray-900">{usersMap[selectedTx.borrower_id]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Owner</span>
                  <span className="text-sm font-medium text-gray-900">{usersMap[selectedTx.owner_id]}</span>
                </div>
                {selectedTx.project_description && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500 block mb-1">Project</span>
                    <p className="text-sm text-gray-800 italic">"{selectedTx.project_description}"</p>
                  </div>
                )}
              </div>

              <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Timeline Log</h4>
              <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                
                {selectedTx.created_at && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-gray-300 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-gray-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-xs">Requested</span>
                      </div>
                      <div className="text-gray-500 text-xs">{formatDate(selectedTx.created_at)}</div>
                    </div>
                  </div>
                )}

                {selectedTx.start_time && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-blue-400 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-gray-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-xs">Approved</span>
                      </div>
                      <div className="text-gray-500 text-xs">{formatDate(selectedTx.start_time)}</div>
                    </div>
                  </div>
                )}

                {selectedTx.picked_up_at && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-green-400 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-gray-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-xs">Picked Up</span>
                      </div>
                      <div className="text-gray-500 text-xs">{formatDate(selectedTx.picked_up_at)}</div>
                    </div>
                  </div>
                )}

                {selectedTx.returned_at && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-purple-400 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-gray-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-xs">Returned</span>
                      </div>
                      <div className="text-gray-500 text-xs">{formatDate(selectedTx.returned_at)}</div>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedTx.return_condition && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">Return Condition</h4>
                  <p className="text-sm text-gray-600 mb-3">{selectedTx.return_condition}</p>
                  {selectedTx.return_photo_url && (
                    <img 
                      src={selectedTx.return_photo_url} 
                      alt="Return proof" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                  )}
                </div>
              )}
              
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
