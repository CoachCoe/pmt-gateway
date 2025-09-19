# PMT Gateway - Production Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Redis 6+
- PM2 (for process management)
- Nginx (for reverse proxy)

### 1. Environment Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd pmt-gateway

# Install dependencies
npm install

# Copy production environment template
cp env.production.example .env

# Edit the .env file with your production values
nano .env
```

### 2. Database Setup

```bash
# Create production database
createdb pmt_gateway_prod

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. Build Application

```bash
# Build the application
npm run build

# Build frontend dashboard
cd frontend/dashboard
npm install
npm run build
cd ../..

# Build frontend SDK
cd frontend/sdk
npm install
npm run build
cd ../..
```

### 4. Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'pmt-gateway-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 5. Nginx Configuration

```nginx
# /etc/nginx/sites-available/pmt-gateway
server {
    listen 80;
    server_name yourdomain.com;

    # API backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Dashboard frontend
    location / {
        root /path/to/pmt-gateway/frontend/dashboard/dist;
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. Monitoring Setup

```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `WEBHOOK_SECRET` | Webhook signature secret | Yes | - |
| `COINGECKO_API_KEY` | CoinGecko API key | No | - |
| `POLKADOT_RPC_ENDPOINTS` | Comma-separated RPC endpoints | No | Default endpoints |
| `CORS_ORIGIN` | Allowed CORS origins | No | `http://localhost:3000` |
| `LOG_LEVEL` | Logging level | No | `info` |
| `NODE_ENV` | Environment | No | `development` |

### Security Checklist

- [ ] Change all default secrets
- [ ] Use strong passwords for database
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Backup strategy in place

## 📊 Monitoring

### Health Checks

```bash
# Check API health
curl https://yourdomain.com/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs pmt-gateway-api
```

### Database Monitoring

```bash
# Check database connection
npx prisma db pull

# View database status
psql -d pmt_gateway_prod -c "SELECT version();"
```

## 🔄 Updates

### Rolling Updates

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Restart PM2 processes
pm2 reload pmt-gateway-api
```

### Rollback

```bash
# Revert to previous version
git checkout <previous-commit>

# Rebuild and restart
npm run build
pm2 reload pmt-gateway-api
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection string
   echo $DATABASE_URL
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   sudo systemctl status redis
   
   # Test connection
   redis-cli ping
   ```

3. **Polkadot RPC Issues**
   ```bash
   # Check RPC endpoints
   curl -s https://rpc.polkadot.io/health
   
   # Update endpoints in .env
   ```

### Logs

```bash
# Application logs
pm2 logs pmt-gateway-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

## 📈 Performance Optimization

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_merchant_id ON payment_intents(merchant_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(delivery_status);
```

### Caching Strategy

- Redis for session storage
- API response caching
- Database query caching
- Static asset caching

### Load Balancing

For high-traffic deployments, consider:
- Multiple API instances
- Database read replicas
- CDN for static assets
- Load balancer (HAProxy, Nginx)

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management
   - Rotate secrets regularly

2. **Database Security**
   - Use connection pooling
   - Enable SSL connections
   - Regular backups
   - Access control

3. **API Security**
   - Rate limiting
   - Input validation
   - CORS configuration
   - Authentication/authorization

4. **Infrastructure Security**
   - Firewall configuration
   - Regular updates
   - Monitoring and alerting
   - Incident response plan

## 📞 Support

For deployment issues:
1. Check the logs first
2. Verify environment variables
3. Test database connectivity
4. Check network connectivity
5. Review security settings

For additional help, please refer to the API documentation or contact the development team.
