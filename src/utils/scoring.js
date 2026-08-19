export const calculateStandings = (results, winPointValue, killPointValue) => {
  const standings = results.map(result => {
    const { teamName, matches = 0, wins = 0, losses = 0, kills = 0 } = result;
    
    const matchPoints = wins * winPointValue;
    const killPoints = kills * killPointValue;
    const totalPoints = matchPoints + killPoints;
    
    return {
      id: result.id,
      teamName: teamName || 'UNKNOWN',
      match: matches,
      wins: wins,
      losses: losses,
      kills: kills,
      matchPoints: matchPoints,
      totalPoints: totalPoints
    };
  });
  
  // Sort by Total Points -> Kills -> Wins
  return standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.wins - a.wins;
  });
};

export const DEFAULT_WIN_POINT_VALUE = 3;
export const DEFAULT_KILL_POINT_VALUE = 1;

