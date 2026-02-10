# Server Agent

A self-hosted, production-ready agent for monitoring and remotely deploying to Linux servers. Designed to run on a laptop/server and be controlled securely by a remote dashboard via Cloudflare Tunnel.

## 🎯 Features

- **System Monitoring**: CPU, RAM, disk usage, load average, uptime
- **Docker Monitoring**: Container status, CPU/memory usage, uptime
- **Git Integration**: Display latest commit hash, author, message, timestamp
- **Container Logs**: Stream logs from any running container
- **Safe Deployments**: Trigger predefined deployment script with rate limiting
- **Bearer Token Auth**: All endpoints protected with HTTPS-only token authentication
- **Production-Ready**: Timeouts, error handling, security hardening

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker CLI (if monitoring containers)
- Git (if monitoring commits)
- Linux system

### Installation

```bash
# Clone/extract to your server
cd agent

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with a secure token
nano .env
```

### Fedora-Specific Setup

If running on Fedora Linux, ensure these prerequisites are installed:

```bash
# Install Node.js 18+ (if not already installed)
sudo dnf install nodejs npm

# Install Docker (if monitoring containers)
sudo dnf install docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (to run docker commands without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker access
docker ps  # Should work without sudo

# Install Git (if monitoring git commits)
sudo dnf install git
```

### Running the Agent

```bash
node src/index.js
```

The agent will start on port 3000 (configurable via `PORT` env var).

```
🚀 Server Agent running on port 3000
📊 Available endpoints:
  GET  /health              (no auth)
  GET  /system              (protected)
  GET  /docker              (protected)
  GET  /git/latest          (protected)
  GET  /logs?container=name (protected)
  POST /deploy              (protected)
  GET  /deploy/status       (protected)
```

## 📝 Environment Setup

Create a `.env` file:

```env
AGENT_TOKEN=your-super-secret-random-token-32-chars-min
PORT=3000
NODE_ENV=production
```

**Generate a secure token:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔐 Security Setup with Cloudflare Tunnel

### 1. Install Cloudflare Tunnel

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

### 2. Authenticate

```bash
cloudflared tunnel login
```

### 3. Create Tunnel

```bash
cloudflared tunnel create server-agent
```

### 4. Create Configuration File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: server-agent
credentials-file: /home/user/.cloudflared/server-agent.json

ingress:
  - hostname: agent.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### 5. Run Tunnel

```bash
cloudflared tunnel run server-agent
```

Or as a service:

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
```

## 📡 API Endpoints

### Health Check (No Auth)

```bash
GET /health

Response:
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2026-02-10T12:34:56.789Z"
}
```

### System Metrics

```bash
GET /system
Authorization: Bearer YOUR_TOKEN

Response:
{
  "uptime": "up 2 days, 3 hours, 45 minutes",
  "loadAverage": {
    "oneMinute": 0.45,
    "fiveMinutes": 0.52,
    "fifteenMinutes": 0.48
  },
  "cpuUsage": "42.30%",
  "memory": {
    "total": "15G",
    "used": "8.5G",
    "free": "6.5G",
    "percentage": "56.67%"
  },
  "disk": {
    "total": "250G",
    "used": "120G",
    "available": "130G",
    "percentage": "48%"
  },
  "timestamp": "2026-02-10T12:34:56.789Z"
}
```

### Docker Containers

```bash
GET /docker
Authorization: Bearer YOUR_TOKEN

Response:
{
  "containers": [
    {
      "name": "web-app",
      "id": "abc123def456",
      "status": "Up 2 days",
      "cpu": "1.23%",
      "memory": "256.5MiB",
      "uptime": "2d 5h"
    }
  ],
  "count": 1,
  "timestamp": "2026-02-10T12:34:56.789Z"
}
```

### Latest Git Commit

```bash
GET /git/latest
Authorization: Bearer YOUR_TOKEN

Response:
{
  "hash": "a1b2c3d4e5f6",
  "fullHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "author": "John Doe",
  "message": "Fix: Update deploy script",
  "time": "2026-02-10 12:15:30 +0000"
}
```

### Container Logs

```bash
GET /logs?container=web-app&lines=50
Authorization: Bearer YOUR_TOKEN

Response:
{
  "container": "web-app",
  "lines": 50,
  "logs": "[2026-02-10T12:34:56] Application started...",
  "timestamp": "2026-02-10T12:34:56.789Z"
}
```

### Trigger Deployment

```bash
POST /deploy
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "message": "Deployment completed",
  "timestamp": "2026-02-10T12:34:56.789Z",
  "output": "[git pull output...]",
  "errors": ""
}
```

### Deployment Status

```bash
GET /deploy/status
Authorization: Bearer YOUR_TOKEN

Response:
{
  "isDeploying": false,
  "lastDeployTime": "2026-02-10T12:34:56.789Z",
  "canDeploy": true
}
```

## 🛠️ Example Usage (from Dashboard)

```javascript
const AGENT_URL = 'https://agent.yourdomain.com';
const TOKEN = 'your-bearer-token';

