import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function checkTables() {
  const tables = ['cases', 'room_details', 'room_members', 'rooms'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table exists: ${table} (records: ${data?.length})`);
    } else {
      console.log(`Table error ${table}: ${error.message}`);
    }
  }
}

checkTables();
