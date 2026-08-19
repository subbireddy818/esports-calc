// Local Storage Implementation
export const getSavedTournaments = async () => {
  try {
    const saved = localStorage.getItem('boss_tournaments');
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Error loading tournaments:', err);
    return [];
  }
};

export const saveTournament = async (tournament) => {
  try {
    const tournaments = await getSavedTournaments();
    const existingIndex = tournaments.findIndex(t => t.id === tournament.id);
    
    // Convert back to camelCase for the app payload
    const tournamentToSave = {
      id: tournament.id,
      name: tournament.name,
      teamsData: tournament.teamsData,
      winPointValue: tournament.winPointValue,
      killPointValue: tournament.killPointValue,
      lastModified: new Date().toISOString(),
      createdAt: tournament.id ? (tournaments[existingIndex]?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      tournaments[existingIndex] = tournamentToSave;
    } else {
      tournaments.push(tournamentToSave);
    }
    
    localStorage.setItem('boss_tournaments', JSON.stringify(tournaments));
    return true;
  } catch (err) {
    console.error('Error saving tournament:', err);
    return false;
  }
};

export const deleteTournament = async (id) => {
  try {
    const tournaments = await getSavedTournaments();
    const filtered = tournaments.filter(t => t.id !== id);
    localStorage.setItem('boss_tournaments', JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Error deleting tournament:', err);
    return false;
  }
};
