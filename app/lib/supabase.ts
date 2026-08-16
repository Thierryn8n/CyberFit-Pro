// Compatibilidade: mantem o import antigo `import { supabase } from './supabase'`
// funcionando, agora usando o client @supabase/ssr com cookies.
import { createClient } from "@/lib/supabase/client"

export const supabase = createClient()
export { createClient }
