import { supabase } from './supabase';

export const getSavedTournaments = async () => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('last_modified', { ascending: false });
      
    if (error) throw error;
    return data.map(item => {
      let teamsData = item.teams_data || [];
      let mode = 'cs';
      let brPointsConfigText = undefined;
      let championRushEnabled = true;
      let championRushThreshold = 60;
      let matchDay = 'Day 1';
      let matchDate = new Date().toLocaleDateString('en-GB');
      
      if (teamsData && !Array.isArray(teamsData) && teamsData._wrapper) {
        mode = teamsData.mode;
        brPointsConfigText = teamsData.brPointsConfigText;
        if (teamsData.matchDay !== undefined) matchDay = teamsData.matchDay;
        if (teamsData.matchDate !== undefined) matchDate = teamsData.matchDate;
        if (teamsData.subtitle !== undefined && teamsData.matchDay === undefined) matchDay = teamsData.subtitle; // fallback
        if (teamsData.championRushEnabled !== undefined) championRushEnabled = teamsData.championRushEnabled;
        if (teamsData.championRushThreshold !== undefined) championRushThreshold = teamsData.championRushThreshold;
        teamsData = teamsData.data;
      } else if (item.mode) {
        mode = item.mode;
      }

      return {
        id: item.id,
        name: item.name,
        matchDay,
        matchDate,
        mode: mode,
        teamsData: teamsData,
        winPointValue: Number(item.win_point_value),
        killPointValue: Number(item.kill_point_value),
        brPointsConfigText: brPointsConfigText,
        championRushEnabled: championRushEnabled,
        championRushThreshold: championRushThreshold,
        createdAt: item.created_at,
        lastModified: item.last_modified
      };
    });
  } catch (err) {
    console.error('Failed to load tournaments from Supabase', err);
    return [];
  }
};

export const saveTournament = async (tournamentData) => {
  try {
    const id = tournamentData.id || Date.now().toString();
    const payload = {
      id,
      name: tournamentData.name,
      teams_data: {
        _wrapper: true,
        mode: tournamentData.mode || 'cs',
        matchDay: tournamentData.matchDay,
        matchDate: tournamentData.matchDate,
        brPointsConfigText: tournamentData.brPointsConfigText,
        championRushEnabled: tournamentData.championRushEnabled,
        championRushThreshold: tournamentData.championRushThreshold,
        data: tournamentData.teamsData
      },
      win_point_value: tournamentData.winPointValue,
      kill_point_value: tournamentData.killPointValue,
      last_modified: new Date().toISOString()
    };
    
    if (!tournamentData.id) {
      payload.created_at = payload.last_modified;
    }
    
    const { error } = await supabase
      .from('tournaments')
      .upsert(payload, { onConflict: 'id' });
      
    if (error) {
      console.error('Failed to save tournament to Supabase', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to save tournament to Supabase', err);
    return { success: false, error: err.message || String(err) };
  }
};

export const deleteTournament = async (id) => {
  try {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to delete tournament from Supabase', err);
    return false;
  }
};
