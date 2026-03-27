import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nltdcgsmvppjlmafkkan.supabase.co';
const supabaseKey = 'sb_publishable_2BCTvVFQp2haxtK1ffjybg_AIZnroHQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('characters').select('*');
    console.log("Error:", error);
    console.log("Data:", data);
}
test();
