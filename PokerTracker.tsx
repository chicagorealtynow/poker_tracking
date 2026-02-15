import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, ArrowLeft, Trash2, X } from 'lucide-react';

// IndexedDB helper functions
const DB_NAME = 'PokerTrackerDB';
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
  });
};

const saveToIndexedDB = async (storeName, data) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB save error:', error);
    throw error;
  }
};

const getFromIndexedDB = async (storeName, key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB get error:', error);
    return null;
  }
};

const deleteFromIndexedDB = async (storeName, key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB delete error:', error);
  }
};

// Convert base64 to blob for efficient storage
const base64ToBlob = (base64) => {
  const parts = base64.split(',');
  const contentType = parts[0].match(/:(.*?);/)[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
};

// Convert blob back to base64 for display
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Store image as blob
const saveImage = async (base64Data, imageId) => {
  try {
    const blob = base64ToBlob(base64Data);
    await saveToIndexedDB('images', { id: imageId, blob });
    return imageId;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
};

// Load image from blob
const loadImage = async (imageId) => {
  try {
    const result = await getFromIndexedDB('images', imageId);
    if (result && result.blob) {
      return await blobToBase64(result.blob);
    }
    return null;
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};

// Delete image
const deleteImage = async (imageId) => {
  try {
    await deleteFromIndexedDB('images', imageId);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

// HELPER: Compresses images aggressively
const compressImage = (base64Str, maxWidth = 400, maxHeight = 400, quality = 0.5) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const PokerTracker = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState('dashboard');
  const [editingSession, setEditingSession] = useState(null);
  const [visibleLines, setVisibleLines] = useState(['Combined', 'Cash', 'Tournament']);
  const [loading, setLoading] = useState(true);

  // Image cache for current session
  const [imageCache, setImageCache] = useState({});

  // Dropdown suggestions
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [stakeSuggestions, setStakeSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showStakesDropdown, setShowStakesDropdown] = useState(false);

  // Form state
  const [gameType, setGameType] = useState('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const [location, setLocation] = useState('');
  const [stakes, setStakes] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [tableQuality, setTableQuality] = useState(0);
  const [mentalGame, setMentalGame] = useState('');
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState('');
  const [sessionImageIds, setSessionImageIds] = useState([]);

  // Tournament fields
  const [buyinAmount, setBuyinAmount] = useState('');
  const [buyinFee, setBuyinFee] = useState('');
  const [reentries, setReentries] = useState('0');
  const [finishPosition, setFinishPosition] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [prize, setPrize] = useState('');

  // Initialize - load from IndexedDB only
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      try {
        const currentUserData = await getFromIndexedDB('settings', 'currentUser');
        if (currentUserData) {
          setCurrentUser(currentUserData.value);
          const user = await getFromIndexedDB('users', currentUserData.value);
          if (user) {
            setUserData(user);
            updateSuggestions(user.sessions || []);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
      
      setLoading(false);
    };
    
    initialize();
  }, []);

  // Load images for display
  useEffect(() => {
    const loadImages = async () => {
      const newCache = {};
      for (const imageId of sessionImageIds) {
        if (!imageCache[imageId]) {
          const base64 = await loadImage(imageId);
          if (base64) {
            newCache[imageId] = base64;
          }
        }
      }
      if (Object.keys(newCache).length > 0) {
        setImageCache(prev => ({ ...prev, ...newCache }));
      }
    };
    
    if (sessionImageIds.length > 0) {
      loadImages();
    }
  }, [sessionImageIds]);

  // Update suggestions based on existing sessions
  const updateSuggestions = (sessions) => {
    const locations = [...new Set(sessions.map(s => s.location).filter(Boolean))];
    const stakes = [...new Set(sessions.map(s => s.stakes).filter(Boolean))];
    setLocationSuggestions(locations);
    setStakeSuggestions(stakes);
  };

  const createUser = async (username) => {
    try {
      const newUser = {
        username,
        createdAt: new Date().toISOString(),
        sessions: [],
        locations: [],
        tags: ['tired', 'tilted', 'good_table', 'ran_hot', 'ran_cold', 'tough_table']
      };
      
      await saveToIndexedDB('users', newUser);
      await saveToIndexedDB('settings', { key: 'currentUser', value: username });
      setCurrentUser(username);
      setUserData(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user. Please try again.');
    }
  };

  const calculateDuration = (start, end) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let minutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (minutes < 0) minutes += 24 * 60;
    return minutes;
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file && sessionImageIds.length < 3) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result);
          const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await saveImage(compressed, imageId);
          setSessionImageIds(prev => [...prev, imageId]);
          setImageCache(prev => ({ ...prev, [imageId]: compressed }));
        } catch (error) {
          console.error('Error processing image:', error);
          alert('Error saving image. Storage may be full. Try removing old sessions first.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = async (imageId) => {
    await deleteImage(imageId);
    setSessionImageIds(prev => prev.filter(id => id !== imageId));
    setImageCache(prev => {
      const newCache = { ...prev };
      delete newCache[imageId];
      return newCache;
    });
  };

  const toggleLine = (line) => {
    setVisibleLines(prev => 
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  const deleteSession = async (session, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        // Delete associated images
        if (session.imageIds && session.imageIds.length > 0) {
          for (const imageId of session.imageIds) {
            await deleteImage(imageId);
          }
        }
        
        const updatedSessions = userData.sessions.filter(s => s.id !== session.id);
        const updatedUser = { ...userData, sessions: updatedSessions };
        await saveToIndexedDB('users', updatedUser);
        setUserData(updatedUser);
        updateSuggestions(updatedSessions);
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Error deleting session. Please try again.');
      }
    }
  };

  const saveSession = async () => {
    if (!currentUser) return;
    
    try {
      const durationMinutes = calculateDuration(startTime, endTime);
      let netProfit = 0;

      if (gameType === 'cash') {
        netProfit = parseFloat(cashOut || 0) - parseFloat(buyIn || 0);
      } else {
        const perEntry = parseFloat(buyinAmount || 0) + parseFloat(buyinFee || 0);
        const totalInvested = perEntry + (parseInt(reentries || 0) * perEntry);
        netProfit = parseFloat(prize || 0) - totalInvested;
      }

      // If editing, delete old images that were removed
      if (editingSession && editingSession.imageIds) {
        const removedIds = editingSession.imageIds.filter(id => !sessionImageIds.includes(id));
        for (const imageId of removedIds) {
          await deleteImage(imageId);
        }
      }

      const session = {
        id: editingSession?.id || `sess_${Date.now()}`,
        game_type: gameType,
        date,
        start_time: startTime,
        end_time: endTime,
        location,
        stakes,
        buy_in: gameType === 'cash' ? parseFloat(buyIn || 0) : null,
        cash_out: gameType === 'cash' ? parseFloat(cashOut || 0) : null,
        buyin_amount: gameType === 'tournament' ? parseFloat(buyinAmount || 0) : null,
        buyin_fee: gameType === 'tournament' ? parseFloat(buyinFee || 0) : null,
        reentries: gameType === 'tournament' ? parseInt(reentries || 0) : null,
        finish_position: gameType === 'tournament' ? parseInt(finishPosition || 0) : null,
        field_size: gameType === 'tournament' ? parseInt(fieldSize || 0) : null,
        prize: gameType === 'tournament' ? parseFloat(prize || 0) : null,
        imageIds: sessionImageIds,
        duration_minutes: durationMinutes,
        net_profit: netProfit,
        table_quality: tableQuality,
        mental_game: mentalGame,
        tags,
        notes
      };

      const updatedSessions = editingSession
        ? userData.sessions.map(s => s.id === session.id ? session : s)
        : [...userData.sessions, session];
      
      const updatedUser = { ...userData, sessions: updatedSessions };
      await saveToIndexedDB('users', updatedUser);
      setUserData(updatedUser);
      updateSuggestions(updatedSessions);

      resetForm();
      setView('dashboard');
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error saving session. Storage may be full. Try deleting old sessions or images.');
    }
  };

  const resetForm = () => {
    setGameType('cash');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('19:00');
    setEndTime('23:00');
    setLocation('');
    setStakes('');
    setBuyIn('');
    setCashOut('');
    setBuyinAmount('');
    setBuyinFee('');
    setReentries('0');
    setFinishPosition('');
    setFieldSize('');
    setPrize('');
    setTableQuality(0);
    setMentalGame('');
    setTags([]);
    setNotes('');
    setSessionImageIds([]);
    setImageCache({});
    setEditingSession(null);
    setShowLocationDropdown(false);
    setShowStakesDropdown(false);
  };

  const editSession = async (session) => {
    setEditingSession(session);
    setGameType(session.game_type);
    setDate(session.date);
    setStartTime(session.start_time);
    setEndTime(session.end_time);
    setLocation(session.location);
    setStakes(session.stakes);
    setBuyIn(session.buy_in?.toString() || '');
    setCashOut(session.cash_out?.toString() || '');
    setBuyinAmount(session.buyin_amount?.toString() || '');
    setBuyinFee(session.buyin_fee?.toString() || '');
    setReentries(session.reentries?.toString() || '0');
    setFinishPosition(session.finish_position?.toString() || '');
    setFieldSize(session.field_size?.toString() || '');
    setPrize(session.prize?.toString() || '');
    setTableQuality(session.table_quality || 0);
    setMentalGame(session.mental_game || '');
    setTags(session.tags || []);
    setNotes(session.notes || '');
    setSessionImageIds(session.imageIds || []);
    
    // Load images for editing
    if (session.imageIds && session.imageIds.length > 0) {
      const newCache = {};
      for (const imageId of session.imageIds) {
        const base64 = await loadImage(imageId);
        if (base64) {
          newCache[imageId] = base64;
        }
      }
      setImageCache(newCache);
    }
    
    setView('entry');
  };

  const getMetrics = (days = 30) => {
    if (!userData) return { totalProfit: 0, totalHours: 0, sessionCount: 0 };
    const sessions = userData.sessions;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const filtered = sessions.filter(s => new Date(s.date) >= cutoffDate);
    const totalProfit = filtered.reduce((sum, s) => sum + (s.net_profit || 0), 0);
    const totalMinutes = filtered.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return { totalProfit, totalHours: (totalMinutes / 60).toFixed(1), sessionCount: filtered.length };
  };

  const getChartData = () => {
    if (!userData) return [];
    const sessions = [...userData.sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulativeTotal = 0, cumulativeCash = 0, cumulativeTourney = 0;

    return sessions.map(s => { 
      const profit = (s.net_profit || 0);
      cumulativeTotal += profit;
      if (s.game_type === 'cash') cumulativeCash += profit;
      else cumulativeTourney += profit;

      return { 
        date: s.date, 
        Combined: cumulativeTotal,
        Cash: cumulativeCash,
        Tournament: cumulativeTourney
      }; 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8"><div className="text-6xl mb-4">🃏</div><h1 className="text-3xl font-bold text-white mb-2">Poker Tracker</h1></div>
          <input type="text" placeholder="Enter your name" className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg mb-4 focus:outline-none" onKeyPress={(e) => { if (e.key === 'Enter' && e.target.value.trim()) createUser(e.target.value.trim()); }} />
          <button onClick={(e) => { const input = e.target.previousElementSibling; if (input.value.trim()) createUser(input.value.trim()); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">Start Tracking</button>
        </div>
      </div>
    );
  }

  const metrics = getMetrics(30);
  const chartData = getChartData();

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-950 text-white pb-20">
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-4 sticky top-0 z-10 shadow-lg flex justify-between items-center">
          <div><h1 className="text-xl font-bold">Poker Tracker</h1><p className="text-green-200 text-sm">{currentUser}</p></div>
        </div>
        
        <div className="p-4">
          <button onClick={() => { resetForm(); setView('entry'); }} className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95"><Plus size={24} /> Log New Session</button>
        </div>

        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><div className="text-gray-400 text-xs">30d Profit</div><div className={`text-2xl font-bold ${metrics.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${metrics.totalProfit.toFixed(0)}</div></div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><div className="text-gray-400 text-xs">30d Hours</div><div className="text-2xl font-bold text-blue-400">{metrics.totalHours}h</div></div>
        </div>

        {chartData.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-gray-400 text-sm font-semibold">Profit Performance</h2>
              <div className="flex gap-2">
                <button onClick={() => toggleLine('Combined')} className={`text-[10px] px-2 py-1 rounded-full border transition ${visibleLines.includes('Combined') ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>Combined</button>
                <button onClick={() => toggleLine('Cash')} className={`text-[10px] px-2 py-1 rounded-full border transition ${visibleLines.includes('Cash') ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>Cash</button>
                <button onClick={() => toggleLine('Tournament')} className={`text-[10px] px-2 py-1 rounded-full border transition ${visibleLines.includes('Tournament') ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>Tourney</button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800" style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} itemStyle={{ fontSize: '12px' }} />
                  {visibleLines.includes('Combined') && <Line type="monotone" name="Combined" dataKey="Combined" stroke="#10B981" strokeWidth={3} dot={false} />}
                  {visibleLines.includes('Cash') && <Line type="monotone" name="Cash" dataKey="Cash" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                  {visibleLines.includes('Tournament') && <Line type="monotone" name="Tournament" dataKey="Tournament" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="px-4">
          <h2 className="text-gray-400 text-sm font-semibold mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {userData?.sessions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map((session) => (
              <div key={session.id} onClick={() => editSession(session)} className="bg-gray-900 rounded-xl p-4 border border-gray-800 cursor-pointer relative">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-500">{new Date(session.date).toLocaleDateString()}</div>
                    <div className="font-semibold">{session.game_type === 'tournament' ? 'MTT' : 'Cash'} - {session.stakes}</div>
                    <div className="text-xs text-gray-400">{session.location}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={`text-lg font-bold ${session.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${session.net_profit.toFixed(0)}</div>
                    <button onClick={(e) => deleteSession(session, e)} className="p-1 text-gray-600 hover:text-red-500 transition"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'entry') {
    const filteredLocationSuggestions = locationSuggestions.filter(l => 
      l.toLowerCase().includes(location.toLowerCase())
    );
    const filteredStakesSuggestions = stakeSuggestions.filter(s => 
      s.toLowerCase().includes(stakes.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gray-950 text-white pb-8">
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-4 sticky top-0 z-10 flex items-center gap-3">
          <button onClick={() => { resetForm(); setView('dashboard'); }}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">{editingSession ? 'Edit' : 'New'} Session</h1>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setGameType('cash')} className={`py-3 rounded-lg font-semibold ${gameType === 'cash' ? 'bg-green-600' : 'bg-gray-800 text-gray-400'}`}>Cash</button>
            <button onClick={() => setGameType('tournament')} className={`py-3 rounded-lg font-semibold ${gameType === 'tournament' ? 'bg-green-600' : 'bg-gray-800 text-gray-400'}`}>MTT</button>
          </div>

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" />
          
          {/* Location with dropdown */}
          <div className="relative">
            <input 
              type="text" 
              value={location} 
              onChange={(e) => {
                setLocation(e.target.value);
                setShowLocationDropdown(true);
              }}
              onFocus={() => setShowLocationDropdown(true)}
              onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
              placeholder="Location" 
              className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" 
            />
            {showLocationDropdown && filteredLocationSuggestions.length > 0 && location && (
              <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredLocationSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setLocation(suggestion);
                      setShowLocationDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stakes with dropdown */}
          <div className="relative">
            <input 
              type="text" 
              value={stakes} 
              onChange={(e) => {
                setStakes(e.target.value);
                setShowStakesDropdown(true);
              }}
              onFocus={() => setShowStakesDropdown(true)}
              onBlur={() => setTimeout(() => setShowStakesDropdown(false), 200)}
              placeholder={gameType === 'cash' ? "Stakes (1/2)" : "Tournament Name"} 
              className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" 
            />
            {showStakesDropdown && filteredStakesSuggestions.length > 0 && stakes && (
              <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredStakesSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setStakes(suggestion);
                      setShowStakesDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          {gameType === 'cash' ? (
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} placeholder="Buy-in $" className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" />
              <input type="number" value={cashOut} onChange={(e) => setCashOut(e.target.value)} placeholder="Cash-out $" className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={buyinAmount} onChange={(e) => setBuyinAmount(e.target.value)} placeholder="Buy-in $" className="px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" />
                <input type="number" value={buyinFee} onChange={(e) => setBuyinFee(e.target.value)} placeholder="Fee $" className="px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" />
              </div>
              <input type="number" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Prize $" className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none" />
            </div>
          )}

          <div className="pt-2 border-t border-gray-800 mt-4">
            <label className="block text-xs font-semibold text-gray-400 mb-2 pt-2">Photos ({sessionImageIds.length}/3)</label>
            <div className="grid grid-cols-3 gap-2">
              {sessionImageIds.map((imageId, idx) => (
                <div key={imageId} className="relative aspect-square">
                  {imageCache[imageId] ? (
                    <img src={imageCache[imageId]} alt="Session" className="w-full h-full object-cover rounded-lg border border-gray-700" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                      <div className="text-gray-600 text-xs">Loading...</div>
                    </div>
                  )}
                  <button onClick={() => removePhoto(imageId)} className="absolute -top-1 -right-1 bg-red-600 p-1 rounded-full"><X size={12} /></button>
                </div>
              ))}
              {sessionImageIds.length < 3 && (
                <label className="aspect-square flex flex-col items-center justify-center bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer">
                  <Plus size={24} className="text-gray-500" />
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." rows={3} className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:outline-none resize-none" />

          <button onClick={saveSession} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95">
            {editingSession ? 'Update' : 'Save'} Session
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PokerTracker;
