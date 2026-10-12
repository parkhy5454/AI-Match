module.exports = {
  apps: [
    {
      // Next.js 웹 애플리케이션
      name: 'ai-match-web',
      script: 'npm',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/web-err.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      // 자동 재시작
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      // 로그 로테이션
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      // WebSocket 서버
      name: 'ai-match-websocket',
      script: 'node',
      args: 'websocket-server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        WEBSOCKET_PORT: 3001,
      },
      error_file: './logs/websocket-err.log',
      out_file: './logs/websocket-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '300M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      // 자동 재시작
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      key: '~/.ssh/deploy_key',
      ref: 'origin/main',
      repo: 'git@github.com:parkhy5454/AI-Match.git',
      path: '/var/www/ai-match',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying branch $(git branch --show-current)"',
    },
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:parkhy5454/AI-Match.git',
      path: '/var/www/ai-match-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
