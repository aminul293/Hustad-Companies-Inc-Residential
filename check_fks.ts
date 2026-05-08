import { getServiceClient } from './src/lib/supabase-server.ts';

async function check() {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'pipeline_leads' });
  console.log("Table Info:", data || error);
  
  // Try to find foreign keys manually if rpc fails
  const { data: fks, error: fkError } = await supabase.from('information_schema.key_column_usage').select('*').eq('referenced_table_name', 'pipeline_leads');
  console.log("Foreign Keys:", fks || fkError);
}

check();
