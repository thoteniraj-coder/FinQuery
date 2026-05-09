# Ollama Setup for FinQuery AI

This file is a step-by-step reference for installing Ollama, checking whether it is running, installing a model, and using it for FinQuery AI SQL query generation.

## 1. Check If Ollama Is Installed

Run:

```bash
command -v ollama
```

If installed, you should see a path like:

```text
/usr/local/bin/ollama
```

Then check the version:

```bash
ollama --version
```

If Ollama is installed but not running, the version command may show:

```text
Warning: could not connect to a running Ollama instance
Warning: client version is ...
```

That means the CLI exists, but the Ollama server is not started yet.

## 2. Install Ollama If Missing

Download from:

```text
https://ollama.com
```

For Linux or macOS terminal install:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

On macOS, you can also install and open the Ollama desktop app.

## 3. Start Ollama

Run:

```bash
ollama serve
```

Ollama listens locally at:

```text
http://localhost:11434
```

Keep this terminal open while using FinQuery AI.

## 4. Check Available Models

In a new terminal:

```bash
ollama list
```

On this machine, the installed model is:

```text
qwen2:7b
```

FinQuery AI is configured to use `qwen2:7b` by default.

## 5. Pull a SQL-Friendly Model

The current default works, but for SQL generation you can also install CodeLlama:

```bash
ollama pull codellama
```

Other common options:

```bash
ollama pull llama3
ollama pull mistral
```

Notes:

- `codellama` is usually better for code and SQL.
- `llama3` is a good general model.
- `mistral` is a lightweight option.
- Local models are private and free to run, but slower than cloud APIs.

## 6. Configure Backend Environment

Open:

```text
backend/.env
```

Use:

```env
FINQUERY_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:7b
```

If you install CodeLlama, change:

```env
OLLAMA_MODEL=codellama
```

The example file is:

```text
backend/.env.example
```

## 7. Start FinQuery Backend

In a new terminal:

```bash
cd backend
bundle install
bin/rails db:migrate db:seed
bin/rails server -p 3000
```

Backend URL:

```text
http://localhost:3000
```

## 8. Start FinQuery Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## 9. Test Ollama Directly

Run:

```bash
curl -s http://localhost:11434/api/tags
```

You should see installed models in JSON.

Test generation:

```bash
curl -s http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "qwen2:7b",
    "prompt": "Return only SQL: show all vendors",
    "stream": false
  }'
```

## 10. Test FinQuery AI SQL Generation

Make sure all three are running:

1. Ollama: `ollama serve`
2. Rails backend: `bin/rails server -p 3000`
3. Vite frontend: `npm run dev`

Then run:

```bash
curl -s -X POST http://localhost:3000/api/generate-sql \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Show outstanding bills with vendor name and due date"}'
```

Expected response should include:

```json
{
  "model": "ollama/qwen2:7b"
}
```

For full query execution:

```bash
curl -s -X POST http://localhost:3000/api/query \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Show outstanding bills with vendor name and due date"}'
```

Expected response includes generated SQL and a `result` object.

## 11. Troubleshooting

### Ollama is installed but not running

Error:

```text
Ollama is installed but not running.
```

Fix:

```bash
ollama serve
```

### Model not found

Error may mention that the model does not exist.

Fix:

```bash
ollama pull qwen2:7b
```

or:

```bash
ollama pull codellama
```

Then update `backend/.env`:

```env
OLLAMA_MODEL=codellama
```

### Backend cannot call Ollama

Check the API:

```bash
curl -s http://localhost:11434/api/tags
```

If this fails, Ollama is not running or the port is blocked.

### SQL generated but query fails

FinQuery validates that only read-only `SELECT` and `WITH` queries can run. If a model returns explanation text or unsafe SQL, the backend rejects it.

Try a clearer prompt, for example:

```text
Show outstanding bills with vendor name, bill number, due date, and total amount.
```

## 12. Recommended Git Check Before Push

Run:

```bash
cd backend
bin/rails test
```

Run:

```bash
cd frontend
npm run lint
npm run build
```

Then review:

```bash
git status
git diff --stat
```
