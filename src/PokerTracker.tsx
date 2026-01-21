import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, ArrowLeft, Trash2, X } from 'lucide-react';

// HELPER: Compresses images to prevent LocalStorage "QuotaExceededError"
const compressImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
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
      // Convert to JPEG at 0.7 quality to save ~90% space
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

const PokerTracker = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState({});
  const [view, setView] = useState('dashboard');
  const [editingSession, setEditingSession] = useState(null);
  const [visibleLines, setVisibleLines] = useState(['Combined', 'Cash', 'Tournament']);

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
  const [sessionImages, setSessionImages] = useState([]);

  // Tournament fields
  const [buyinAmount, setBuyinAmount] = useState('');
  const [buyinFee, setBuyinFee] = useState('');
  const [reentries, setReentries] = useState('0');
  const [finishPosition, setFinishPosition] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [prize, setPrize] = useState('');

  // Load data
  useEffect(() => {
    const storedCurrentUser = localStorage.getItem('pokerTracker_currentUser');
    const storedUsers = localStorage.getItem('pokerTracker_users');
    if (storedUsers) setUsers(JSON.parse(storedUsers));
    if (storedCurrentUser) setCurrentUser(storedCurrentUser);
  }, []);

  // Save data with Error Catching
  useEffect(() => {
    try {
      if (Object.keys(users).length > 0) {
        localStorage.setItem('pokerTracker_users', JSON.stringify(users));
      }
      if (currentUser) {
        localStorage.setItem('pokerTracker_currentUser', currentUser);
      }
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        alert("Browser storage is full. Please delete some old sessions or remove images.");
      }
    }
  }, [users, currentUser]);

  const createUser = (username) => {
    const newUsers = {
      ...users,
      [username]: {
        createdAt: new Date().toISOString(),
        sessions: [],
        locations: [],
        tags: ['tired', 'tilted', 'good_table', 'ran_hot', 'ran_cold', 'tough_table']
      }
    };
    setUsers(newUsers);
    setCurrentUser(username);
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
    if (file && sessionImages.length < 3) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        // APPLY COMPRESSION HERE
        const compressed = await compressImage(reader.result);
        setSessionImages(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index) => {
    setSessionImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleLine = (line) => {
    setVisibleLines(prev => 
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  const deleteSession = (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      setUsers(prev => {
        const updated = { ...prev };
        updated[currentUser].sessions = updated[currentUser].sessions.filter(s => s.id !== id);
        return updated;
      });
    }
  };

  const saveSession = () => {
    if (!currentUser) return;
    const durationMinutes = calculateDuration(startTime, endTime);
    let netProfit = 0;

    if (gameType === 'cash') {
      netProfit = parseFloat(cashOut || 0) - parseFloat(buyIn || 0);
    } else {
      const perEntry = parseFloat(buyinAmount || 0) + parseFloat(buyinFee || 0);
      const totalInvested = perEntry + (parseInt(reentries || 0) * perEntry);
      netProfit = parseFloat(prize || 0) - totalInvested;
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
      images: sessionImages,
      duration_minutes: durationMinutes,
      net_profit: netProfit,
      table_quality: tableQuality,
      mental_game: mentalGame,
      tags,
      notes
    };

    setUsers(prevUsers => {
      const updatedUsers = { ...prevUsers };
      const userSessions = editingSession
        ? updatedUsers[currentUser].sessions.map(s => s.id === session.id ? session : s)
        : [...updatedUsers[currentUser].sessions, session];
      
      updatedUsers[currentUser] = {
        ...updatedUsers[currentUser],
        sessions: userSessions
      };
      return updatedUsers;
    });

    resetForm();
    setView('dashboard');
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
    setSessionImages([]);
    setEditingSession(null);
  };

  const editSession = (session) => {
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
    setSessionImages(session.images || []);
    setView('entry');
  };

  const getMetrics = (days = 30) => {
    if (!currentUser || !users[currentUser]) return { totalProfit: 0, totalHours: 0, sessionCount: 0 };
    const sessions = users[currentUser].sessions;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const filtered = sessions.filter(s => new Date(s.date) >= cutoffDate);
    const totalProfit = filtered.reduce((sum, s) => sum + (s.net_profit || 0), 0);
    const totalMinutes = filtered.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return { totalProfit, totalHours: (totalMinutes / 60).toFixed(1), sessionCount: filtered.length };
  };

  const getChartData = () => {
    if (!currentUser || !users[currentUser]) return [];
    const sessions = [...users[currentUser].sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
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

  const userData = users[currentUser];
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
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                  {visibleLines.includes('Combined') && <Line type="monotone" dataKey="Combined" stroke="#10B981" strokeWidth={3} dot={false} />}
                  {visibleLines.includes('Cash') && <Line type="monotone" dataKey="Cash" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                  {visibleLines.includes('Tournament') && <Line type="monotone" dataKey="Tournament" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="px-4">
          <h2 className="text-gray-400 text-sm font-semibold mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {userData?.sessions.sort((a, b) => new Date(b.date) - new Date(a.date)).map((session) => (
              <div key={session.id} onClick={() => editSession(session)} className="bg-gray-900 rounded-xl p-4 border border-gray-800 cursor-pointer relative">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-500">{new Date(session.date).toLocaleDateString()}</div>
                    <div className="font-semibold">{session.game_type === 'tournament' ? 'MTT' : 'Cash'} - {session.stakes}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={`text-lg font-bold ${session.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${session.net_profit.toFixed(0)}</div>
                    <button onClick={(e) => deleteSession(session.id, e)} className="p-1 text-gray-600"><Trash2 size={16} /></button>
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
    return (
      <div className="min-h-screen bg-gray-950 text-white pb-8">
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-4 sticky top-0 z-10 flex items-center gap-3">
          <button onClick={() => { resetForm(); setView('dashboard'); }}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">{editingSession ? 'Edit' : 'New'} Session</h1>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setGameType('cash')} className={`py-3 rounded-lg font-semibold ${gameType === 'cash' ? 'bg-green-600' : 'bg-gray-800'}`}>Cash</button>
            <button onClick={() => setGameType('tournament')} className={`py-3 rounded-lg font-semibold ${gameType === 'tournament' ? 'bg-green-600' : 'bg-gray-800'}`}>MTT</button>
          </div>

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />
          <input type="text" value={stakes} onChange={(e) => setStakes(e.target.value)} placeholder={gameType === 'cash' ? "Stakes (1/2)" : "Tournament Name"} className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />

          {gameType === 'cash' ? (
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} placeholder="Buy-in $" className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />
              <input type="number" value={cashOut} onChange={(e) => setCashOut(e.target.value)} placeholder="Cash-out $" className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={buyinAmount} onChange={(e) => setBuyinAmount(e.target.value)} placeholder="Buy-in $" className="px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />
                <input type="number" value={buyinFee} onChange={(e) => setBuyinFee(e.target.value)} placeholder="Fee $" className="px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />
              </div>
              <input type="number" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Prize $" className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800" />
            </div>
          )}

          <div className="pt-2">
            <label className="block text-xs font-semibold text-gray-400 mb-2">Photos ({sessionImages.length}/3)</label>
            <div className="grid grid-cols-3 gap-2">
              {sessionImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square">
                  <img src={img} alt="Session" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => removePhoto(idx)} className="absolute -top-1 -right-1 bg-red-600 p-1 rounded-full"><X size={12} /></button>
                </div>
              ))}
              {sessionImages.length < 3 && (
                <label className="aspect-square flex items-center justify-center bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer">
                  <Plus size={24} className="text-gray-500" />
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." rows={3} className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 resize-none" />

          <button onClick={saveSession} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg">
            {editingSession ? 'Update' : 'Save'} Session
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PokerTracker;
