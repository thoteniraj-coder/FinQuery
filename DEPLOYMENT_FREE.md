# Free Deployment Guide

This project is split into:

- `frontend/` - React and Vite
- `backend/` - Rails API
- MySQL via `DATABASE_URL`
- Ollama via `OLLAMA_BASE_URL`

Recommended free setup:

- Frontend: Vercel or Netlify
- Backend: Render web service using the backend Dockerfile
- Database: Aiven MySQL free tier
- Ollama: Oracle Cloud Always Free VM, or local laptop plus Cloudflare Tunnel for demos

## 1. Push Code To GitHub

Commit your project and push it to GitHub. Vercel, Render, and Aiven can connect to the GitHub repo.

Do not commit real `.env` files or `backend/config/master.key` to a public repo.

## 2. Create Free MySQL On Aiven

1. Create an Aiven account.
2. Create a MySQL service using the free tier.
3. Open the service connection details.
4. Copy the MySQL connection URI.

It should look similar to:

```text
mysql2://USER:PASSWORD@HOST:PORT/DATABASE
```

If Aiven gives a URL that starts with `mysql://`, change it to `mysql2://` for Rails.

Save this value for Render:

```env
DATABASE_URL=mysql2://USER:PASSWORD@HOST:PORT/DATABASE
```

## 3. Deploy Ollama On Oracle Cloud Always Free

Create an Oracle Cloud Always Free VM. Prefer Ampere A1 if available because it can provide more free RAM than most free hosts.

SSH into the VM:

```bash
ssh ubuntu@YOUR_ORACLE_VM_PUBLIC_IP
```

Install Ollama:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Pull a smaller model first:

```bash
ollama pull qwen2:7b
```

Start Ollama:

```bash
ollama serve
```

For deployment, keep Ollama running with systemd:

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

Test it on the VM:

```bash
curl http://localhost:11434/api/tags
```

Open Oracle firewall/security list for TCP port `11434` only if your backend must access it over the public internet.

For better security, restrict that port to Render outbound IPs if you have them. If not, use a strong firewall rule and avoid exposing Ollama wider than needed.

Your backend Ollama URL will be:

```env
OLLAMA_BASE_URL=http://YOUR_ORACLE_VM_PUBLIC_IP:11434
```

## 3A. Run Ollama From Your Laptop With Cloudflare Tunnel

This is the fastest demo setup. Your laptop must stay awake and online.

Start Ollama in one terminal:

```bash
ollama serve
```

Start the public tunnel in another terminal:

```bash
scripts/start-ollama-tunnel.sh
```

The script runs:

```bash
cloudflared tunnel --url http://localhost:11434 --http-host-header localhost:11434
```

Copy the generated `https://*.trycloudflare.com` URL into:

```env
OLLAMA_BASE_URL=https://YOUR_TUNNEL.trycloudflare.com
```

Use the same value in Render's backend environment variables.

Quick tunnel URLs change when `cloudflared` restarts.

## 4. Deploy Backend On Render

Create a new Render Web Service:

- Source: your GitHub repo
- Root directory: `backend`
- Environment: Docker
- Health check path: `/up`

Add these environment variables in Render:

```env
RAILS_ENV=production
RAILS_MASTER_KEY=PASTE_VALUE_FROM_backend/config/master.key
DATABASE_URL=mysql2://USER:PASSWORD@HOST:PORT/DATABASE
FRONTEND_ORIGINS=https://YOUR_FRONTEND_DOMAIN.vercel.app
FINQUERY_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://YOUR_ORACLE_VM_PUBLIC_IP:11434
OLLAMA_MODEL=qwen2:7b
RAILS_LOG_LEVEL=info
```

Deploy the service.

After deploy, open:

```text
https://YOUR_RENDER_BACKEND.onrender.com/up
```

You should see a healthy response.

Then test the API:

```text
https://YOUR_RENDER_BACKEND.onrender.com/api/health
```

## 5. Deploy Frontend On Vercel

Create a new Vercel project:

- Framework preset: Vite
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Add this Vercel environment variable:

```env
VITE_API_URL=https://YOUR_RENDER_BACKEND.onrender.com
```

Deploy the frontend.

After deployment, copy the Vercel URL and update the backend Render environment variable:

```env
FRONTEND_ORIGINS=https://YOUR_FRONTEND_DOMAIN.vercel.app
```

Redeploy the backend after changing `FRONTEND_ORIGINS`.

## 6. Verify End To End

Open the Vercel frontend and test:

1. Dashboard/API data loads.
2. SQL generation calls the backend.
3. Backend can reach Ollama.
4. Backend can read/write MySQL data.

Useful checks:

```bash
curl https://YOUR_RENDER_BACKEND.onrender.com/api/health
curl http://YOUR_ORACLE_VM_PUBLIC_IP:11434/api/tags
```

If the frontend shows CORS errors, update `FRONTEND_ORIGINS` in Render to exactly match your Vercel domain.

If AI requests fail, check Render logs for `OLLAMA_BASE_URL` errors and confirm Oracle firewall allows port `11434`.

## 7. Free Tier Limits To Expect

Render free services can sleep after inactivity, so the first request may be slow.

Ollama models need RAM. If `qwen2:7b` is too heavy, try a smaller model and update:

```env
OLLAMA_MODEL=MODEL_NAME
```

Then pull the same model on the Oracle VM:

```bash
ollama pull MODEL_NAME
```
