module.exports = {
  apps: [
    {
      name: 'sovira-assistant-worker',
      script: 'npx',
      args: 'tsx worker/assistant-worker.ts',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 25,
      min_uptime: '10s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 2000,
      max_memory_restart: '900M',
      kill_timeout: 15000,
      env: {
        NODE_ENV: 'production',
        PLAYWRIGHT_HEADLESS: 'true',
      },
      out_file: './.worker-logs/out.log',
      error_file: './.worker-logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}
