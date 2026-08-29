import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  owner_first_name?: string;
  imageUrl?: string;
}

export const Catalog = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Gardening', 'Power Tools', 'Painting', 'Cleaning', 'Other'];

  useEffect(() => {
    const fetchItems = async () => {
      try {
        // In a real app with more rules, we might need a composite index here
        // For MVP, fetch all available and filter client-side for search
        const q = query(collection(db, 'items'), where('status', '==', 'available'));
        const querySnapshot = await getDocs(q);
        
        const fetchedItems: Item[] = [];
        querySnapshot.forEach((doc) => {
          fetchedItems.push({ id: doc.id, ...doc.data() } as Item);
        });
        
        setItems(fetchedItems);
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-8">
      {/* Search Header */}
      <div className="sticky top-[60px] bg-gray-50 z-10 pt-2 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="Search tools (e.g. Drill, Rake)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto mt-4 space-x-2 pb-2 scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Item Grid */}
      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mt-2">
          {filteredItems.map(item => (
            <Link key={item.id} to={`/item/${item.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="aspect-square bg-gray-200 w-full relative">
                {item.imageUrl ? (
                   <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded text-[10px] font-bold text-primary uppercase tracking-wide">
                  Available
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">Owner: {item.owner_first_name || 'Neighbor'}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center mt-12 text-gray-500">
          <p>No tools found matching your search.</p>
        </div>
      )}
    </div>
  );
};
