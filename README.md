<div align="center">
  <img src="frontend/public/favicon.svg" alt="Logo" width="100" />
  <h1>NeuroArc</h1>
  <h3>AI-Powered Job Application Assistant</h3>
  <p><strong>Search jobs → Match to your CV → Generate tailored CV</strong></p>
</div>

---

## ✨ Features

- **📄 CV Parsing** - Upload PDF/DOCX and automatically extract skills, experience, and contact info.
- **🔍 Smart Job Search** - Search real jobs from Reed API (UK's largest job board).
- **🎯 Match Scoring** - Jobs ranked by how well they match your CV skills.
- **✍️ AI-Tailored CV** - Generate CVs optimized on the basis of ATS standards.

- **📥 PDF Export** - Download professional documents ready to submit.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Three.js (React Three Fiber) |
| Backend | FastAPI, Python 3.11+ |
| AI | GPT-4o (GitHub Models) |
| CV Parsing | PyMuPDF, python-docx |
| PDF Generation | ReportLab |
| Job Data | Reed UK API |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+ 
- Node.js 18+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iammanoj807/cortexcv.git
   cd cortexcv
   ```

2. **Configure API Keys**
   You simply need to provide these API keys in `backend/.env`:
   - `GITHUB_TOKEN`
   - `REED_API_KEY`

3. **Start the application**
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

4. **Open in browser**
   - Frontend: http://localhost:5173
   - API Docs: http://localhost:8000/docs

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Made with ❤️ by Manoj Kumar Thapa
