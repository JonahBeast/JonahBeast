import { createClient } from '@supabase/supabase-js';

// Estas credenciales son seguras de tener aquí: la "publishable key"
// está diseñada para usarse en el navegador, protegida por las políticas
// de seguridad (RLS) que ya configuramos en las tablas de Supabase.
const supabaseUrl = 'https://jnhvpjrxilubkyhculoh.supabase.co';
const supabaseKey = 'sb_publishable_v3_YW6HE5Yjeoq9VKwjWJg_8AsYh_WW';

export const supabase = createClient(supabaseUrl, supabaseKey);
