import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

export const typeOrmConfig = (): TypeOrmModuleOptions => {
  const user = process.env.DB_USERNAME;
  const pass = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_NAME || process.env.DB_DATABASE || 'postgres';

  return {
    type: 'postgres',
    url: `postgres://${user}:${pass}@${host}:${port}/${db}`,
    ssl: { rejectUnauthorized: false },
    entities: [
      __dirname + '/../entities/**/*.entity{.ts,.js}',
      __dirname + '/../modules/**/*.entity{.ts,.js}',
    ],
    synchronize: process.env.NODE_ENV !== 'production',
  };
};
