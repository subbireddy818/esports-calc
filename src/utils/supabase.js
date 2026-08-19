import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hsztgccuyheqjgunjwre.supabase.co';
const supabaseKey = 'sb_publishable_ivm-XLzqR6eHsA8wI1PiYg_7wyO70yO';

export const supabase = createClient(supabaseUrl, supabaseKey);
