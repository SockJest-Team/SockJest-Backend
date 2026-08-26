import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  useFactory: (config: ConfigService) => {
    return createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  },
  inject: [ConfigService],
};