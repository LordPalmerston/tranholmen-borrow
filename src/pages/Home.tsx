import { Link } from 'react-router-dom';
import { Search, PlusCircle, ShieldCheck } from 'lucide-react';


export const Home = () => {
  return (
    <div className="flex flex-col space-y-6 pt-4 pb-8">
      {/* Hero Section */}
      <div className="bg-primary rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Need a tool?</h2>
          <p className="text-primary-100 mb-6 text-sm">Borrow from your neighbors instead of buying.</p>
          <Link to="/catalog" className="inline-flex items-center bg-white text-primary font-semibold py-2 px-4 rounded-full text-sm">
            <Search size={16} className="mr-2" />
            Browse Catalog
          </Link>
        </div>
        {/* Abstract shape */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/catalog" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 p-3 rounded-full mb-3 text-blue-600">
            <Search size={24} />
          </div>
          <span className="font-semibold text-gray-900 text-sm">Borrow</span>
        </Link>
        <Link to="/add-item" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-green-50 p-3 rounded-full mb-3 text-green-600">
            <PlusCircle size={24} />
          </div>
          <span className="font-semibold text-gray-900 text-sm">Lend</span>
        </Link>
      </div>

      {/* Trust Badge */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start">
        <ShieldCheck className="text-primary shrink-0 mr-3 mt-1" size={24} />
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">Verified Neighborhood</h4>
          <p className="text-xs text-gray-600 mt-1">
            Everyone here has been verified with the Tranholmen invite code. Trust your neighbors!
          </p>
        </div>
      </div>
    </div>
  );
};
