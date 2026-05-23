const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jniaoqiwltuylkoryefr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWFvcWl3bHR1eWxrb3J5ZWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDUwNDIsImV4cCI6MjA5MzUyMTA0Mn0.Q_qOgNRlRvByh7yUN4G2INDbxeQ_cKi9_0AUl66nwFA'
);

async function run() {
  const id = 'abdf639f-3cd4-4c50-ba2c-a2d03a10e57f'; // 'حماية الشواطئ' which has public_share: null
  const { data: cup, error: cupError } = await supabase
    .from('cups')
    .select('*, tasks(*), profiles:user_id(*)')
    .eq('id', id)
    .single();

  console.log('--- TEST ---');
  console.log('Error:', cupError);
  console.log('Cup:', cup);
}

run();
