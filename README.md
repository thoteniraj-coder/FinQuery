# FinQuery AI

Rails API plus React frontend for querying procurement finance data from the research guide.

## Apps

- `backend/` - Ruby on Rails API, SQLite schema, seed data, AI SQL generation, guarded SQL execution.
- `frontend/` - React/Vite workspace with AI prompt mode, SQL mode, chart preview, table output, and CSV export.
- `Reasearch/` - Original project guide, SQL schema, ERD, and AI prompt reference.

## Run Locally

Backend:

```bash
cd backend
cp .env.example .env
bin/rails db:migrate db:seed
bin/rails server -p 3000
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## API

- `GET /api/health`
- `GET /api/schema`
- `POST /api/generate-sql` with `{ "prompt": "..." }`
- `POST /api/run-sql` with `{ "sql": "SELECT ..." }`
- `POST /api/query` with `{ "prompt": "..." }`

Only read-only `SELECT` and `WITH` queries are executed.
