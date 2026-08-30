import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, ArrowLeft, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const AdminLedger = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        snap.forEach(doc => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(fetched);
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
                  <tr key={tx.id} className="hover:bg-gray-50">
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
                      <div className="truncate max-w-[150px]" title={tx.borrower_id}>B: {tx.borrower_id}</div>
                      <div className="truncate max-w-[150px] text-gray-400" title={tx.owner_id}>O: {tx.owner_id}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {tx.hidden_by_owner && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded mr-1">Hidden: Owner</span>}
                      {tx.hidden_by_borrower && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">Hidden: Borrower</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
