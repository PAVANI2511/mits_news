import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { authAPI, postsAPI, getMediaUrl } from '../services/api';
import { FiSearch, FiUser, FiFileText, FiFilter } from 'react-icons/fi';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const hashtagParam = searchParams.get('hashtag') || '';

  const [query, setQuery] = useState(queryParam ? queryParam : (hashtagParam ? `#${hashtagParam}` : ''));
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  
  const [postResults, setPostResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const departmentGroups = {
    'B.Tech Programs': [
      'B.Tech - Computer Science & Engineering (CSE)',
      'B.Tech - Computer Science & Technology (CST)',
      'B.Tech - Cyber Security (CS)',
      'B.Tech - Electronics & Communication Engineering (ECE)',
      'B.Tech - Electrical & Electronics Engineering (EEE)',
      'B.Tech - Mechanical Engineering (ME)',
      'B.Tech - Civil Engineering (CE)',
      'B.Tech - Artificial Intelligence (AI)',
      'B.Tech - Artificial Intelligence & Machine Learning (AI&ML)',
      'B.Tech - Computer Networks (CN)',
      'B.Tech - Data Science (DS)'
    ],
    'M.Tech Programs': [
      'M.Tech - Computer Science & Engineering (CSE)',
      'M.Tech - VLSI Design',
      'M.Tech - Electrical Power Systems (EPS)',
      'M.Tech - Machine Design',
      'M.Tech - Structural Engineering'
    ],
    'MBA': [
      'Master of Business Administration (MBA)'
    ],
    'MCA': [
      'Master of Computer Applications (MCA)'
    ],
    'Bio Informatics': [
      'Bio Informatics'
    ],
    'Other': [
      'Other'
    ]
  };

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  // Sync search input state with URL parameters when they change
  useEffect(() => {
    setQuery(queryParam ? queryParam : (hashtagParam ? `#${hashtagParam}` : ''));
  }, [queryParam, hashtagParam]);

  useEffect(() => {
    handleSearchExecution();
  }, [queryParam, hashtagParam, department, year]);

  const handleSearchExecution = async () => {
    setLoading(true);
    setError('');
    try {
      const [postsRes, usersRes] = await Promise.all([
        postsAPI.getFeed({
          q: queryParam,
          hashtag: hashtagParam,
        }),
        authAPI.searchUsers({
          q: queryParam || hashtagParam,
          department,
          year
        })
      ]);
      setPostResults(postsRes.data?.results || []);
      setUserResults(usersRes.data || []);
    } catch (err) {
      setError("An error occurred during search. Please verify connection.");
    } finally {
      setLoading(false);
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (query.startsWith('#')) {
      navigate(`/search?hashtag=${encodeURIComponent(query.slice(1).trim())}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="space-y-6">
        {/* Search Input Card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <form onSubmit={onSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search students (name/email), hashtags (#trend) or keywords..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              <FiSearch className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
            <button
              type="submit"
              className="px-6 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/95 transition-all"
            >
              Search
            </button>
          </form>

          {/* Advanced filters */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FiFilter /> Filter Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs focus:outline-none"
              >
                <option value="">All Departments</option>
                {Object.keys(departmentGroups).map(groupName => (
                  <optgroup key={groupName} label={groupName}>
                    {departmentGroups[groupName].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FiFilter /> Filter Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs focus:outline-none"
              >
                <option value="">All Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
            <span className="text-xs">Searching database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Articles Results Column (Left, 7/12 width) */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <FiFileText className="text-primary" /> Articles ({postResults.length})
              </h3>
              <div className="space-y-6">
                {postResults.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                {postResults.length === 0 && (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center text-xs text-gray-400 italic transition-all duration-300">
                    No articles matched your criteria.
                  </div>
                )}
              </div>
            </div>

            {/* Students Results Column (Right, 5/12 width) */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <FiUser className="text-primary" /> Students ({userResults.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {userResults.map((usr) => (
                  <div 
                    key={usr.id} 
                    onClick={() => navigate(`/profile/${usr.username}`)}
                    className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-primary/20 hover:shadow-sm transition-all"
                  >
                    <img
                      src={getMediaUrl(usr.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                      alt={usr.username}
                      className="h-10 w-10 rounded-full object-cover border border-border"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-text truncate">{usr.name}</h4>
                      <p className="text-[10px] text-gray-500 truncate">@{usr.username} • {usr.email}</p>
                        <div className="flex gap-1 text-[9px] text-primary font-bold mt-0.5 flex-wrap">
                          {usr.department && <span className="truncate max-w-[120px]">{usr.department.split(' ')[0]}</span>}
                          {usr.year && <span>• {usr.year}</span>}
                        </div>
                    </div>
                  </div>
                ))}
                {userResults.length === 0 && (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center text-xs text-gray-400 italic transition-all duration-300">
                    No student profiles matched your filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Search;
