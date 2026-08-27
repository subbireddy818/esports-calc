import React, { useEffect, useState } from 'react';
import { supabase } from './utils/supabase';
import { calculateStandings, DEFAULT_BR_POINTS } from './utils/scoring';
import './LiveOverlay.css';

export default function LiveOverlay() {
  const [standings, setStandings] = useState([]);
  const [mode, setMode] = useState('cs');
  const [tournamentName, setTournamentName] = useState('LIVE STANDINGS');
  const [matchDay, setMatchDay] = useState('Day 1');
  const [matchDate, setMatchDate] = useState('');

  const [championRushEnabled, setChampionRushEnabled] = useState(true);
  const [championRushThreshold, setChampionRushThreshold] = useState(60);

  // Read the tournament ID from the URL
  const tournamentId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (!tournamentId) return;

    const fetchData = async () => {
      const { data } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
      
      if (data) {
        let teamsData = data.teams_data || [];
        let tMode = 'cs';
        let brConfigText = DEFAULT_BR_POINTS.join(',');
        let cRushEnabled = true;
        let cRushThreshold = 60;
        let dDay = 'Day 1';
        let dDate = '';
        
        if (teamsData && !Array.isArray(teamsData) && teamsData._wrapper) {
          tMode = teamsData.mode;
          if (teamsData.matchDay) dDay = teamsData.matchDay;
          if (teamsData.matchDate) dDate = teamsData.matchDate;
          if (teamsData.subtitle && !teamsData.matchDay) dDay = teamsData.subtitle;
          if (teamsData.brPointsConfigText) brConfigText = teamsData.brPointsConfigText;
          if (teamsData.championRushEnabled !== undefined) cRushEnabled = teamsData.championRushEnabled;
          if (teamsData.championRushThreshold !== undefined) cRushThreshold = teamsData.championRushThreshold;
          teamsData = teamsData.data;
        } else if (data.mode) {
          tMode = data.mode;
        }
        setMode(tMode);
        setTournamentName(data.name || 'BOSS ESPORTS TOURNAMENT');
        setMatchDay(dDay);
        setMatchDate(dDate);
        setChampionRushEnabled(cRushEnabled);
        setChampionRushThreshold(cRushThreshold);
        
        const brConfig = brConfigText.split(',').map(n => Number(n.trim()));
        setStandings(calculateStandings(teamsData, tMode, Number(data.win_point_value), Number(data.kill_point_value), brConfig));
      }
    };

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 5000); // Auto-update every 5 seconds
    return () => clearInterval(interval);
  }, [tournamentId]);

  if (!tournamentId) return <div style={{color: 'white', padding: '20px'}}>No tournament ID provided. Please copy the URL from the Dashboard.</div>;

  return (
    <div className="live-overlay-container">
      <div className="live-header">
        <h1>{tournamentName}</h1>
        <h2>{matchDay} {matchDate ? `• ${matchDate}` : ''}</h2>
      </div>
      <table className="live-table">
        <thead>
          <tr>
            <th>#</th>
            <th className="left-align">TEAM</th>
            <th>M</th>
            {mode === 'cs' ? (
              <><th>W</th><th>L</th></>
            ) : (
              <><th>B</th><th>PL</th></>
            )}
            <th>K</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.slice(0, 12).map((team, index) => (
            <tr key={team.id || index}>
              <td>{index + 1}</td>
              <td className="left-align team-name">
                <div className="team-name-wrapper">
                  <span className="team-name-text">{team.teamName || '---'}</span>
                  {championRushEnabled && team.totalPoints >= championRushThreshold && <span className="team-trophy">🏆</span>}
                </div>
              </td>
              <td>{team.match || 0}</td>
              {mode === 'cs' ? (
                <><td>{team.wins || 0}</td><td>{team.losses || 0}</td></>
              ) : (
                <><td>{team.booyahs || 0}</td><td>{team.placementPoints || 0}</td></>
              )}
              <td>{team.kills || 0}</td>
              <td className="highlight-pts">{team.totalPoints || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
