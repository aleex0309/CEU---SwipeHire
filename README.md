# CEU SwipeHire - Monorepo

Single repository containing the full project:

- NLP backend (FastAPI + Sentence-BERT)
- Frontend app (Astro + React + swipe UX)
- Notebooks and datasets used during experimentation

---

## Repository Structure

```text
practica/
├── backend/                          # FastAPI API + SBERT matching engine
│   ├── app/
│   │   ├── engine.py                 # Matching + explainability logic
│   │   ├── main.py                   # API routes (/healthz, /api/match, /api/match-custom)
│   │   └── schemas.py                # Pydantic models
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── run.py
│   ├── README.md                     # Backend architecture and methodology
│   ├── talento_screening_poc.ipynb
│   └── talento_screening_poc_V2.ipynb
│
├── swipehire/                        # Frontend (Astro + React)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
│
├── docker-compose.yml                # Optional local composition
├── resume_data.csv                   # Main dataset
├── cleaned_resume_data.csv
├── enhanced_resume_matching_data.csv
└── main.ipynb
```

---

## What Runs Where

- **Backend** (`backend/`): computes candidate-job match using `all-MiniLM-L6-v2`.
- **Frontend** (`swipehire/`): lets users paste job + CVs, calls backend `/api/match-custom`, and shows explainable match results.

Default local ports:

- Backend API: `http://localhost:8000`
- Backend docs: `http://localhost:8000/api/docs`
- Frontend: `http://localhost:4321` (Astro dev default)

---

## Quick Start (Run Full Stack Locally)

### 1) Start backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -c "import nltk; nltk.download('stopwords')"
python run.py
```

Backend should be live at `http://localhost:8000/healthz`.

### 2) Start frontend (new terminal)

```bash
cd swipehire
npm install
npm run dev
```

Open the frontend URL printed by Astro (typically `http://localhost:4321`).

---

## Production Notes

- Frontend deployment (Vercel) needs `PUBLIC_API_URL` set to the backend URL.
- Backend can be deployed with Docker (`backend/Dockerfile`) or any Python host.
- CORS is currently open (`*`) in backend for development convenience.

---

## Main Endpoints

- `GET /healthz` - health check
- `POST /api/match` - rank against corpus CSV
- `POST /api/match-custom` - rank user-provided CV texts

See `backend/README.md` for architecture, formulas, explainability methodology, and detailed API examples.

---

## Git Workflow (Monorepo)

This repository is now configured as a **single root repo** (`practica/.git`).

- No nested sub-repositories.
- Commit from root:

```bash
cd practica
git status
git add .
git commit -m "your message"
git push
```
# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
