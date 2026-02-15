import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, ArrowLeft, Trash2, X, Camera } from 'lucide-react';

// --- DATABASE CONFIG ---
const DB_NAME = 'PokerTrackerDB';
const DB_VERSION = 1;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
};

// --- DB HELPERS ---
const saveToDB = async (storeName, data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const request = transaction.objectStore(storeName).put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getFromDB = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- IMAGE COMPRESSION ---
const compressImage = (base64Str, maxWidth = 600, maxHeight = 600) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.5)); // Reduced quality for mobile performance
    };
  });
};

const PokerTracker = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [gameType, setGameType] = useState('cash');
  const [location, setLocation] = useState('');
  const [stakes, setStakes] = useState('');
  const [sessionImages, setSessionImages] = useState([]);
  const [suggestions, setSuggestions] = useState({ locations: [], stakes: [] });

  useEffect(() => {
    const loadData = async () => {
      try {
        const userSetting = await getFromDB('settings', 'currentUser');
        if (userSetting) {
          const user = await getFromDB('users', userSetting.value);
          if (user) {
            setCurrentUser(user.username);
            setUserData(user);
            updateSuggestions(user.sessions);
          }
        }
      } catch (e) { console.error("Load error", e); }
      setLoading(false);
    };
    loadData();
  }, []);

  const updateSuggestions = (sessions) => {
    const locs = [...new Set(sessions.map(s => s.location))].filter(Boolean);
    const stks = [...new Set(sessions.map(s => s.stakes))].filter(Boolean);
    setSuggestions({ locations: locs, stakes: stks });
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setSessionImages(prev => [...prev, compressed].slice(0, 3));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSession = async (sessionData) => {
    const updatedSessions = [...(userData.sessions || []), { ...sessionData, id: Date.now() }];
    const updatedUser = { ...userData, sessions: updatedSessions };
    await saveToDB('users', updatedUser);
    setUserData(updatedUser);
    updateSuggestions(updatedSessions);
    setView('dashboard');
  };

  if (loading) return <div className="p-8 text-white bg-gray-950 min-h-screen">Loading Database...</div>;

  // Render Login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-green-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-6">Poker Tracker</h1>
          <input 
            type="text" 
            placeholder="Username" 
            className="w-full p-3 rounded bg-gray-800 text-white mb-4"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && e.target.value) {
                const name = e.target.value.trim();
                const newUser = { username: name, sessions: [] };
                await saveToDB('users', newUser);
                await saveToDB('settings', { key: 'currentUser', value: name });
                setCurrentUser(name);
                setUserData(newUser);
              }
            }}
          />
          <p className="text-gray-400 text-xs">Press Enter to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {view === 'dashboard' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Welcome, {currentUser}</h2>
            <button onClick={() => setView('entry')} className="bg-green-600 p-2 rounded-lg"><Plus /></button>
          </div>
          
          {/* Recent Sessions List */}
          <div className="space-y-2">
            {userData.sessions.map(s => (
              <div key={s.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between">
                  <span>{s.location} - {s.stakes}</span>
                  <span className={s.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    ${s.profit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
           <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-gray-400"><ArrowLeft /> Back</button>
           <div className="space-y-4">
              <input 
                list="location-list"
                placeholder="Location" 
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full p-4 bg-gray-900 rounded-xl border border-gray-800"
              />
              <datalist id="location-list">
                {suggestions.locations.map(l => <option key={l} value={l} />)}
              </datalist>

              <div className="grid grid-cols-3 gap-2">
                {sessionImages.map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={img} className="w-full h-full object-cover rounded-lg" />
                    <button onClick={() => setSessionImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-600 rounded-full p-1"><X size={12}/></button>
                  </div>
                ))}
                {sessionImages.length < 3 && (
                  <label className="aspect-square bg-gray-900 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center">
                    <Camera className="text-gray-600" />
                    <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
                  </label>
                )}
              </div>

              <button 
                onClick={() => saveSession({ location, stakes, profit: 0, images: sessionImages })}
                className="w-full bg-green-600 py-4 rounded-xl font-bold"
              >
                Save Session
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PokerTracker;
