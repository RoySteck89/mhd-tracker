const SUPABASE_URL = 'https://zbbmaxwbjqhuziuxoytn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYm1heHdianFodXppdXhveXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODQxMzQsImV4cCI6MjEwODg2MDEzNH0.zoNrYe7tvyf-m7QjGciPYiT5ZdpJHdYEcAvCB-yNlig'; 

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyActivationKey(key) {
    try {
        const { data, error } = await _supabase
            .from('activations')
            .select('*')
            .eq('activation_key', key)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return false;
        }
        return true;
    } catch (err) {
        console.error('Fehler bei der Aktivierung:', err);
        return false;
    }
}

async function saveMhdItem(activationKey, barcode, articleName, mhdDate) {
    try {
        const { data, error } = await _supabase
            .from('mhd_items')
            .insert([
                { 
                    activation_key: activationKey, 
                    barcode: barcode, 
                    article_name: articleName, 
                    mhd_date: mhdDate 
                }
            ]);

        if (error) {
            console.error('Fehler beim Einfügen:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Unerwarteter Fehler:', err);
        return false;
    }
}

async function fetchMhdItems(activationKey) {
    try {
        const { data, error } = await _supabase
            .from('mhd_items')
            .select('*')
            .eq('activation_key', activationKey)
            .order('mhd_date', { ascending: true });

        if (error) {
            console.error('Fehler beim Laden:', error);
            return [];
        }
        return data;
    } catch (err) {
        console.error('Unerwarteter Fehler:', err);
        return [];
    }
}