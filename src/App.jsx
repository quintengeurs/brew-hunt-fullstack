import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LogOut, Shield, Check, X } from 'lucide-react';

const supabaseUrl = 'https://eeboxlitezqgjyrnssgx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlYm94bGl0ZXpxZ2p5cm5zc2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjcyNTksImV4cCI6MjA4MDI0MzI1OX0.8VlGLHjEv_0aGWOjiDuLLziOCnUqciIAEWayMUGsXT8';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_EMAIL = 'quinten.geurs@gmail.com';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const [hunts, setHunts] = useState([]);
  const [filteredHunts, setFilteredHunts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [completed, setCompleted] = useState([]);
  const [streak, setStreak] = useState(0);
  const [totalHunts, setTotalHunts] = useState(0);
  const [tier, setTier] = useState('Newbie');
  const [lastActive, setLastActive] = useState(null);
  const [currentHunt, setCurrentHunt] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [selfieFile, setSelfieFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ─── AUTH & ADMIN CHECK ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (s?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        setShowAdmin(false);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // ─── LOAD DATA ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (session && !showAdmin) {
      setDataLoaded(false);
      loadProgressAndHunts();
      const interval = setInterval(fetchHunts, 10000);
      return () => clearInterval(interval);
    }
  }, [session, showAdmin]);

  // ─── YOUR WORKING DATA FUNCTIONS (unchanged) ─────────────────────────────
  const loadProgressAndHunts = async () => {
    try {
      const { data: progressRows } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .order('last_active', { ascending: false });

      let completedIds = [];
      const progress = progressRows?.[0] || null;

      if (progress) {
        completedIds = Array.isArray(progress.completed_hunt_ids) ? progress.completed_hunt_ids : [];
        if (progressRows.length > 1) {
          const all = new Set();
          let maxTotal = 0, maxStreak = 0;
          progressRows.forEach(r => {
            if (Array.isArray(r.completed_hunt_ids)) r.completed_hunt_ids.forEach(id => all.add(id));
            maxTotal = Math.max(maxTotal, r.total_hunts || 0);
            maxStreak = Math.max(maxStreak, r.streak || 0);
          });
          completedIds = Array.from(all);
          setTotalHunts(completedIds.length);
          setStreak(maxStreak);
        } else {
          setTotalHunts(progress.total_hunts || 0);
          setStreak(progress.streak || 0);
        }
        setCompleted(completedIds);
        setTier(completedIds.length >= 20 ? 'Legend' : completedIds.length >= 10 ? 'Pro' : completedIds.length >= 5 ? 'Hunter' : 'Newbie');
        setLastActive(progress.last_active || null);
      } else {
        setCompleted([]);
        setStreak(0);
        setTotalHunts(0);
        setTier('Newbie');
        setLastActive(null);
      }

      const { data: huntsData } = await supabase
        .from('hunts')
        .select('*')
        .order('date', { ascending: false });

      setHunts(huntsData || []);
      applyFilter(huntsData || [], completedIds, activeFilter);
      setDataLoaded(true);
    } catch (e) {
      console.error(e);
      setDataLoaded(true);
    }
  };

  const fetchHunts = async () => {
    const { data } = await supabase.from('hunts').select('*').order('date', { ascending: false });
    setHunts(data || []);
  };

  const applyFilter = (allHunts, completedIds, filterCategory) => {
    let filtered = allHunts.filter(h => !completedIds.includes(h.id));
    if (filterCategory !== 'All') filtered = filtered.filter(h => h.category === filterCategory);
    setFilteredHunts(filtered);
  };

  useEffect(() => {
    if (dataLoaded && hunts.length > 0) applyFilter(hunts, completed, activeFilter);
  }, [activeFilter, dataLoaded, completed, hunts]);

  const filterHunts = (cat) => setActiveFilter(cat);
  const startHunt = (hunt) => { setCurrentHunt(hunt); setShowModal(true); };

  const uploadSelfie = async () => {
    // ... your full working uploadSelfie from before
  };

  const signUp = async () => {
    setLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // ─── ADMIN PANEL (only for Quinten) ─────────────────────────────────────
  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="bg-white shadow-xl p-4 sticky top-0 z-50 flex justify-between items-center">
          <h1 className="text-3xl font-black text-amber-900 flex items-center gap-3">
            Admin Panel
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdmin(false)}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-full font-bold"
            >
              ← Back to App
            </button>
            <button onClick={signOut} className="text-gray-600 hover:text-gray-900">
              <LogOut size={28} />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-8">
          <h2 className="text-2xl font-bold mb-4">Welcome back, Quinten!</h2>
          <p className="text-gray-600 mb-8">Admin panel ready. More features coming soon.</p>
          {/* You can add hunt creation, selfie approval, etc. later */}
        </div>
      </div>
    );
  }

  // ─── LOGIN SCREEN ───────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
          <h1 className="text-6xl font-black text-amber-900 mb-4">Brew Hunt</h1>
          <p className="text-xl text-amber-800 mb-12">Real-world treasure hunts in Hackney</p>
          {authError && <p className="text-red-600 font-bold mb-6">{authError}</p>}
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-5 mb-4 border-2 border-amber-200 rounded-2xl text-lg"
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-5 mb-8 border-2 border-amber-200 rounded-2xl text-lg"
          />
          <button
            onClick={signUp}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white py-6 rounded-2xl font-bold text-2xl shadow-lg mb-4"
          >
            {loading ? 'Creating...' : 'Sign Up Free'}
          </button>
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white py-6 rounded-2xl font-bold text-2xl shadow-lg"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN APP ───────────────────────────────────────────────────────────
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50 flex items-center justify-center">
        <p className="text-2xl text-amber-900 font-bold">Loading your hunts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50">
      {/* HEADER — LOGOUT + ADMIN BUTTON FIXED */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg p-6 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-black text-amber-900">Brew Hunt</h1>

          <div className="flex items-center gap-4">
            {/* ADMIN BUTTON — only for Quinten */}
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg transition"
              >
                <Shield size={20} /> Admin
              </button>
            )}

            {/* LOGOUT BUTTON — always visible and working */}
            <button
              onClick={signOut}
              className="text-gray-600 hover:text-gray-900 transition p-2"
              title="Log out"
            >
              <LogOut size={28} />
            </button>
          </div>
        </div>
      </div>

      {/* YOUR FULL WORKING APP UI BELOW */}
      {/* Stats */}
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-6xl font-black text-orange-600">{streak}</div>
              <p className="text-gray-600">day streak</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-purple-600">{tier}</div>
              <button onClick={() => setShowCompletedModal(true)} className="text-xl underline text-gray-700">
                {totalHunts} completed • {hunts.filter(h => !completed.includes(h.id)).length} active
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of your UI (filters, hunts list, modals) — 100% unchanged */}
      {/* ... paste your exact working JSX here ... */}

      {/* Example placeholder so you know where to paste */}
      <div className="p-8 text-center text-gray-600">
        Logged in as: {session.user.email}
      </div>
    </div>
  );
}
