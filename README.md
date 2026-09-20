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

The guard stops the model claiming skills your CV does not support. It is
deterministic code, so `eval/` measures it directly against labelled cases
rather than by generating CVs and counting what came out — no API calls, runs in
seconds, and it yields a **false-negative count**, which is the number that
matters: a miss puts a false claim on a CV a human then sends to an employer.

```bash
python eval/test_truthfulness_guard.py
```

### Results

| | Before | After |
|---|---|---|
| Unsupported claims blocked | 10/15 (66.7%) | **20/20 (100%)** |
| Genuine skills kept | 15/15 | **16/16** |
| False claims that survived | 5 | **0** |

### Two laundering routes, found and closed

`_has_evidence` checked that the quoted evidence came from the CV, but never
that it was **about the claimed skill**. Any genuine CV sentence therefore
laundered any skill:

> Claiming **Azure**, quoting *"Owned production REST API services end to end"* —
> scored 1.00 on word overlap, because every word of it really is in the CV.

Requiring a contiguous CV span *alone* is worse (15/20): the laundering evidence
is copied verbatim, so contiguity passes it. Both bars together hold — the
evidence must be copied from the CV **and** name the skill it proves.

A second route: the skill-token filter inherited a `len > 2` rule from the
evidence-word filter, which made `Go`, `R` and `C#` impossible to evidence. A CV
saying "Golang" could never support a "Go" requirement.

### Honest limits

- **36 hand-built cases**, 20 written to be adversarial. 100% means no failures
  on these cases, not a perfect guard. Two routes were found; a third may exist.
- The case set lives in `eval/guard_cases.py`. Add to it rather than trusting the
  headline number.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Made with ❤️ by Manoj Kumar Thapa
