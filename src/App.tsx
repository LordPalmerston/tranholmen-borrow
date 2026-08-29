import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm py-4 px-6 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">Tranholmen Library</h1>
        </header>
        
        <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col">
          <Routes>
            <Route path="/" element={<div className="p-4 bg-white rounded-lg shadow mt-4">Welcome to Tranholmen Tool Library!</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
