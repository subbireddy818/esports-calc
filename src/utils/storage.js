import { supabase } from './supabase';

export const getSavedTournaments = async () => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('last_modified', { ascending: false });
      
    if (error) throw error;
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      mode: item.mode || 'cs',
      teamsData: item.teams_data,
      winPointValue: Number(item.win_point_value),
      killPointValue: Number(item.kill_point_value),
      createdAt: item.created_at,
      lastModified: item.last_modified
    }));
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
      mode: tournamentData.mode || 'cs',
      teams_data: tournamentData.teamsData,
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
      
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to save tournament to Supabase', err);
    return false;
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