// System metrics
const response = await fetch(`${AGENT_URL}/system`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const metrics = await response.json();

// Trigger deployment
const deploy = await fetch(`${AGENT_URL}/deploy`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const result = await deploy.json();
```

## 🚀 Deployment Script

The `scripts/deploy.sh` script handles:

1. **Git Update**: `git pull origin main`
2. **Dependencies**: `npm ci` if `package.json` exists
3. **Docker Build**: 
   - If `docker-compose.yml` exists: runs `docker-compose up -d`
   - If `Dockerfile` exists: builds and runs single container
4. **Logging**: All output logged to `deploy.log`

### Customization

Edit `scripts/deploy.sh` to match your deployment workflow:

- Add custom build steps
- Configure environment variables
- Run tests before deploy
- Notify services of deployment

## 🔒 Security Best Practices

### ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] Generate a secure `AGENT_TOKEN` (minimum 32 characters, use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Never commit `.env` file to git
- [ ] Never share `AGENT_TOKEN` - treat it like a password
- [ ] Verify `.env.example` does not contain real secrets
- [ ] Test agent locally: `node src/index.js`
- [ ] Verify `/health` endpoint responds without auth
- [ ] Verify protected endpoints require `Authorization: Bearer <token>`
- [ ] Configure Cloudflare Tunnel for HTTPS-only access
- [ ] Test deployment script: `bash scripts/deploy.sh` (on target server)
- [ ] Monitor deploy logs for errors: `tail -f deploy.log`
- [ ] Set up firewall rules to block direct port access (only allow Cloudflare IPs)
- [ ] Keep Node.js and Docker updated on target server

### ✅ DO

- Use a long, random `AGENT_TOKEN` (32+ characters)
- Run agent behind Cloudflare Tunnel (HTTPS only)
- Use strong Cloudflare credentials
- Keep Node.js and Docker updated
- Monitor `/deploy` endpoint logs
- Rotate tokens periodically
- Use firewall rules if exposed locally
- Run agent as non-root user on production
- Enable Docker log rotation to prevent disk issues

### ❌ DON'T

- Expose the agent directly to the internet (use Cloudflare Tunnel)
- Share your `AGENT_TOKEN` or commit it to git
- Run with weak authentication tokens
- Allow SSH access to the deployment script
- Execute arbitrary commands from the dashboard
- Log sensitive information
- Run agent as root user
- Share the same `AGENT_TOKEN` across multiple servers

## 📋 Deployment Rate Limiting

- Maximum 1 deployment per 60 seconds
- Only one deployment can run at a time
- Concurrent requests return error with cooldown time

## 🚀 Production Deployment

### Using systemd Service (Recommended for Fedora)

Create `/etc/systemd/system/server-agent.service`:

```ini
[Unit]
Description=Server Agent for Remote Monitoring and Deployment
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=agent
WorkingDirectory=/opt/server-agent
EnvironmentFile=/opt/server-agent/.env
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable server-agent
sudo systemctl start server-agent
sudo systemctl status server-agent
sudo journalctl -fu server-agent  # View logs
```

### Using Docker Container

```bash
# Build agent container (optional)
docker build -t server-agent:latest .

# Run as container
docker run -d \
  --name server-agent \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /path/to/.env \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /opt/server-agent:/opt/server-agent \
  server-agent:latest
```

### Using Process Manager (pm2)

```bash
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'server-agent',
      script: './src/index.js',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '/opt/server-agent/.env',
    }
  ]
};
EOF

# Start with pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### Agent won't start
- Check `PORT` isn't in use: `lsof -i :3000`
- Verify Node.js is installed: `node --version`
- Check logs for missing dependencies

### Docker commands fail
- Verify Docker is running: `docker ps`
- Check user permissions: `docker ps -a` (should not require sudo)
- Add user to docker group: `sudo usermod -aG docker $USER`

### Cloudflare Tunnel issues
- Check tunnel status: `cloudflared tunnel list`
- View logs: `cloudflared tunnel logs server-agent`
- Verify DNS records point to tunnel

### Git commands fail
- Check `.git` directory exists
- Verify git credentials: `git status`
- Check network/SSH key access

## 📊 Monitoring

The agent is stateless - all data is collected on-demand. For persistent monitoring:

- Call `/system` and `/docker` endpoints periodically (every 30-60s)
- Store metrics in your dashboard's database
- Set up alerts based on thresholds
- Monitor `/deploy/status` for ongoing deployments

## 🏗️ Project Structure

```
agent/
├── src/
│   ├── index.js           # Main Express app
│   ├── auth.js            # Bearer token middleware
│   ├── system.js          # System metrics collection
│   ├── docker.js          # Docker metrics collection
│   ├── git.js             # Git commit fetching
│   ├── deploy.js          # Deployment orchestration
│   ├── logs.js            # Container logs retrieval
│   └── utils/
│       └── exec.js        # Safe command execution wrapper
├── scripts/
│   └── deploy.sh          # Deployment script
├── .env.example           # Example environment
├── package.json           # Dependencies
└── README.md              # This file
```

## 📦 Dependencies

- `express@^4.18.2` - HTTP server framework

No other external dependencies! Uses only Node.js built-ins for security and simplicity.

## 📄 License

MIT

## 🤝 Support

For issues or improvements, please check the code structure and logs:

- Agent logs to console
- Deploy logs written to `deploy.log`
- All commands have 30s timeout by default
- Check Cloudflare Tunnel logs for connectivity issues

---

**Remember**: This agent should only be accessible to your trusted dashboard. Treat the `AGENT_TOKEN` like a password.
