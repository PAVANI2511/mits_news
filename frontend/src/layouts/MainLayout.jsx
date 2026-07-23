import React from 'react';
import Navbar from '../components/Navbar';

const MainLayout = ({ children, sidebar = null }) => {
  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className={`grid grid-cols-1 ${sidebar ? 'lg:grid-cols-4' : ''} gap-6`}>
          <div className={`${sidebar ? 'lg:col-span-3' : 'w-full'}`}>
            {children}
          </div>
          {sidebar && (
            <div className="lg:col-span-1 hidden lg:block">
              {sidebar}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
