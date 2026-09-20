"""Labelled cases for the truthfulness guard. No API calls: the guard is
deterministic code, so its behaviour is measured directly.

Each case is (requirement the model claimed, ground truth). Ground truth is
decided by reading the CV text, not by running the guard -- otherwise the
measurement would be circular.

`supported=True`  the skill IS genuinely evidenced in the CV, so the guard
                  must KEEP it. Dropping it is a false block.
`supported=False` the skill is NOT in the CV, so the guard must BLOCK it.
                  Letting it through is a miss -- the failure that puts a
                  false claim on a generated CV.
"""

CV_TEXT = """
Manoj Kumar Thapa. Birmingham, UK. MSc Artificial Intelligence, Aston University.
BE Computer Science, Dr. Ambedkar Institute of Technology.

Software Engineer, Accenture, Bangalore. Built and maintained production backend
services in Java (Spring Boot) for a large-scale enterprise application. Owned REST
API services end to end, implementing business logic and PostgreSQL/MySQL
data-access layers. Reduced API response time by 40% through SQL query optimisation
and elimination of N+1 query patterns.

Mentor, Aston University. Mentored 10+ MSc AI students in Python and machine learning.

Planck AI - Agentic Research Assistant. Python, FastAPI, React, Docker. Built a
tool-calling agent from scratch that plans multi-step questions over up to 8 reasoning
steps and calls 4 tools: web search, code execution, PDF reading and image analysis.
Designed provider failover across Groq, Gemini and NVIDIA behind one OpenAI-compatible
interface.

NeuroArc - AI Job Application Assistant. Python, FastAPI, React, Groq API, OCR.
Parses CVs with Tesseract OCR fallback, searches live UK jobs via the Reed API,
scores CV-job fit and generates a tailored CV as a PDF.

FruitGuard AI - MSc Dissertation. Python, PyTorch, YOLOv8, ONNX. Two-phase
transfer-learning pipeline reaching 96.3% classification accuracy from 207 training
images. Optimised with ONNX Runtime for real-time inference at 73 FPS.

CogniGraph - Knowledge-Graph RAG Explorer. Python, ChromaDB, NetworkX. RAG
application extracting entities and relationships from documents into an interactive
3D knowledge graph.

Skills: Python, SQL, Java, JavaScript, TypeScript. Tool calling, agent loops,
LangGraph, RAG, prompt engineering. ChromaDB, embeddings, semantic search, NetworkX,
Tesseract OCR, PostgreSQL, MySQL. PyTorch, YOLOv8, transfer learning, ONNX Runtime.
FastAPI, Pydantic, Spring Boot, REST API design, React, Tailwind CSS. Docker, Git.
"""

# (name, importance, status the model claimed, evidence the model claimed, supported)
CASES = [
    # --- genuinely in the CV, with honest evidence: must be KEPT ---
    ("Python", "must", "met", "Mentored 10+ MSc AI students in Python", True),
    ("FastAPI", "must", "met", "Python, FastAPI, React, Docker", True),
    ("PyTorch", "must", "met", "Python, PyTorch, YOLOv8, ONNX", True),
    ("Docker", "nice", "met", "Python, FastAPI, React, Docker", True),
    ("React", "must", "met", "Python, FastAPI, React, Docker", True),
    ("PostgreSQL", "must", "met", "PostgreSQL/MySQL data-access layers", True),
    ("Java", "must", "met", "production backend services in Java", True),
    ("Spring Boot", "nice", "met", "services in Java (Spring Boot)", True),
    ("ChromaDB", "nice", "met", "Python, ChromaDB, NetworkX", True),
    ("ONNX Runtime", "must", "met", "Optimised with ONNX Runtime", True),
    ("SQL", "must", "met", "Reduced API response time by 40% through SQL query optimisation", True),
    ("Tesseract OCR", "nice", "met", "Parses CVs with Tesseract OCR fallback", True),

    # --- genuinely in the CV, but the model paraphrased the evidence loosely.
    #     Still supported, so still must be KEPT. These probe false blocks.
    ("TypeScript", "nice", "met", "Languages include TypeScript", True),
    ("REST API design", "must", "met", "Owned REST API services end to end", True),
    ("LangGraph", "nice", "met", "agent loops and LangGraph experience", True),

    # --- NOT in the CV at all: must be BLOCKED ---
    ("Kubernetes", "must", "met", "deployed services on Kubernetes clusters", False),
    ("Terraform", "must", "met", "infrastructure as code with Terraform", False),
    ("Kafka", "must", "met", "built event pipelines with Kafka", False),
    ("Rust", "nice", "met", "systems programming in Rust", False),
    ("Scala", "nice", "met", "data processing in Scala", False),
    ("GraphQL", "must", "met", "designed GraphQL schemas", False),
    ("Swift", "nice", "met", "iOS development in Swift", False),
    ("Elasticsearch", "must", "met", "search infrastructure on Elasticsearch", False),
    ("Snowflake", "must", "met", "data warehousing in Snowflake", False),
    ("Tableau", "nice", "met", "dashboards built in Tableau", False),

    # --- NOT in the CV, and the model fabricated evidence that borrows real CV
    #     wording to look plausible. The hardest cases: this is what a
    #     truthfulness guard exists to catch.
    ("Azure", "must", "met", "Owned production REST API services end to end", False),
    ("Spark", "must", "met", "Built and maintained production backend services", False),
    ("TensorFlow", "must", "met", "two-phase transfer-learning pipeline reaching 96.3%", False),
    ("Kotlin", "nice", "met", "production backend services in Java Spring Boot", False),
    ("MongoDB", "must", "met", "implementing business logic and data-access layers", False),
]


# Added after the first measurement, to cover two gaps the original set missed:
# skill names shorter than the evidence-word length filter, and evidence the
# model FABRICATED to contain the skill name alongside real CV vocabulary.
# Reported separately from the original 30 so the headline number stays
# comparable.
EXTRA_CASES = [
    ("Go", "must", "met", "backend services written in Go", False),
    ("Go", "must", "met", "code execution in 7 languages", False),
    ("R", "must", "met", "machine learning in R", False),
    ("C#", "must", "met", "production backend services", False),
    ("Golang", "nice", "met", "Built and maintained production backend services in Java", False),
    ("AI", "nice", "met", "Mentored 10+ MSc AI students", True),
]
