---
title: NeuroArc
emoji: 🚀
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

<div align="center">
  <img src="frontend/public/favicon.svg" alt="Logo" width="80" />
  <h1>NeuroArc</h1>
  <h3>AI-Powered Job Application Assistant</h3>
  <p><strong>Search jobs → Match to your CV → Generate a tailored CV</strong></p>
</div>

---

## ✨ Overview

**NeuroArc** is an AI-powered job application assistant with LLM-based resume tailoring and intelligent job matching. It uses prompt engineering to generate ATS-optimized CVs and semantic scoring to rank job relevance beyond keyword matching.

## 🚀 Features

- **📄 CV Parsing** - Upload PDF/DOCX and automatically extract skills, experience, and contact info.
- **🔍 Smart Job Search** - Search real jobs from the Reed API (UK's largest job board), with job-type and date filters.
- **🎯 Match Scoring** - See an ATS match score, matching skills, missing skills, and recommended projects for any job.
- **✍️ AI-Tailored CV** - Generate a CV optimized for the job, following ATS standards.
- **📥 PDF Export** - Preview and download a professional PDF ready to submit.
- **🖥️ Clean, Responsive UI** - Professional interface that works on desktop and mobile, with automatic light/dark mode.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Framer Motion, Lucide icons |
| Backend | FastAPI, Python 3.11+ |
| AI | Groq API — `openai/gpt-oss-120b` (auto-fallback to `openai/gpt-oss-20b` and `qwen/qwen3.8-27b`) |
| CV Parsing | PyMuPDF, python-docx, Tesseract OCR |
| PDF Generation | ReportLab, react-pdf (preview) |
| Job Data | Reed UK API |

---

## 🛡️ Evidence guard

The scoring is not done by the model. The model reports each job requirement with a short
quote from the CV that it claims proves the match; deterministic code then checks that
quote and computes the score. An LLM asked "does this candidate fit?" will invent the
evidence, so nothing it claims is trusted without a check.

**How a requirement is scored** (`backend/services/ai_service.py`):

1. The model returns `{name, importance, status, evidence}` per requirement as structured
   JSON, where `evidence` must be an exact phrase from the CV (max 12 words).
2. `_has_evidence()` accepts the requirement only if the CV names the skill directly, or
   if at least 60% of the evidence words appear in the CV text.
3. Anything that fails is forced to `status: "missing"`, its evidence cleared, and the
   drop is logged.
4. Only what survives feeds the weighted score: skills 0.60, title 0.20, experience 0.12,
   education 0.08, with `must` requirements weighted 2x `nice`.

So the score follows evidence that is checked against the document, not the model's
opinion of the candidate.

### Known limitation

**The guard checks that the evidence came from the CV. It does not check that the evidence
is about the skill being claimed.** A genuine CV sentence can therefore support a skill the
CV never mentions:

> Claiming **Azure**, quoting *"Owned production REST API services end to end"*. Every word
> of that quote really is in the CV, so it passes the word-overlap check.

A stricter rule requiring the evidence to name the skill was built, measured and then
**reverted**: it dropped real skills whenever the CV and the job advert used different
words for the same thing (Postgres/PostgreSQL, Golang/Go, K8s/Kubernetes), which turned out
to be the common case. Trading a visible false negative for an invisible false positive was
the wrong trade for a tool whose output a human then sends to an employer.

Closing the hole properly needs a skill-alias list, not a string rule. That is the next
piece of work on this, and it is not done.

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iammanoj807/NeuroArc.git
   cd NeuroArc
   ```

2. **Configure API Keys**
   Copy `backend/.env.example` to `backend/.env` and fill in:
   - `GROQ_API_KEY` - get a free key at [console.groq.com/keys](https://console.groq.com/keys)
   - `REED_API_KEY` - get a key at [reed.co.uk/developers](https://www.reed.co.uk/developers)

3. **Start the application**
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

4. **Open in browser**
   - Frontend: http://localhost:5173
   - API Docs: http://localhost:8000/docs

---

## ☁️ Deploying to Hugging Face Spaces

The repo includes a `Dockerfile` that builds the frontend and serves it from the FastAPI backend on port `7860`.

Add these as **Secrets** in your Space settings (never commit them):

- `GROQ_API_KEY`
- `REED_API_KEY`

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Made with ❤️ by Manoj Kumar Thapa
