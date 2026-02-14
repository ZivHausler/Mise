export const postgresConfig = {
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://mise:mise@localhost:5432/mise',
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
};
