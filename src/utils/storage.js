const STORAGE_KEY = 'boss_esports_tournaments';

export const getSavedTournaments = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to load tournaments', err);
    return [];
  }
};

export const saveTournament = (tournamentData) => {
  try {
    const tournaments = getSavedTournaments();
    const existingIndex = tournaments.findIndex(t => t.id === tournamentData.id);
    
    if (existingIndex >= 0) {
      tournaments[existingIndex] = {
        ...tournaments[existingIndex],
        ...tournamentData,
        lastModified: new Date().toISOString()
      };
    } else {
      tournaments.push({
        ...tournamentData,
        id: tournamentData.id || Date.now().toString(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    return true;
  } catch (err) {
    console.error('Failed to save tournament', err);
    return false;
  }
};

export const deleteTournament = (id) => {
  try {
    const tournaments = getSavedTournaments();
    const filtered = tournaments.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete tournament', err);
    return false;
  }
};
