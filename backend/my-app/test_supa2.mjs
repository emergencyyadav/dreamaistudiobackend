import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nltdcgsmvppjlmafkkan.supabase.co';
const supabaseKey = 'sb_publishable_2BCTvVFQp2haxtK1ffjybg_AIZnroHQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*, characters(*)');
    console.log("Error:", chatError);
    // console.log("Data:", chatData);
}
test();
