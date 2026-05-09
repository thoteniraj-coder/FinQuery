# FinQuery AI

FinQuery AI is a Rails API plus React/Vite frontend for procurement finance workflows. It supports vendor management, PO/GRN/Bill creation, document review, SQL querying, and AI-assisted SQL generation.

The app now uses Ollama by default for AI query generation, so prompts run locally without cloud API usage.

## Project Structure

- `backend/` - Ruby on Rails API, database schema, seed data, AI SQL generation, guarded SQL execution, vendor/user/document APIs.
- `frontend/` - React/Vite app with dashboard, finance views, admin settings, document creation, AI prompt mode, SQL mode, charts, and result tables.
- `Reasearch/` - Original project guide, SQL schema, ERD, and prompt reference.
- `OLLAMA_SETUP.md` - Step-by-step Ollama install, model, and app setup reference.

## Requirements

- Ruby matching `backend/.ruby-version`
- Bundler
- Node.js and npm
- SQLite for local fallback, or MySQL if using `DATABASE_URL`
- Ollama for local AI SQL generation

## Ollama Setup

Check whether Ollama is installed:

```bash
command -v ollama
ollama --version
```

Start the local Ollama server:

```bash
ollama serve
```

In another terminal, check installed models:

```bash
ollama list
```

This machine currently has `qwen2:7b`, and the backend defaults to it:

```env
FINQUERY_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:7b
```

For a SQL-focused model, you can install CodeLlama and then update `OLLAMA_MODEL`:

```bash
ollama pull codellama
```

```env
OLLAMA_MODEL=codellama
```

See [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) for the full reference steps.

## Backend Setup

```bash
cd backend
cp .env.example .env
bundle install
bin/rails db:migrate db:seed
bin/rails server -p 3000
```

Default backend URL:

```text
http://localhost:3000
```

Important backend environment values:

```env
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FINQUERY_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:7b
DATABASE_URL=mysql2://root:password@127.0.0.1/finquery_development
```

If you do not want MySQL locally, remove or comment out `DATABASE_URL` and Rails will use the local SQLite setup.

## Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Local Development Flow

Run these in separate terminals:

```bash
ollama serve
```

```bash
cd backend
bin/rails server -p 3000
```

```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` and use the FinQuery AI page.

## API Endpoints

- `GET /api/health`
- `GET /api/schema`
- `POST /api/generate-sql` with `{ "prompt": "..." }`
- `POST /api/run-sql` with `{ "sql": "SELECT ..." }`
- `POST /api/query` with `{ "prompt": "..." }`
- `POST /api/financial_documents`
- `GET /api/v1/vendors`
- `GET /api/v1/users`
- `GET /api/v1/document_serial_settings`
- `PUT /api/v1/document_serial_settings/:doc_type`

Only read-only `SELECT` and `WITH` SQL queries are executed by the SQL runner.

## Verification

Backend:

```bash
cd backend
bin/rails test
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Ollama API smoke test:

```bash
curl -s -X POST http://localhost:3000/api/generate-sql \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Show outstanding bills with vendor name and due date"}'
```

Expected response includes:

```json
{
  "model": "ollama/qwen2:7b"
}
```
