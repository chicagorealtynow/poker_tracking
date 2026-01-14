import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, TrendingUp, Clock, DollarSign, BarChart3, ArrowLeft, Settings, Download, Camera, X } from 'lucide-react';

const PokerTracker = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState({});
  const [view, setView] = useState('dashboard'); // dashboard, entry, sessions, analytics
  const [editingSession, setEditingSession] = useState(null);

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
  const [receiptPhoto, setReceiptPhoto] = useState(null);

  const fileInputRef = useRef(null);

  // Tournament fields
  const [buyinAmount, setBuyinAmount] = useState('');
  const [buyinFee, setBuyinFee] = useState('');
  const [reentries, setReentries] = useState('0');
  const [finishPosition, setFinishPosition] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [prize, setPrize] = useState('');

  // Load data from localStorage
  useEffect(() => {
    const storedCurrentUser = localStorage.getItem('pokerTracker_currentUser');
    const storedUsers = localStorage.getItem('pokerTracker_users');
    
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
    
    if (storedCurrentUser) {
      setCurrentUser(storedCurrentUser);
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (Object.keys(users).length > 0) {
      localStorage.setItem('pokerTracker_users', JSON.stringify(users));
    }
    if (currentUser) {
      localStorage.setItem('pokerTracker_currentUser', currentUser);
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
    if (minutes < 0) minutes += 24 * 60; // Handle overnight sessions
    return minutes;
  };

  const saveSession = () => {
    if (!currentUser) return;

    const durationMinutes = calculateDuration(startTime, endTime);
    let netProfit = 0;
    let hourlyRate = 0;
    let roiPercent = null;

    if (gameType === 'cash') {
      netProfit = parseFloat(cashOut || 0) - parseFloat(buyIn || 0);
      hourlyRate = durationMinutes > 0 ? (netProfit / durationMinutes) * 60 : 0;
    } else {
      const totalInvested = 
        parseFloat(buyinAmount || 0) + 
        parseFloat(buyinFee || 0) + 
        (parseInt(reentries || 0) * (parseFloat(buyinAmount || 0) + parseFloat(buyinFee || 0)));
      netProfit = parseFloat(prize || 0) - totalInvested;
      roiPercent = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
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
      receipt_photo: gameType === 'tournament' ? receiptPhoto : null,
      duration_minutes: durationMinutes,
      net_profit: netProfit,
      hourly_rate: hourlyRate,
      roi_percent: roiPercent,
      table_quality: tableQuality,
      mental_game: mentalGame,
      tags,
      notes
    };

    const updatedUsers = { ...users };
    const userSessions = editingSession
      ? updatedUsers[currentUser].sessions.map(s => s.id === session.id ? session : s)
      : [...updatedUsers[currentUser].sessions, session];
    
    updatedUsers[currentUser].sessions = userSessions;

    // Add location if new
    if (location && !updatedUsers[currentUser].locations.includes(location)) {
      updatedUsers[currentUser].locations.push(location);
    }

    setUsers(updatedUsers);
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
    setReceiptPhoto(null);
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
    setReceiptPhoto(session.receipt_photo || null);
    setView('entry');
  };

  const deleteSession = (sessionId) => {
    if (!confirm('Delete this session?')) return;
    const updatedUsers = { ...users };
    updatedUsers[currentUser].sessions = updatedUsers[currentUser].sessions.filter(s => s.id !== sessionId);
    setUsers(updatedUsers);
  };

  const toggleTag = (tag) => {
    setTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setReceiptPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getMetrics = (days = 30) => {
    if (!currentUser || !users[currentUser]) return null;
    
    const sessions = users[currentUser].sessions;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = sessions.filter(s => new Date(s.date) >= cutoffDate);
    
    const totalProfit = filtered.reduce((sum, s) => sum + (s.net_profit || 0), 0);
    const totalMinutes = filtered.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const avgHourly = totalHours > 0 ? totalProfit / totalHours : 0;
    
    return {
      totalProfit,
      totalHours: totalHours.toFixed(1),
      avgHourly: avgHourly.toFixed(2),
      sessionCount: filtered.length,
      sessions: filtered
    };
  };

  const getChartData = () => {
    if (!currentUser || !users[currentUser]) return [];
    
    const sessions = [...users[currentUser].sessions].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    let cumulative = 0;
    return sessions.map(s => {
      cumulative += s.net_profit || 0;
      return {
        date: s.date,
        profit: cumulative
      };
    });
  };

  const exportData = () => {
    const data = JSON.stringify(users[currentUser], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-tracker-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Username entry screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🃏</div>
            <h1 className="text-3xl font-bold text-white mb-2">Poker Tracker</h1>
            <p className="text-gray-400">Track your sessions, improve your game</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  createUser(e.target.value.trim());
                }
              }}
            />
            
            <button
              onClick={(e) => {
                const input = e.target.previousElementSibling;
                if (input.value.trim()) createUser(input.value.trim());
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Start Tracking
            </button>
          </div>
          
          <p className="text-center text-gray-500 text-sm mt-6">
            All data stored on your device
          </p>
        </div>
      </div>
    );
  }

  const metrics = getMetrics(30);
  const chartData = getChartData();

  // Dashboard view
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-950 text-white pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-4 sticky top-0 z-10 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Poker Tracker</h1>
              <p className="text-green-200 text-sm">{currentUser}</p>
            </div>
            <button 
              onClick={exportData}
              className="p-2 hover:bg-green-800 rounded-lg transition"
            >
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="p-4">
          <button
            onClick={() => {
              resetForm();
              setView('entry');
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Plus size={24} />
            Log New Session
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="px-4 pb-4">
          <h2 className="text-gray-400 text-sm font-semibold mb-3">Last 30 Days</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-xs mb-1">Profit</div>
              <div className={`text-2xl font-bold ${metrics?.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${metrics?.totalProfit.toFixed(0)}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-xs mb-1">Hours</div>
              <div className="text-2xl font-bold text-blue-400">{metrics?.totalHours}h</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-xs mb-1">Hourly</div>
              <div className={`text-2xl font-bold ${metrics?.avgHourly >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${metrics?.avgHourly}/hr
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-xs mb-1">Sessions</div>
              <div className="text-2xl font-bold text-purple-400">{metrics?.sessionCount}</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="px-4 pb-4">
            <h2 className="text-gray-400 text-sm font-semibold mb-3">Cumulative Profit</h2>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        <div className="px-4">
          <h2 className="text-gray-400 text-sm font-semibold mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {users[currentUser].sessions
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10)
              .map((session) => (
                <div 
                  key={session.id}
                  onClick={() => editSession(session)}
                  className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm text-gray-400">{new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className="font-semibold">{session.stakes} {session.game_type === 'tournament' ? 'MTT' : 'Cash'}</div>
                      <div className="text-sm text-gray-400">{session.location}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${session.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {session.net_profit >= 0 ? '+' : ''}${session.net_profit.toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {(session.duration_minutes / 60).toFixed(1)}h
                        {session.game_type === 'cash' && ` • $${session.hourly_rate.toFixed(0)}/hr`}
                      </div>
                    </div>
                  </div>
                  {session.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {session.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {users[currentUser].sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No sessions yet</p>
            <p className="text-sm">Tap "Log New Session" to get started</p>
          </div>
        )}
      </div>
    );
  }

  // Entry form view
  if (view === 'entry') {
    return (
      <div className="min-h-screen bg-gray-950 text-white pb-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-4 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => { resetForm(); setView('dashboard'); }} className="p-2 hover:bg-green-800 rounded-lg transition">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">{editingSession ? 'Edit Session' : 'Log Session'}</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Game Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Game Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGameType('cash')}
                className={`py-3 rounded-lg font-semibold transition ${
                  gameType === 'cash' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Cash Game
              </button>
              <button
                onClick={() => setGameType('tournament')}
                className={`py-3 rounded-lg font-semibold transition ${
                  gameType === 'tournament' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Tournament
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              list="locations"
              placeholder="Bellagio, PokerStars, etc."
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
            />
            <datalist id="locations">
              {users[currentUser].locations.map(loc => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          {/* Stakes */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Stakes</label>
            <input
              type="text"
              value={stakes}
              onChange={(e) => setStakes(e.target.value)}
              placeholder={gameType === 'cash' ? '1/2, 2/5, 5/10' : '$150, $500, $1000'}
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* Cash Game Fields */}
          {gameType === 'cash' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Buy-in ($)</label>
                  <input
                    type="number"
                    value={buyIn}
                    onChange={(e) => setBuyIn(e.target.value)}
                    placeholder="200"
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Cash-out ($)</label>
                  <input
                    type="number"
                    value={cashOut}
                    onChange={(e) => setCashOut(e.target.value)}
                    placeholder="540"
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Tournament Fields */}
          {gameType === 'tournament' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Buy-in ($)</label>
                  <input
                    type="number"
                    value={buyinAmount}
                    onChange={(e) => setBuyinAmount(e.target.value)}
                    placeholder="150"
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Fee ($)</label>
                  <input
                    type="number"
                    value={buyinFee}
                    onChange={(e) => setBuyinFee(e.target.value)}
                    placeholder="15"
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Re-entries</label>
                  <input
                    type="number"
                    value={reentries}
                    onChange={(e) => setReentries(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Finish</label>
                  <input
                    type="number"
                    value={finishPosition}
                    onChange={(e) => setFinishPosition(e.target.value)}
                    placeholder="12"
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Field</label>
                  <input
                    type="number"
                    value={fieldSize}
                    onChange={(e) => setFieldSize(e.target.value)}
                    placeholder="180"
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Prize ($)</label>
                <input
                  type="number"
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Receipt Photo */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Receipt Photo (Optional)</label>
                {!receiptPhoto ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border-2 border-dashed border-gray-700 cursor-pointer transition"
                    >
                      <Camera size={20} />
                      Take Photo of Receipt
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={receiptPhoto} 
                      alt="Receipt preview" 
                      className="w-full rounded-lg border border-gray-800"
                    />
                    <button
                      onClick={removePhoto}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Optional Section */}
          <div className="border-t border-gray-800 pt-4 mt-6">
            <h3 className="text-gray-400 text-sm font-semibold mb-3">Optional Info</h3>
            
            {/* Table Quality */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Table Quality</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setTableQuality(rating)}
                    className={`flex-1 py-2 rounded-lg transition ${
                      tableQuality >= rating
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* Mental Game */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-2">How You Played</label>
              <div className="grid grid-cols-3 gap-2">
                {['A', 'B', 'C'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => setMentalGame(grade)}
                    className={`py-3 rounded-lg font-bold transition ${
                      mentalGame === grade
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {grade} Game
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Tags</label>
              <div className="flex gap-2 flex-wrap">
                {users[currentUser].tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-2 rounded-lg text-sm transition ${
                      tags.includes(tag)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Table dynamics, key hands, mistakes, etc."
                rows={4}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-green-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveSession}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition shadow-lg mt-6"
          >
            {editingSession ? 'Update Session' : 'Save Session'}
          </button>

          {/* Delete Button (only when editing) */}
          {editingSession && (
            <button
              onClick={() => {
                deleteSession(editingSession.id);
                setView('dashboard');
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition"
            >
              Delete Session
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default PokerTracker;