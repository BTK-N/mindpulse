# MindPulse — Project Requirements

Mental-health & digital screen-time assessment platform pairing a FastAPI + scikit-learn + Google Gemini backend, a React 19 + TypeScript + GSAP editorial frontend, and a Manifest V3 browser extension companion.

---

## 1. System Prerequisites

| Tool | Tested Version | Notes |
| :--- | :--- | :--- |
| **Python** | `3.12.9` | `3.10+` required for backend API (`api.py`) |
| **Node.js** | `v26.13.0` | `20+` recommended for Vite frontend |
| **pnpm** | `12.18.0` | Package manager used in `frontend/` |
| **Chromium Browser** | Chrome / Edge / Brave / Opera | Required for Manifest V3 `browser-extension/` |

---

## 2. Backend Python Dependencies (`api.py`)

Verified imports used by `api.py`:

- `fastapi` (`0.162.2`)
- `uvicorn` (`0.54.0`)
- `pydantic` (`2.14.3`)
- `joblib` (`1.6.0`)
- `numpy` (`2.5.4`)
- `pandas` (`3.1.1`)
- `scikit-learn` (`1.9.1`)
- `python-dotenv` (`1.2.4`)
- `requests` (`2.34.2`)
- `google-genai` (`3.0.0`)
- `reportlab` *(optional — required only for PDF report export at `/api/export_pdf`)*

Install backend packages:

```bash
pip install fastapi uvicorn pydantic joblib numpy pandas scikit-learn python-dotenv requests google-genai reportlab
```

---

## 3. Frontend Dependencies (`frontend/package.json`)

### Runtime Dependencies
- `react` (`^19.3.1`), `react-dom` (`^19.3.1`)
- `gsap` (`^3.15.1`), `@gsap/react` (`^2.1.2`)
- `lenis` (`^1.3.27`)
- `lucide-react` (`^1.70.0`)
- `recharts` (`^3.10.1`)
- `clsx` (`^2.1.1`), `tailwind-merge` (`^3.7.0`)
- `canvas-confetti` (`^1.9.4`)

### Dev & Build Dependencies
- `vite` (`^8.3.6`), `@vitejs/plugin-react` (`^6.1.2`)
- `typescript` (`~7.0.2`)
- `tailwindcss` (`^4.3.5`), `@tailwindcss/vite` (`^4.3.5`), `autoprefixer` (`^10.6.2`), `postcss` (`^8.5.32`)
- `oxlint` (`^1.90.0`)

Install frontend packages:

```bash
cd frontend
pnpm install
```

---

## 4. Environment Configuration

`api.py` reads environment variables from `.env` (or `k.env`), both excluded from Git via `.gitignore`. Create a `.env` file in the repository root with your API key(s):

```env
GEMINI_API_KEY=your_gemini_api_key_here
# Optional OpenRouter fallback:
# OPENROUTER_API_KEY=your_openrouter_api_key_here
# OPENROUTER_MODEL=liquid/lfm-3-1.7b:free
```

SQLite data (`users.db`) is auto-initialized on backend startup by `init_db()` in `api.py`.

---

## 5. Browser Extension (`browser-extension/`)

- **Manifest Version**: 3 (`MindPulse Screen Time Companion`, `v0.1.0`)
- **Permissions**: `tabs`, `idle`, `alarms`, `storage`, `notifications`
- **Host Permissions**: `http://127.0.0.1:8000/*`, `http://localhost:8000/*`
- See `instructions.txt` (or `browser-extension/README.md`) for unpacked installation and pairing steps.

---

## 6. Running Locally

```bash
# Terminal 1 — Backend (http://127.0.0.1:8000)
python -m uvicorn api:app --host 127.0.0.1 --port 8000

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
pnpm run dev --host 0.0.0.0 --port 5173
```

On Windows, you can also run `run_fullstack.bat` from the repository root.

Production frontend build:

```bash
cd frontend
pnpm run build
```
