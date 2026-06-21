import { DataSource } from 'typeorm';

const isTs = __filename.endsWith('.ts');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'irisuser',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_DATABASE || 'iris',

  entities: [isTs ? '/modules/**/entities/*.entity.ts' : 'dist/modules/**/entities/*.entity.js'],
  migrations: [isTs ? 'src/migrations/*{.ts,.js}' : 'dist/migrations/*.js'],

  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.NODE_ENV !== 'production',
});
