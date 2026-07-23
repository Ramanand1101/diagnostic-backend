module.exports = {
  apps: [
    // ── API Server — one worker per CPU core ────────────────────────────────
    {
      name:      'healthontime-api',
      script:    'server.js',
      instances: 'max',          // auto-detects CPU count (e.g. 4 on a 4-core VPS)
      exec_mode: 'cluster',      // shares port across workers; OS balances connections
      watch:     false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT:     5001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     5001,
      },
      error_file: './logs/api-error.log',
      out_file:   './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },

    // ── Background Workers — single process (BullMQ manages concurrency internally)
    {
      name:   'healthontime-workers',
      script: 'src/workers/index.js',
      instances: 1,              // workers must be single-instance (BullMQ handles concurrency)
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file:   './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
