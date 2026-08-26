import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { toPng } from 'html-to-image';
import { Upload, Download, Settings, Edit, Plus, Trash2, Image as ImageIcon, Save, LogOut, FileText, ArrowLeft } from 'lucide-react';
import { calculateStandings, DEFAULT_WIN_POINT_VALUE, DEFAULT_KILL_POINT_VALUE, DEFAULT_BR_POINTS } from './utils/scoring';
import { getSavedTournaments, saveTournament, deleteTournament } from './utils/storage';
import LiveOverlay from './LiveOverlay';
import './index.css';

function App() {
  const [step, setStep] = useState(localStorage.getItem('boss_esports_auth') === 'admin' ? 'dashboard' : 'home');
  
  // Auth state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dashboard state
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTournamentId, setCurrentTournamentId] = useState(null);
  const [tournamentName, setTournamentName] = useState('New Tournament');
  const [tournamentMode, setTournamentMode] = useState('cs');

  // Calculator State
  const [image, setImage] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const bgTemplate = '/bg1.png'; 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAppendingMode, setIsAppendingMode] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [standings, setStandings] = useState([]);
  
  const [winPointValue, setWinPointValue] = useState(DEFAULT_WIN_POINT_VALUE);
  const [killPointValue, setKillPointValue] = useState(DEFAULT_KILL_POINT_VALUE);
  const [brPointsConfigText, setBrPointsConfigText] = useState(DEFAULT_BR_POINTS.join(', '));
  const [championRushEnabled, setChampionRushEnabled] = useState(true);
  const [championRushThreshold, setChampionRushThreshold] = useState(60);
  const [showSettings, setShowSettings] = useState(false);
  const [editingTeamPlayersId, setEditingTeamPlayersId] = useState(null);
  const [scale, setScale] = useState(1);
  
  const scoreboardRef = useRef(null);

  useEffect(() => {
    if (step === 'dashboard') {
      loadTournaments();
    }
  }, [step]);

  useEffect(() => {
    const handleResize = () => {
      setScale(Math.min(1, window.innerWidth / 1150));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadTournaments = async () => {
    setIsLoading(true);
    const data = await getSavedTournaments();
    setTournaments(data);
    setIsLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const isValidAdmin = username === 'admin' && password === 'admin';
    const isValidAdmin1 = username === 'admin1' && password === 'admin1';
    
    if (isValidAdmin || isValidAdmin1) {
      localStorage.setItem('boss_esports_auth', 'admin');
      setStep('dashboard');
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid credentials. Try admin/admin or admin1/admin1');
    }
  };

  const handleLogout = () => {
    setUsername('');
    setPassword('');
    localStorage.removeItem('boss_esports_auth');
    setStep('home');
  };

  const startNewTournament = (mode = 'cs') => {
    setCurrentTournamentId(Date.now().toString());
    setTournamentMode(mode);
    setTournamentName('Match Day ' + new Date().toLocaleDateString());
    setExtractedData([]);
    setImage(null);
    setBgImage(null);
    setIsAppendingMode(false);
    setStep('edit');
  };

  const loadTournament = (t) => {
    setCurrentTournamentId(t.id);
    setTournamentName(t.name);
    setTournamentMode(t.mode || 'cs');
    setExtractedData(t.teamsData || []);
    setWinPointValue(t.winPointValue || DEFAULT_WIN_POINT_VALUE);
    setKillPointValue(t.killPointValue || DEFAULT_KILL_POINT_VALUE);
    setBrPointsConfigText(t.brPointsConfigText || DEFAULT_BR_POINTS.join(', '));
    setChampionRushEnabled(t.championRushEnabled !== false);
    setChampionRushThreshold(t.championRushThreshold || 60);
    setStep('edit');
  };

  const handleDeleteTournament = async (id) => {
    if (confirm('Are you sure you want to delete this tournament?')) {
      await deleteTournament(id);
      loadTournaments();
    }
  };

  const saveCurrentData = async () => {
    const result = await saveTournament({
      id: currentTournamentId,
      name: tournamentName,
      mode: tournamentMode,
      teamsData: extractedData,
      winPointValue,
      killPointValue,
      brPointsConfigText,
      championRushEnabled,
      championRushThreshold
    });
    if (result.success) {
      alert('Tournament saved successfully to Cloud!');
    } else {
      alert('Error saving tournament to Cloud: ' + result.error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBgImage(URL.createObjectURL(file));
    }
  };

  const processImage = async () => {
    if (!image) return;
    setIsProcessing(true);
    
    try {
      const result = await Tesseract.recognize(image, 'eng');
      const text = result.data.text;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      const parsed = [];
      
      // Heuristic 1: Look for "VS" line to find teams and who won
      // Example: "WARBRINGERS 6 VS 1 HOWLERS"
      let team1 = { name: 'Team A', wins: 0, losses: 0, kills: 0 };
      let team2 = { name: 'Team B', wins: 0, losses: 0, kills: 0 };
      
      let foundVsLine = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match things like "TEAM A 6 VS 1 TEAM B" or "TEAM A 6 V S 1 TEAM B"
        const vsMatch = line.match(/(.*?)\s+(\d+)\s*V\s*S\s*(\d+)\s+(.*)/i) || line.match(/(.*?)\s+(\d+)\s*VS\s*(\d+)\s+(.*)/i);
        
        if (vsMatch && !foundVsLine) {
          team1.name = vsMatch[1].trim().replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 15);
          const score1 = parseInt(vsMatch[2]);
          const score2 = parseInt(vsMatch[3]);
          team2.name = vsMatch[4].trim().replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 15);
          
          if (score1 > score2) {
            team1.wins = 1; team1.losses = 0;
            team2.wins = 0; team2.losses = 1;
          } else {
            team1.wins = 0; team1.losses = 1;
            team2.wins = 1; team2.losses = 0;
          }
          foundVsLine = true;
          continue;
        }

        // Heuristic 2: Look for K/D/A patterns like "6/1/0" or "1 / 6 / 0"
        const kdaMatches = [...line.matchAll(/\b(\d+)\s*\/\s*\d+\s*\/\s*\d+\b/g)];
        if (kdaMatches.length > 0) {
          // Assume the first K/D/A found on a line belongs to the left team (Team 1)
          team1.kills += parseInt(kdaMatches[0][1]);
          // If a second K/D/A is found on the same line, it belongs to the right team (Team 2)
          if (kdaMatches.length > 1) {
            team2.kills += parseInt(kdaMatches[1][1]);
          }
        }
      }
      
      // Fallback: If OCR completely failed to find VS, just add dummy entries so the user can type them
      if (foundVsLine) {
        parsed.push({
          id: Date.now() + Math.random(),
          teamName: team1.name,
          matches: 1,
          wins: team1.wins,
          losses: team1.losses,
          kills: team1.kills
        });
        parsed.push({
          id: Date.now() + Math.random(),
          teamName: team2.name,
          matches: 1,
          wins: team2.wins,
          losses: team2.losses,
          kills: team2.kills
        });
      }

      if (parsed.length > 0) {
        if (isAppendingMode) {
          const merged = [...extractedData];
          const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          parsed.forEach(newTeam => {
            const newNorm = normalize(newTeam.teamName);
            const matchIndex = merged.findIndex(t => normalize(t.teamName) === newNorm);
            
            if (matchIndex >= 0) {
              merged[matchIndex] = {
                ...merged[matchIndex],
                matches: (merged[matchIndex].matches || 0) + 1,
                wins: (merged[matchIndex].wins || 0) + newTeam.wins,
                losses: (merged[matchIndex].losses || 0) + newTeam.losses,
                kills: (merged[matchIndex].kills || 0) + newTeam.kills
              };
            } else {
              merged.push({
                ...newTeam,
                matches: 1
              });
            }
          });
          setExtractedData(merged);
        } else {
          setExtractedData(parsed);
        }
      } else {
        alert("OCR couldn't cleanly read the Team Names from this screenshot. Please enter the match results manually.");
      }
      setStep('edit');
    } catch (err) {
      console.error("OCR failed", err);
      setStep('edit');
    }
    
    setIsProcessing(false);
  };

  const handleInlineEdit = (teamId, field, value) => {
    if (!teamId) return;
    const parsedValue = field === 'teamName' ? value.replace(/🏆/g, '').trim() : Number(value);
    
    setExtractedData(prev => {
      const newData = prev.map(team => team.id === teamId ? { ...team, [field]: parsedValue } : team);
      const brConfig = brPointsConfigText.split(',').map(n => Number(n.trim()));
      const finalStandings = calculateStandings(newData, tournamentMode, winPointValue, killPointValue, brConfig);
      setStandings(finalStandings);
      return newData;
    });
  };

  const updateTeamData = (id, field, value) => {
    setExtractedData(prev => prev.map(team => 
      team.id === id ? { ...team, [field]: value } : team
    ));
  };

  const handleNumberChange = (id, field, rawValue) => {
    const val = rawValue.replace(/[^0-9]/g, '');
    updateTeamData(id, field, val === '' ? '' : Number(val));
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;
    
    if (e.key === 'ArrowUp') {
      nextRow = Math.max(0, rowIndex - 1);
    } else if (e.key === 'ArrowDown') {
      nextRow = Math.min(extractedData.length - 1, rowIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0) {
        nextCol = Math.max(0, colIndex - 1);
      } else return;
    } else if (e.key === 'ArrowRight') {
      if (e.target.selectionEnd === e.target.value.length) {
        nextCol = Math.min(4, colIndex + 1);
      } else return;
    } else {
      return;
    }
    
    if (nextRow !== rowIndex || nextCol !== colIndex) {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${nextRow}-${nextCol}`);
      if (nextInput) {
        nextInput.focus();
        setTimeout(() => {
          if (e.key === 'ArrowLeft') {
             nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
          } else if (e.key === 'ArrowRight') {
             nextInput.setSelectionRange(0, 0);
          }
        }, 0);
      }
    }
  };

  const addTeam = () => {
    setExtractedData(prev => [
      ...prev,
      { 
        id: Date.now(), 
        teamName: 'NEW TEAM', 
        matches: 0, 
        wins: 0, 
        losses: 0, 
        kills: 0, 
        booyahs: 0, 
        placementPoints: 0,
        players: ['', '', '', '', ''],
        matchHistory: Array.from({length: 6}, (_, i) => ({ matchNum: i+1, kills: '', rank: '' }))
      }
    ]);
  };

  const removeTeam = (id) => {
    setExtractedData(prev => prev.filter(t => t.id !== id));
  };

  const handleCloseModal = () => {
    const team = extractedData.find(t => t.id === editingTeamPlayersId);
    if (!team) {
      setEditingTeamPlayersId(null);
      return;
    }

    if (tournamentMode === 'br' && team.matchHistory) {
      let totalKills = 0;
      let totalBooyahs = 0;
      let ranksArray = [];
      let matchesPlayed = 0;
      
      team.matchHistory.forEach(m => {
        if (m.kills !== '' || m.rank !== '') {
          matchesPlayed++;
        }
        if (m.kills !== '') {
          totalKills += Number(m.kills);
        }
        if (m.rank !== '') {
          ranksArray.push(m.rank);
          if (Number(m.rank) === 1) {
            totalBooyahs++;
          }
        }
      });
      
      setExtractedData(prev => prev.map(t => {
        if (t.id === team.id) {
          const isModalUsed = team.matchHistory.some(m => m.kills !== '' || m.rank !== '');
          if (isModalUsed) {
            return {
              ...t,
              matches: matchesPlayed,
              kills: totalKills,
              booyahs: totalBooyahs,
              ranks: ranksArray.join(',')
            };
          }
        }
        return t;
      }));
    }
    
    setEditingTeamPlayersId(null);
  };

  const calculateResults = () => {
    const brConfig = brPointsConfigText.split(',').map(n => Number(n.trim()));
    const finalStandings = calculateStandings(extractedData, tournamentMode, winPointValue, killPointValue, brConfig);
    setStandings(finalStandings);
    setStep('result');
  };

  const downloadImage = async () => {
    if (scoreboardRef.current) {
      const el = scoreboardRef.current;
      const parent = el.parentElement;
      const originalTransform = parent.style.transform;
      
      // Temporarily remove scaling so it downloads at full 1080x1350 resolution
      parent.style.transform = 'scale(1)';
      
      try {
        const dataUrl = await toPng(el, { cacheBust: true, style: { background: '#000' } });
        const link = document.createElement('a');
        link.download = 'boss-esports-standings.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error generating image', err);
      } finally {
        // Restore scaling
        parent.style.transform = originalTransform;
      }
    }
  };

  // ----------------------------------------------------
  // RENDERERS
  // ----------------------------------------------------

  const renderLoginStep = () => (
    <div className="panel" style={{maxWidth: '400px', margin: '0 auto'}}>
      <h2 style={{textAlign: 'center', marginBottom: '2rem'}}>Manager Login</h2>
      <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        <div>
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            style={{width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--color-red-main)', color: 'white'}}
          />
        </div>
        <div>
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            style={{width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--color-red-main)', color: 'white'}}
          />
        </div>
        {errorMsg && <p style={{color: 'var(--color-red-light)', margin: 0}}>{errorMsg}</p>}
        <button type="submit" className="btn" style={{marginTop: '1rem'}}>Login</button>
        <button type="button" className="btn btn-secondary" onClick={() => setStep('home')} style={{marginTop: '1rem'}}>Back to Home</button>
      </form>
    </div>
  );

  const renderHomeStep = () => (
    <div className="panel" style={{textAlign: 'center', maxWidth: '500px', margin: '0 auto'}}>
      <h2 style={{fontSize: '2rem', marginBottom: '2rem', color: 'var(--color-gold)'}}>Welcome</h2>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        <button className="btn" onClick={() => startNewTournament('cs')} style={{padding: '1.5rem', fontSize: '1.5rem'}}>
          Quick Start (Clash Squad)
        </button>
        <button className="btn" onClick={() => startNewTournament('br')} style={{padding: '1.5rem', fontSize: '1.5rem'}}>
          Quick Start (Battle Royale)
        </button>
        <button className="btn btn-secondary" onClick={() => setStep('login')}>
          Manager Login (Save & Load)
        </button>
      </div>
    </div>
  );

  const renderDashboardStep = () => (
    <div className="panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2>Saved Results Dashboard</h2>
        <button className="btn btn-secondary" onClick={handleLogout} style={{padding: '0.5rem 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div style={{marginBottom: '2rem', display: 'flex', gap: '1rem'}}>
        <button className="btn" onClick={() => startNewTournament('cs')} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center'}}>
          <Plus size={20} /> New CS Match
        </button>
        <button className="btn" onClick={() => startNewTournament('br')} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center'}}>
          <Plus size={20} /> New BR Match
        </button>
      </div>

      <h3 style={{color: 'var(--color-gold-light)', borderBottom: '1px solid var(--color-red)', paddingBottom: '0.5rem'}}>Previous Tournaments</h3>
      
      {isLoading ? (
        <p style={{textAlign: 'center', color: 'var(--color-gold)', padding: '2rem'}}>Loading from Cloud...</p>
      ) : tournaments.length === 0 ? (
        <p style={{color: 'var(--color-text-muted)'}}>No saved tournaments found.</p>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {tournaments.map(t => (
            <div key={t.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,0,0,0.1)', border: '1px solid var(--color-red-main)'}}>
              <div>
                <h4 style={{margin: '0 0 5px 0', color: 'var(--color-gold)'}}>{t.name}</h4>
                <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)'}}>Last modified: {new Date(t.lastModified).toLocaleString()}</p>
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <button className="btn btn-secondary" onClick={() => {
                  const url = `${window.location.origin}/?live=true&id=${t.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Live Overlay URL copied to clipboard! Paste this into PRISM Live Studio as a Web Source.');
                }} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00E676', borderColor: '#00E676'}}>
                  Live Overlay
                </button>
                <button className="btn btn-secondary" onClick={() => loadTournament(t)} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <FileText size={16} /> Open
                </button>
                <button className="btn btn-secondary" onClick={() => handleDeleteTournament(t.id)} style={{color: 'var(--color-red-light)', borderColor: 'var(--color-red-dark)'}}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUploadStep = () => (
    <div className="panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2>Upload Images</h2>
        <button className="btn btn-secondary" onClick={() => setStep('dashboard')}><ArrowLeft size={16} /> Dashboard</button>
      </div>
      
      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center'}}>
        {/* OCR HIDDEN FOR NOW
        <div style={{flex: '1', minWidth: '300px'}}>
          <div className="upload-area" onClick={() => document.getElementById('file-upload').click()}>
            <input 
              id="file-upload" 
              type="file" 
              accept="image/*" 
              style={{display: 'none'}} 
              onChange={handleImageUpload} 
            />
            <Upload size={48} color="var(--color-red)" style={{marginBottom: '1rem'}} />
            <h3>1. Match Result Screenshot</h3>
            <p style={{color: 'var(--color-text-muted)'}}>For automatic points reading (OCR)</p>
          </div>
          {image && <p style={{color: 'var(--color-gold)', textAlign: 'center'}}>Match Screenshot loaded ✓</p>}
        </div>
        */}

        <div style={{flex: '1', minWidth: '300px', maxWidth: '500px'}}>
          <div className="upload-area" onClick={() => document.getElementById('bg-upload').click()}>
            <input 
              id="bg-upload" 
              type="file" 
              accept="image/*" 
              style={{display: 'none'}} 
              onChange={handleBgUpload} 
            />
            <ImageIcon size={48} color="var(--color-gold)" style={{marginBottom: '1rem'}} />
            <h3>Custom Background Image</h3>
            <p style={{color: 'var(--color-text-muted)'}}>Optional override to bg1.png</p>
          </div>
          {bgImage && <p style={{color: 'var(--color-gold)', textAlign: 'center'}}>Background loaded ✓</p>}
        </div>
      </div>
      
      {/* OCR HIDDEN FOR NOW
      <div style={{marginTop: '2rem', textAlign: 'center'}}>
        <button className="btn" onClick={processImage} disabled={!image && !bgImage}>
          {isProcessing ? 'Processing OCR...' : 'Process Result'}
        </button>
      </div>
      */}

      <div style={{marginTop: '3rem', textAlign: 'center'}}>
        <button className="btn btn-secondary" onClick={handleManualEntry} style={{padding: '1rem 3rem', fontSize: '1.5rem', color: 'var(--color-gold)', borderColor: 'var(--color-gold)'}}>
          Proceed to Data Entry
        </button>
      </div>
    </div>
  );

  const renderEditStep = () => (
    <div className="panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <button className="btn btn-secondary" onClick={() => setStep('dashboard')}><ArrowLeft size={16} /> Dashboard</button>
          <input 
            type="text" 
            value={tournamentName}
            onChange={e => setTournamentName(e.target.value)}
            style={{background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-gold)', color: 'var(--color-gold)', fontSize: '1.5rem', fontFamily: 'var(--font-heading)'}}
          />
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <button className="btn btn-secondary" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={16} style={{marginRight: '0.5rem'}}/> {showSettings ? 'Hide Settings' : 'Settings'}
          </button>
          <button className="btn" onClick={saveCurrentData} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Save size={16} /> Save Data
          </button>
        </div>
      </div>

      {showSettings && (
        <div style={{background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', border: '1px solid var(--color-gold)'}}>
          <h3 style={{marginTop: 0, color: 'var(--color-gold)'}}>Custom Scoring Configuration</h3>
          
          <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
            <div style={{border: '1px solid var(--color-red-main)', padding: '1rem', background: 'rgba(255,0,0,0.05)', borderRadius: '4px'}}>
              <h4 style={{margin: '0 0 8px 0', color: 'var(--color-gold-light)', fontSize: '1.1rem'}}>Position Points (CS)</h4>
              <p style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)'}}>If WIN, award these points. (Loss = 0)</p>
              <label style={{marginRight: '1rem', fontWeight: 'bold'}}>Win Points: </label>
              <input 
                type="number" 
                value={winPointValue} 
                onChange={(e) => setWinPointValue(Number(e.target.value))}
                style={{width: '80px', fontSize: '1.1rem'}}
              />
            </div>
            
            <div style={{border: '1px solid var(--color-red-main)', padding: '1rem', background: 'rgba(255,0,0,0.05)', borderRadius: '4px'}}>
              <h4 style={{margin: '0 0 8px 0', color: 'var(--color-gold-light)', fontSize: '1.1rem'}}>Kill Points</h4>
              <p style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)'}}>Points awarded per individual kill</p>
              <label style={{marginRight: '1rem', fontWeight: 'bold'}}>Points Per Kill: </label>
              <input 
                type="number" 
                value={killPointValue} 
                onChange={(e) => setKillPointValue(Number(e.target.value))}
                style={{width: '80px', fontSize: '1.1rem'}}
              />
            </div>

            <div style={{border: '1px solid var(--color-red-main)', padding: '1rem', background: 'rgba(255,0,0,0.05)', borderRadius: '4px', flexGrow: 1}}>
              <h4 style={{margin: '0 0 8px 0', color: 'var(--color-gold-light)', fontSize: '1.1rem'}}>BR Points Distribution</h4>
              <p style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)'}}>Points for 1st, 2nd, 3rd... (comma separated)</p>
              <input 
                type="text" 
                value={brPointsConfigText} 
                onChange={(e) => setBrPointsConfigText(e.target.value)}
                style={{width: '100%', fontSize: '1.1rem', boxSizing: 'border-box'}}
              />
            </div>
            
            <div style={{border: '1px solid var(--color-red-main)', padding: '1rem', background: 'rgba(255,0,0,0.05)', borderRadius: '4px', flexGrow: 1}}>
              <h4 style={{margin: '0 0 8px 0', color: 'var(--color-gold-light)', fontSize: '1.1rem'}}>Champion Rush (Trophy)</h4>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '10px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input 
                    type="checkbox" 
                    checked={championRushEnabled} 
                    onChange={e => setChampionRushEnabled(e.target.checked)} 
                    style={{width: '18px', height: '18px'}}
                  />
                  Enable Trophy
                </label>
              </div>
              <label style={{marginRight: '1rem', fontWeight: 'bold'}}>Points Threshold: </label>
              <input 
                type="number" 
                value={championRushThreshold} 
                onChange={e => setChampionRushThreshold(Number(e.target.value))}
                style={{width: '80px', fontSize: '1.1rem'}}
                disabled={!championRushEnabled}
              />
            </div>
          </div>
        </div>
      )}

      <div style={{overflowX: 'auto'}}>
        <table className="edit-table">
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Players</th>
              <th>Matches</th>
              {tournamentMode === 'cs' ? (
                <>
                  <th>Wins</th>
                  <th>Losses</th>
                </>
              ) : (
                <>
                  <th>Booyahs</th>
                  <th>Ranks (e.g. 1,5)</th>
                </>
              )}
              <th>Kills</th>
              <th style={{textAlign: 'center'}}>Remove</th>
            </tr>
          </thead>
          <tbody>
            {extractedData.map((team, index) => (
              <tr key={team.id}>
                <td data-label="Team Name">
                  <input id={`input-${index}-0`} type="text" value={team.teamName} onChange={e => updateTeamData(team.id, 'teamName', e.target.value)} onKeyDown={e => handleKeyDown(e, index, 0)} />
                </td>
                <td data-label="Players">
                  <button className="btn btn-secondary" onClick={() => setEditingTeamPlayersId(team.id)} style={{padding: '0.5rem', fontSize: '0.9rem', width: '100%'}}>
                    Manage
                  </button>
                </td>
                <td data-label="Matches">
                  <input id={`input-${index}-1`} type="text" inputMode="numeric" style={{textAlign: 'right'}} value={team.matches !== undefined ? team.matches : ''} onChange={e => handleNumberChange(team.id, 'matches', e.target.value)} onKeyDown={e => handleKeyDown(e, index, 1)} />
                </td>
                {tournamentMode === 'cs' ? (
                  <>
                    <td data-label="Wins">
                      <input id={`input-${index}-2`} type="text" inputMode="numeric" style={{textAlign: 'right'}} value={team.wins !== undefined ? team.wins : ''} onChange={e => handleNumberChange(team.id, 'wins', e.target.value)} onKeyDown={e => handleKeyDown(e, index, 2)} />
                    </td>
                    <td data-label="Losses">
                      <input id={`input-${index}-3`} type="text" inputMode="numeric" style={{textAlign: 'right'}} value={team.losses !== undefined ? team.losses : ''} onChange={e => handleNumberChange(team.id, 'losses', e.target.value)} onKeyDown={e => handleKeyDown(e, index, 3)} />
                    </td>
                  </>
                ) : (
                  <>
                    <td data-label="Booyahs">
                      <input id={`input-${index}-2`} type="text" inputMode="numeric" style={{textAlign: 'right'}} value={team.booyahs !== undefined ? team.booyahs : ''} onChange={e => handleNumberChange(team.id, 'booyahs', e.target.value)} onKeyDown={e => handleKeyDown(e, index, 2)} />
                    </td>
                    <td data-label="Ranks">
                      <input id={`input-${index}-3`} type="text" style={{textAlign: 'right'}} value={team.ranks !== undefined ? team.ranks : ''} placeholder={team.placementPoints ? `Pts: ${team.placementPoints}` : ''} onChange={e => updateTeamData(team.id, 'ranks', e.target.value)} onKeyDown={e => handleKeyDown(e, index, 3)} />
                    </td>
                  </>
                )}
                <td data-label="Kills">
                  <input id={`input-${index}-4`} type="text" inputMode="numeric" style={{textAlign: 'right'}} value={team.kills !== undefined ? team.kills : ''} onChange={e => handleNumberChange(team.id, 'kills', e.target.value)} onKeyDown={e => handleKeyDown(e, index, 4)} />
                </td>
                <td data-label="Remove" style={{textAlign: 'center'}}>
                  <button className="btn btn-secondary" onClick={() => removeTeam(team.id)} style={{color: 'var(--color-red-main)', padding: '0.2rem 0.5rem', width: 'auto'}}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={addTeam} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <Plus size={18} /> Add New Team
        </button>
      </div>

      {editingTeamPlayersId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="panel" style={{width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h3 style={{marginTop: 0, color: 'var(--color-gold)'}}>
              Manage {tournamentMode === 'br' ? 'Match History' : 'Players'} for {extractedData.find(t => t.id === editingTeamPlayersId)?.teamName}
            </h3>
            
            {tournamentMode === 'br' ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
                <div style={{display: 'flex', gap: '0.5rem', color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center'}}>
                  <div style={{flex: '0 0 50px', textAlign: 'left'}}>Match</div>
                  <div style={{flex: 1}}>Kills</div>
                  <div style={{flex: 1}}>Rank</div>
                </div>
                {[0,1,2,3,4,5].map(mIndex => {
                   const team = extractedData.find(t => t.id === editingTeamPlayersId);
                   const history = team?.matchHistory || Array.from({length: 6}, (_, i) => ({ matchNum: i+1, kills: '', rank: '' }));
                   const currentMatch = history[mIndex] || { matchNum: mIndex+1, kills: '', rank: '' };
                   
                   const updateHistory = (field, value) => {
                     const newHistory = [...history];
                     newHistory[mIndex] = { ...currentMatch, [field]: value.replace(/[^0-9]/g, '') };
                     updateTeamData(editingTeamPlayersId, 'matchHistory', newHistory);
                   };

                   return (
                     <div key={mIndex} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                       <div style={{flex: '0 0 50px', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap'}}>M {mIndex + 1}</div>
                       <input 
                         type="text" 
                         inputMode="numeric" 
                         value={currentMatch.kills} 
                         onChange={e => updateHistory('kills', e.target.value)} 
                         style={{flex: 1, minWidth: '0', textAlign: 'center', padding: '0.5rem 0.2rem', background: 'var(--color-dark-red)', border: '1px solid rgba(255, 90, 30, 0.3)', color: 'white'}} 
                         placeholder="0" 
                       />
                       <input 
                         type="text" 
                         inputMode="numeric" 
                         value={currentMatch.rank} 
                         onChange={e => updateHistory('rank', e.target.value)} 
                         style={{flex: 1, minWidth: '0', textAlign: 'center', padding: '0.5rem 0.2rem', background: 'var(--color-dark-red)', border: '1px solid rgba(255, 90, 30, 0.3)', color: 'white'}} 
                         placeholder="-" 
                       />
                     </div>
                   );
                })}
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem'}}>
                {[0, 1, 2, 3, 4].map(playerIndex => (
                  <div key={playerIndex}>
                    <label style={{display: 'block', marginBottom: '0.2rem', fontSize: '0.9rem', color: 'var(--color-gold-light)'}}>
                      Player {playerIndex + 1} {playerIndex === 4 ? '(Optional)' : ''}
                    </label>
                    <input 
                      type="text" 
                      value={extractedData.find(t => t.id === editingTeamPlayersId)?.players?.[playerIndex] || ''} 
                      onChange={(e) => {
                        const newPlayers = [...(extractedData.find(t => t.id === editingTeamPlayersId)?.players || ['', '', '', '', ''])];
                        newPlayers[playerIndex] = e.target.value;
                        updateTeamData(editingTeamPlayersId, 'players', newPlayers);
                      }}
                      style={{
                        width: '100%', padding: '0.75rem', 
                        background: 'var(--color-dark-red)', 
                        border: '1px solid rgba(255, 90, 30, 0.3)', 
                        color: 'var(--color-white)', 
                        fontFamily: 'var(--font-main)'
                      }}
                      placeholder={`Enter Player ${playerIndex + 1} Name`}
                    />
                  </div>
                ))}
              </div>
            )}
            <button className="btn" style={{marginTop: '1.5rem', width: '100%'}} onClick={handleCloseModal}>
              Done
            </button>
          </div>
        </div>
      )}

      <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
        {/* OCR HIDDEN FOR NOW
        <button className="btn btn-secondary" onClick={() => { setIsAppendingMode(true); setImage(null); setStep('upload'); }}>
          + Add Next Match Screenshot
        </button>
        */}
        <button className="btn" onClick={calculateResults}>Calculate Points</button>
      </div>
    </div>
  );

  const renderResultStep = () => {
    const displayStandings = [...standings];
    while(displayStandings.length < 12) {
      displayStandings.push({
        isEmpty: true,
        teamName: '', match: '', wins: '', losses: '', kills: '', totalPoints: ''
      });
    }

    return (
      <div className="panel">
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button className="btn btn-secondary" onClick={() => setStep('dashboard')}><ArrowLeft size={16} style={{marginRight: '0.5rem'}}/> Dashboard</button>
            <button className="btn btn-secondary" onClick={() => setStep('edit')}>
              <Edit size={16} style={{marginRight: '0.5rem'}}/> Edit Data
            </button>
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button className="btn btn-secondary" onClick={saveCurrentData} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--color-gold)', color: 'var(--color-gold)'}}>
              <Save size={16} /> Save Tournament
            </button>
            <button className="btn" onClick={downloadImage} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <Download size={16} /> Download PNG
            </button>
          </div>
        </div>

        <div style={{width: '100%', display: 'flex', justifyContent: 'center', backgroundColor: '#000', padding: '1rem 0'}}>
          <div style={{ 
            width: `${1080 * scale}px`, 
            height: `${1350 * scale}px`, 
            position: 'relative'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left' 
            }}>
              <div 
                className="scoreboard-wrapper" 
                ref={scoreboardRef}
                style={{ position: 'relative' }}
              >
            <img 
              src={bgImage ? bgImage : bgTemplate} 
              alt="background"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} 
            />
            
            <img 
              src="/logo.jpg" 
              alt="logo"
              style={{ position: 'absolute', top: '30px', right: '40px', width: 'auto', height: '120px', objectFit: 'contain', zIndex: 2, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} 
            />
            
            <div className="scoreboard-content" style={{ position: 'relative', zIndex: 1 }}>
              <h1 className="scoreboard-main-title">BOSS ESPORTS TOURNAMENT</h1>
              <div className="scoreboard-title-box">
                <h3>OVERALL STANDINGS</h3>
              </div>
              
              <div className="scoreboard-table-container">
                <table className="scoreboard-table">
                  <thead>
                    <tr>
                      <th>POS</th>
                      <th>TEAM NAME</th>
                      <th>MATCH</th>
                      {tournamentMode === 'cs' ? (
                        <>
                          <th>WIN</th>
                          <th>LOST</th>
                        </>
                      ) : (
                        <>
                          <th>BOOYAH</th>
                          <th>PLACE PTS</th>
                        </>
                      )}
                      <th>KILLS</th>
                      {tournamentMode === 'cs' && <th>PTS</th>}
                      <th>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className={tournamentMode === 'br' ? 'br-mode' : ''}>
                    {displayStandings.slice(0, 12).map((team, index) => (
                      <tr key={index} className={team.isEmpty ? 'empty-row' : ''}>
                        <td>{String(index + 1).padStart(2, '0')}</td>
                        <td>
                          <div className="team-name-wrapper">
                            <span 
                              className="team-name-text"
                              contentEditable={!team.isEmpty} 
                              suppressContentEditableWarning={true}
                              onBlur={(e) => handleInlineEdit(team.id, 'teamName', e.target.innerText)}
                            >
                              {team.teamName || ''}
                            </span>
                            {championRushEnabled && team.totalPoints >= championRushThreshold && <span className="team-trophy" contentEditable={false}>🏆</span>}
                          </div>
                        </td>
                        <td 
                          contentEditable={!team.isEmpty} 
                          suppressContentEditableWarning={true}
                          onBlur={(e) => handleInlineEdit(team.id, 'matches', e.target.innerText)}
                        >{!team.isEmpty ? String(team.match).padStart(2, '0') : ''}</td>
                        
                        {tournamentMode === 'cs' ? (
                          <>
                            <td 
                              contentEditable={!team.isEmpty} 
                              suppressContentEditableWarning={true}
                              onBlur={(e) => handleInlineEdit(team.id, 'wins', e.target.innerText)}
                            >{!team.isEmpty ? team.wins : ''}</td>
                            <td 
                              contentEditable={!team.isEmpty} 
                              suppressContentEditableWarning={true}
                              onBlur={(e) => handleInlineEdit(team.id, 'losses', e.target.innerText)}
                            >{!team.isEmpty ? team.losses : ''}</td>
                          </>
                        ) : (
                          <>
                            <td 
                              contentEditable={!team.isEmpty} 
                              suppressContentEditableWarning={true}
                              onBlur={(e) => handleInlineEdit(team.id, 'booyahs', e.target.innerText)}
                            >{!team.isEmpty ? team.booyahs : ''}</td>
                            <td 
                              contentEditable={!team.isEmpty} 
                              suppressContentEditableWarning={true}
                              onBlur={(e) => handleInlineEdit(team.id, 'placementPoints', e.target.innerText)}
                            >{!team.isEmpty ? team.placementPoints : ''}</td>
                          </>
                        )}
                        
                        <td 
                          contentEditable={!team.isEmpty} 
                          suppressContentEditableWarning={true}
                          onBlur={(e) => handleInlineEdit(team.id, 'kills', e.target.innerText)}
                        >{!team.isEmpty ? team.kills : ''}</td>
                        {tournamentMode === 'cs' && <td>{!team.isEmpty ? team.matchPoints : ''}</td>}
                        <td>{!team.isEmpty ? team.totalPoints : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="scoreboard-watermark">
                By <span style={{ fontSize: '0.6em', verticalAlign: 'super', marginRight: '2px' }}>BOSS</span>SPOILER ꧂
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    );
  };

  const isLiveOverlay = new URLSearchParams(window.location.search).get('live') === 'true';
  if (isLiveOverlay) {
    return <LiveOverlay />;
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>BOSS ESPORTS</h1>
        <h2>Clash Squad Points Calculator</h2>
      </div>

      {step === 'home' && renderHomeStep()}
      {step === 'login' && renderLoginStep()}
      {step === 'dashboard' && renderDashboardStep()}
      {step === 'upload' && renderUploadStep()}
      {step === 'edit' && renderEditStep()}
      {step === 'result' && renderResultStep()}
    </div>
  );
}

export default App;
