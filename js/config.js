const SUPABASE_URL="https://ggkgzexhcmadzkoeplqa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_omVlyKwHx1vYSCRt2bYOiA_jHjGIJht";

export function getConfig(){
  return Promise.resolve({
    url:SUPABASE_URL,
    key:SUPABASE_PUBLISHABLE_KEY
  });
}
