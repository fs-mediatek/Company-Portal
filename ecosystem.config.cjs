module.exports = {
  apps: [
    {
      name: "company-portal",
      script: "server.js",
      cwd: "/var/www/company-portal",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_file: "/var/www/company-portal/.env.local",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
