module.exports = {
  apps: [
    {
      name: 'anythingllm-server',
      cwd: './server',
      script: 'node',
      args: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true,
    },
    {
      name: 'anythingllm-collector',
      cwd: './collector',
      script: 'node',
      args: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/collector-error.log',
      out_file: './logs/collector-out.log',
      log_file: './logs/collector-combined.log',
      time: true,
    },
  ],
};
