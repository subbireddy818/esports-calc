export const DEFAULT_BR_POINTS = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0];

export const calculateStandings = (results, mode, winPointValue, killPointValue, brPointsConfig = DEFAULT_BR_POINTS) => {
  const standings = results.map(result => {
    const { teamName, matches = 0, wins = 0, losses = 0, kills = 0, booyahs = 0, placementPoints = 0, ranks = '' } = result;
    
    let matchPoints = 0;
    let killPoints = kills * killPointValue;
    let totalPoints = 0;
    let computedPlacementPoints = placementPoints;

    if (mode === 'br') {
      if (ranks && typeof ranks === 'string' && ranks.trim() !== '') {
        const rankList = ranks.split(',').map(r => parseInt(r.trim(), 10)).filter(r => !isNaN(r) && r > 0);
        computedPlacementPoints = rankList.reduce((sum, rank) => {
          const pts = rank <= brPointsConfig.length ? brPointsConfig[rank - 1] : 0;
          return sum + pts;
        }, 0);
      } else if (typeof ranks === 'string' && ranks.trim() === '') {
        computedPlacementPoints = 0;
      }
      matchPoints = computedPlacementPoints;
      totalPoints = matchPoints + killPoints;
    } else {
      matchPoints = wins * winPointValue;
      totalPoints = matchPoints + killPoints;
    }
    
    return {
      id: result.id,
      teamName: teamName || 'UNKNOWN',
      match: matches,
      wins: wins,
      losses: losses,
      kills: kills,
      booyahs: booyahs,
      placementPoints: computedPlacementPoints,
      ranks: ranks,
      matchPoints: matchPoints,
      killPoints: killPoints,
      totalPoints: totalPoints
    };
  });
  
  // Sort by Total Points -> Kills -> Booyahs/Wins
  return standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (mode === 'br') {
      return b.booyahs - a.booyahs;
    }
    return b.wins - a.wins;
  });
};

export const DEFAULT_WIN_POINT_VALUE = 3;
export const DEFAULT_KILL_POINT_VALUE = 1;
