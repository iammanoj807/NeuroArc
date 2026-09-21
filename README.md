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

## 🛡️ Truthfulness guard — measured

The guard stops the model claiming skills the CV does not support. `eval/`
measures it two ways: against hand-written attack cases, and against what the
model actually does.

```bash
python eval/test_truthfulness_guard.py   # 36 labelled cases, no API calls
python eval/probe_real_model.py          # what the live model really emits
```

### What the model actually does

Given a job advert listing six skills the CV does not contain — Kubernetes,
Terraform, Kafka, Azure, Rust, Snowflake — across three runs the model marked
**all six `missing` with empty evidence** every time, and claimed only Python
and PostgreSQL, both with genuine quotes from the CV.

**6 claims made, 0 unsupported.** The model does not try to launder skills.

### What the hand-written attacks show

The 36 labelled cases in `eval/guard_cases.py` show the guard *can* be fooled:
evidence genuinely copied from the CV but describing a different skill passes,
because the check tests only that the words came from the CV. Claiming "Azure"
while quoting *"Owned production REST API services end to end"* scores 1.00 on
word overlap. On those cases the guard blocks 10 of 20.

### Why that hole is left open

A stricter rule — requiring the quoted evidence to also name the skill — closes
it completely, and was tried. It was reverted, because it dropped **real**
skills whenever the CV and the job advert used different words for the same
thing:

| CV says | Job asks | Strict rule |
|---|---|---|
| Postgres | PostgreSQL | dropped |
| Golang | Go | dropped |
| K8s | Kubernetes | dropped |

That is the common case, and the probe above shows the hole it closes is one
no model was exploiting. Trading a frequent real failure for a hypothetical one
made the product worse. Closing it properly needs an alias list
(k8s → kubernetes, postgres → postgresql), not a string rule.

### Honest limits

- **The attack cases were written by the repo author**, so they show what the
  guard does under attacks someone imagined, not under attacks that happen.
  The real-model probe exists because of that gap.
- **The evidence check decides 0 of the 36 cases** — every one is settled by
  whether the skill name appears in the CV at all. The test set does not
  exercise the code path it was written to test.
- **Three probe runs on one CV and one job advert.** Enough to show the model
  is not laundering here; not enough to prove it never would.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Made with ❤️ by Manoj Kumar Thapa
