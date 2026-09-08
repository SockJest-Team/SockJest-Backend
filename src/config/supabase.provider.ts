import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  useFactory: (config: ConfigService) => {
    const url = config.getOrThrow<string>('SUPABASE_URL');
    const key = config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    const payload = JSON.parse(
      Buffer.from(key.split('.')[1] ?? '', 'base64').toString('utf8'),
    ) as { role?: string; ref?: string };
    console.log(
      `[SupabaseProvider] rol=${payload.role} proyecto=${payload.ref} ` +
        `(esperado: service_role / ${url.replace('https://', '').split('.')[0]})`,
    );

    return createClient(url, key);
  },
  inject: [ConfigService],
};
