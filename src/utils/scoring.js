export const calculateStandings = (results, mode, winPointValue, killPointValue) => {
  const standings = results.map(result => {
    const { teamName, matches = 0, wins = 0, losses = 0, kills = 0, booyahs = 0, placementPoints = 0 } = result;
    
    let matchPoints = 0;
    let killPoints = kills * killPointValue;
    let totalPoints = 0;

    if (mode === 'br') {
      matchPoints = placementPoints;
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
      placementPoints: placementPoints,
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
