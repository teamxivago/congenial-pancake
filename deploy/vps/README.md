# Deploying on a VPS

This runs the whole app (Postiz + Studio) on one server with Docker Compose,
built from this repository's source. Caddy terminates HTTPS with an automatic
Let's Encrypt certificate.

## Server requirements

- Ubuntu 22.04/24.04 (any Linux with Docker works)
- **4 vCPU / 8 GB RAM recommended.** The Docker build alone needs ~6 GB of memory;
  on a smaller server add swap (`fallocate -l 8G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`)
- 40 GB+ disk (videos are stored in the `postiz-uploads` volume when `STORAGE_PROVIDER=local`)
- A domain with an A record pointing at the server, ports 80 and 443 open

## Install

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Code
git clone https://github.com/teamxivago/congenial-pancake.git
cd congenial-pancake

# 3. Config
cp deploy/vps/.env.vps.example deploy/vps/.env.vps
nano deploy/vps/.env.vps        # set DOMAIN, ACME_EMAIL, all the "change-me" secrets

# 4. Start
docker compose -f docker-compose.vps.yaml --env-file deploy/vps/.env.vps up -d --build
```

The first build takes 10-20 minutes. Then open `https://<DOMAIN>` and register:
the first account is your admin account.

## Update

```bash
git pull
docker compose -f docker-compose.vps.yaml --env-file deploy/vps/.env.vps up -d --build
```

Database schema changes are applied automatically on start (`prisma db push`).

## Logs and debugging

```bash
docker compose -f docker-compose.vps.yaml --env-file deploy/vps/.env.vps logs -f postiz
# Temporal UI (background jobs), through an SSH tunnel:
ssh -L 8080:localhost:8080 you@your-vps   # then open http://localhost:8080
```

## Backups

```bash
docker exec postiz-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz
docker run --rm -v congenial-pancake_postiz-uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```

## Connecting social platforms

Each platform needs a developer app whose OAuth redirect URL is
`https://<DOMAIN>/integrations/social/<provider>` (for example `/integrations/social/x`).
Put the keys in `deploy/vps/.env.vps` and restart. Some platforms (TikTok, Instagram,
YouTube) require app review before posting publicly. See
https://docs.postiz.com/providers for per-platform steps.
