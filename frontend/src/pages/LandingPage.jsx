import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiEdit3, FiAward, FiShare2 } from 'react-icons/fi';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-300 flex flex-col justify-between">
      {/* Navbar Stub */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="text-xl font-extrabold text-primary flex items-center gap-1.5">
          <span className="bg-primary text-white px-2 py-0.5 rounded font-mono">MITS</span>
          <span>Newspaper</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/feed" className="text-sm font-semibold text-gray-500 hover:text-text transition">
            Explore Feed
          </Link>
          <Link to="/login" className="px-4.5 py-1.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/95 shadow-sm transition">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <FiAward /> The Official Student Voice
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-text leading-tight">
            Madanapalle Institute of <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Technology & Science
            </span>
            <br />
            Newspaper Portal
          </h1>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-gray-500 leading-relaxed">
            A premium full-stack social publishing portal built for MITS. Register using your <b>@mits.ac.in</b> email to post articles, upload media, share campus stories, and choose custom layouts.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
          <Link 
            to="/register" 
            className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/95 shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all"
          >
            Create Student Profile <FiArrowRight />
          </Link>
          <Link 
            to="/feed" 
            className="w-full sm:w-auto px-8 py-4 bg-card border border-border text-text rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-bg transition"
          >
            Enter as Viewer
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <div className="bg-card border border-border p-6 rounded-2xl text-left hover:border-primary/20 hover:shadow-md transition">
            <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit mb-4">
              <FiEdit3 className="text-xl" />
            </div>
            <h3 className="font-bold text-base text-text">Student Publishing</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Upload rich articles with text, location, images, videos, audio recordings, college posters, and PDF documents. Add background music to give your posts a premium vibe.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl text-left hover:border-primary/20 hover:shadow-md transition">
            <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit mb-4">
              <FiBookOpen className="text-xl" />
            </div>
            <h3 className="font-bold text-base text-text">Anonymous Viewer Mode</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              No registration required. Explore campus news, read student write-ups, search people by year or department, and access publicly released campus bulletins.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl text-left hover:border-primary/20 hover:shadow-md transition">
            <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit mb-4">
              <FiShare2 className="text-xl" />
            </div>
            <h3 className="font-bold text-base text-text">Customization</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Personalize your dashboard theme: Select Light, Dark, Blue, Purple, Green, College Maroon, or define a Custom palette. Theme state syncs dynamically to MongoDB!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-border flex items-center justify-center text-xs text-gray-400">
        © {new Date().getFullYear()} MITS Newspaper. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
