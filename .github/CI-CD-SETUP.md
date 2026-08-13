# Tifora GitHub Actions CI/CD setup

This setup follows the existing deployment SOP: Node.js 20, PM2, Nginx,
`~/appzeto/Backend`, `/var/www/appzeto`, API port 5000, and Socket.IO port
5001. It does not use Docker.

## What the workflow does

- Pull requests to `main`: installs both applications, checks backend syntax,
  and builds the frontend.
- Pushes to `main`: runs the same checks, builds the frontend with production
  Vite variables, uploads the release over SSH, installs production backend
  dependencies, reloads the full PM2 ecosystem, and checks `/ready`.
- Manual deployments: can be started with **Actions > Tifora CI/CD > Run
  workflow**.

The workflow never uploads or deletes `Backend/.env`, `Backend/node_modules`,
or `/var/www/uploads`.

## 1. Prepare the VPS once

Log in as the same Linux user that currently owns/runs the PM2 processes, then
run:

```bash
sudo apt update
sudo apt install -y rsync

mkdir -p "$HOME/appzeto/Backend"
sudo mkdir -p /var/www/appzeto
sudo chown -R "$USER":www-data /var/www/appzeto
sudo chmod -R 775 /var/www/appzeto

test -f "$HOME/appzeto/Backend/.env"
node --version
pm2 --version
nginx -t
```

The `test -f` command must succeed. Keep the production backend secrets only in
`~/appzeto/Backend/.env`. Node should be version 20, as specified in the SOP.

## 2. Create a dedicated deployment SSH key

Run this on your own computer, not on the VPS:

```bash
ssh-keygen -t ed25519 -C "github-actions-tifora" -f ./tifora-actions-key
```

Append `tifora-actions-key.pub` to the deployment user's
`~/.ssh/authorized_keys` on the VPS. Test it before continuing:

```bash
ssh -i ./tifora-actions-key YOUR_VPS_USER@YOUR_VPS_IP
```

Keep `tifora-actions-key` private. Do not commit either key to Git.

## 3. Create the GitHub production environment

In the GitHub repository, open **Settings > Environments > New environment**
and create an environment named exactly `production`.

Optionally add a required reviewer so a person must approve every production
deployment.

## 4. Add production secrets

Inside the `production` environment, add these secrets:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IP address or SSH hostname |
| `VPS_USER` | Linux user that runs the existing PM2 processes |
| `VPS_SSH_KEY` | Complete contents of the private `tifora-actions-key` file |
| `VPS_KNOWN_HOSTS` | Trusted SSH host-key line generated below |
| `FRONTEND_ENV` | Complete production Vite environment content |

Generate `VPS_KNOWN_HOSTS` from a trusted computer after verifying the VPS
fingerprint:

```bash
ssh-keyscan -H YOUR_VPS_IP
```

If SSH uses a custom port, use `ssh-keyscan -p PORT -H YOUR_VPS_IP`, then add an
environment variable named `VPS_PORT` under **Environment variables**. Port 22
is used when the variable is absent.

`FRONTEND_ENV` is one multiline secret. Copy the values from the production
`Frontend/.env`, for example:

```dotenv
VITE_API_BASE_URL=/api
VITE_GOOGLE_MAPS_API_KEY=...
VITE_RAZORPAY_KEY_ID=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_VAPID_KEY=...
```

Vite embeds `VITE_*` values into the browser bundle. Never put backend secrets,
MongoDB credentials, JWT secrets, or private Firebase service-account JSON in
`FRONTEND_ENV`.

## 5. Confirm PM2 names and paths

On the VPS, run:

```bash
cd "$HOME/appzeto/Backend"
pm2 list
ls -la ecosystem.config.cjs .env
```

The committed ecosystem file manages `tifora-api`, `tifora-socket`, the
scheduler, and all queue workers. The first workflow deployment will start them
if `tifora-api` does not exist; later deployments reload the full ecosystem.

If the live server still uses the SOP's old `appzeto-api` and
`appzeto-socket` process names, stop those old processes immediately before the
first workflow deployment, otherwise both versions will compete for ports 5000
and 5001:

```bash
pm2 stop appzeto-api appzeto-socket
```

There will be a short interruption during this one-time process-name migration.
After the first successful deployment, confirm the new processes with `pm2
list`, then remove only the stopped legacy entries with `pm2 delete
appzeto-api appzeto-socket` and run `pm2 save`.

## 6. Enable the workflow

Commit and push the `.github` directory:

```bash
git add .github
git commit -m "ci: add GitHub Actions deployment"
git push origin main
```

Open the repository's **Actions** tab and watch **Tifora CI/CD**. A push to
`main` automatically deploys; pull requests only run verification.

## 7. Verify production

After a green deployment, check:

```bash
curl -fsS https://appzeto.com/health
curl -fsS https://appzeto.com/ready
```

Also open `https://appzeto.com`, check `pm2 list`, and inspect failures with:

```bash
pm2 logs --lines 100
sudo tail -n 100 /var/log/nginx/error.log
```

## Rollback

GitHub redeploys exactly what is in a commit. To roll back, revert the bad
commit on `main` and push the revert:

```bash
git revert BAD_COMMIT_SHA
git push origin main
```
