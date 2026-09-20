"""
AI Service - LLM Integration for CV Tailoring
Uses the Groq API (OpenAI-compatible chat completions)
"""
import os
import re
import json
from typing import Dict, Any, Optional, List
import httpx
import logging

logger = logging.getLogger(__name__)

# How much of each input the model sees (full Reed descriptions are ~4-7k characters)
MAX_CV_CHARS = 8000
MAX_JD_CHARS = 6000

# The overall match score is computed here from the model's findings, not by the model
SCORE_WEIGHTS = {"skills": 0.60, "title": 0.20, "experience": 0.12, "education": 0.08}
IMPORTANCE_WEIGHT = {"must": 2.0, "nice": 1.0}
STATUS_CREDIT = {"met": 1.0, "partial": 0.5, "missing": 0.0}
EDUCATION_SCORE = {"met": 100, "related": 70, "missing": 30, "not_required": 100}
# Ceilings, not fixed ranges: the score follows the evidence, and a wrong-field
# CV still can't score well. Fixed floors made the score jump when the model's
# domain judgement flipped between runs.
DOMAIN_CAPS = {"complete_mismatch": 30, "weak_match": 65, "good_match": 100}


def _normalize(text: str) -> str:
    """Lowercase and collapse punctuation, keeping characters used in skill names (C++, C#, Node.js)"""
    return re.sub(r"[^a-z0-9+#.]+", " ", (text or "").lower()).strip()


def _words(text_norm: str) -> set:
    return {w.strip(".") for w in text_norm.split()}


def _mentions(text_norm: str, phrase: str) -> bool:
    """True if the phrase appears in already-normalized text as whole words"""
    p = _normalize(phrase).strip(".")
    return bool(p) and re.search(rf"(?<![a-z0-9]){re.escape(p)}(?![a-z0-9])", text_norm) is not None


def _has_evidence(req: Dict[str, Any], cv_norm: str, cv_words: set) -> bool:
    """Check the model's claimed evidence is really in the CV AND is about the
    claimed skill.

    The skill named anywhere in the CV settles it. Otherwise the quoted evidence
    must clear two bars, because either one alone is exploitable:

    1. It must appear in the CV as a contiguous phrase. The prompt asks the model
       to copy an exact phrase, so anything looser lets it assemble a sentence
       out of real CV vocabulary -- "backend services written in Go" scores 0.67
       on word overlap against a CV that only ever says Java.
    2. It must share a word with the skill it claims to prove. Without this, any
       genuine CV sentence launders any skill: claiming Azure while quoting
       "Owned production REST API services end to end" is a perfect copy of the
       CV and proves nothing about Azure.

    No length filter on the skill tokens, unlike the evidence words elsewhere:
    a skill name is meaningful at any length, and filtering short tokens would
    make "Go", "R" and "C#" impossible to evidence.

    Measured in eval/: recall 66.7% with neither bar, 100% with both, and no
    genuinely evidenced skill dropped in either case.
    """
    if _mentions(cv_norm, req["name"]):
        return True

    ev_norm = _normalize(req.get("evidence", ""))
    if not ev_norm or ev_norm not in cv_norm:
        return False

    skill_words = {w.strip(".") for w in _normalize(req["name"]).split() if w.strip(".")}
    ev_words = {w.strip(".") for w in ev_norm.split() if w.strip(".")}
    return bool(skill_words & ev_words)


def _clean_requirements(raw: Any) -> List[Dict[str, Any]]:
    """Validate the model's requirement list and drop duplicates"""
    reqs, seen = [], set()
    for r in raw if isinstance(raw, list) else []:
        if not isinstance(r, dict) or not str(r.get("name", "")).strip():
            continue
        name = str(r["name"]).strip()
        key = _normalize(name)
        if key in seen:
            continue
        seen.add(key)
        reqs.append({
            "name": name,
            "importance": r.get("importance") if r.get("importance") in IMPORTANCE_WEIGHT else "nice",
            "status": r.get("status") if r.get("status") in STATUS_CREDIT else "missing",
            "evidence": str(r.get("evidence") or "").strip()
        })
    # Must-haves first so they lead the missing-skills list
    return sorted(reqs, key=lambda r: r["importance"] != "must")[:30]


def _skills_score(reqs: List[Dict[str, Any]]) -> float:
    total = sum(IMPORTANCE_WEIGHT[r["importance"]] for r in reqs)
    if not total:
        return 50.0
    return 100 * sum(IMPORTANCE_WEIGHT[r["importance"]] * STATUS_CREDIT[r["status"]] for r in reqs) / total


def _to_number(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _overall_score(skills: float, title: float, experience: float, education: float, domain_match: str) -> int:
    raw = (SCORE_WEIGHTS["skills"] * skills + SCORE_WEIGHTS["title"] * title
           + SCORE_WEIGHTS["experience"] * experience + SCORE_WEIGHTS["education"] * education)
    return int(round(min(raw, DOMAIN_CAPS.get(domain_match, 100))))

class AIService:
    """Service for AI-powered CV tailoring"""
    
    def __init__(self):
        # Secrets pasted into hosting dashboards often carry a trailing newline or
        # space, which makes every request fail before it is sent
        self.api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"\'')
        self.last_error = None  # Surfaced by /health for debugging deployments
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"
        # Priority list: Try best model first, then fallback
        # (each model has its own rate limit, so falling back also spreads load)
        self.models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
        
        if not self.api_key:
            logger.warning("⚠️ GROQ_API_KEY not found. AI features will be unavailable.")
            self.client = None
        else:
            if not self.api_key.startswith("gsk_"):
                logger.warning("⚠️ GROQ_API_KEY does not look like a Groq key (should start with 'gsk_').")
            self.client = httpx.Client(
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=60.0
            )
    
    def _call_llm(self, system_prompt: str, user_prompt: str, json_mode: bool = False, temperature: float = 0.7) -> Dict[str, Any]:
        """
        Make a call to the LLM with automatic fallback support
        """
        if not self.client:
            return {
                "success": False,
                "error": "AI service not configured. Set GROQ_API_KEY environment variable."
            }
        
        # Prepare the prompt once
        full_user_prompt = user_prompt
        if json_mode:
            full_user_prompt += "\n\nIMPORTANT: Output ONLY valid JSON."
            
        last_error = None
        failures = set()

        # Try models in order
        for model in self.models:
            logger.info(f"🤖 Attempting AI call with model: {model}...")
            try:
                response = self.client.post(self.endpoint, json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": full_user_prompt}
                    ],
                    "temperature": temperature,
                    # Reasoning tokens count toward this budget on gpt-oss models
                    "max_tokens": 8000,
                    "reasoning_effort": "low"
                })
                
                # Auth error - no point trying the other models
                if response.status_code in (401, 403):
                    self.last_error = f"{model}: HTTP {response.status_code} - key rejected"
                    logger.error(f"❌ Groq rejected the API key (HTTP {response.status_code})")
                    return {
                        "success": False,
                        "error": "The AI service rejected the API key. Please check GROQ_API_KEY."
                    }

                if response.status_code == 429:
                    failures.add("rate_limit")
                    last_error = f"{model}: rate limited (429)"
                    logger.warning(f"⚠️ Rate limited on {model}, trying the next model")
                    continue

                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"] or ""
                usage = data.get("usage", {})
                logger.info(f"✅ Success with {model} (tokens: {usage.get('prompt_tokens')} in, {usage.get('completion_tokens')} out)")

                # Parse JSON if requested
                if json_mode:
                    try:
                        # Robust JSON extraction
                        clean_content = content.strip()
                        
                        # specific fix for markdown code blocks
                        if "```json" in clean_content:
                            clean_content = clean_content.split("```json")[1].split("```")[0].strip()
                        elif "```" in clean_content:
                            clean_content = clean_content.split("```")[1].split("```")[0].strip()
                        
                        # If deeper cleanup is needed (finding first { and last })
                        start_idx = clean_content.find('{')
                        end_idx = clean_content.rfind('}')
                        
                        if start_idx != -1 and end_idx != -1:
                            clean_content = clean_content[start_idx:end_idx+1]
                            
                        parsed_content = json.loads(clean_content)
                        return {
                            "success": True,
                            "data": parsed_content,
                            "usage": usage
                        }
                    except json.JSONDecodeError:
                        logger.error(f"❌ JSON Parse Error with {model}")
                        return {
                            "success": False,
                            "error": "Failed to parse AI response as JSON",
                            "raw_content": content
                        }
                
                # Success (Text mode)
                return {
                    "success": True,
                    "content": content,
                    "usage": usage
                }

            except httpx.LocalProtocolError as e:
                # Usually a malformed key value (stray newline, space or quote)
                failures.add("config")
                last_error = f"{model}: {e}"
                logger.error(f"❌ Could not send request for {model}: {e}")
                continue
            except (httpx.TimeoutException, httpx.NetworkError, httpx.ProxyError) as e:
                failures.add("connection")
                last_error = f"{model}: {type(e).__name__} - {e}"
                logger.warning(f"⚠️ Could not reach Groq for {model}: {e}")
                continue
            except Exception as e:
                failures.add("other")
                last_error = f"{model}: {e}"
                logger.warning(f"⚠️ AI Error with {model}: {e}")
                continue

        # Every model failed - report why, so the cause is visible in production
        self.last_error = last_error
        logger.error(f"❌ All models failed. Last error: {last_error}")

        if "config" in failures:
            error = "The AI request could not be sent. Check the GROQ_API_KEY value for stray spaces or line breaks."
        elif "connection" in failures and "rate_limit" not in failures:
            error = "Could not reach the AI service. Please try again shortly."
        elif "rate_limit" in failures:
            error = "Server is busy due to high demand. Please try again in a minute: https://buymeacoffee.com/manojthapa"
        else:
            error = "The AI service failed to respond. Please try again shortly."

        return {
            "success": False,
            "error": error,
            "details": last_error
        }
    
    ANALYZE_SYSTEM_PROMPT = """You are a senior recruiter and ATS (Applicant Tracking System) analyst. You compare a candidate's CV against one job description and report checkable facts. You do NOT calculate the overall score - it is computed from your findings.

Work through these steps:

1. VALIDATE
If the CV text is not a CV/resume (an article, recipe, source code, lyrics, random text), return {"is_valid_cv": false, "rejection_reason": "<one polite sentence>"} and nothing else.

2. EXTRACT REQUIREMENTS
From the job description, list 10-25 concrete requirements a recruiter or ATS would screen for: hard skills, tools, technologies, certifications/licences, qualifications, domain knowledge, and at most 3 key soft skills. Use the job's own wording, kept short ("PostgreSQL", "Stakeholder management", "CSCS card"). Ignore benefits and company boilerplate.
- importance "must": stated as required/essential, in the job title, repeated, or central to the main duties
- importance "nice": preferred, desirable, bonus, or minor

3. CHECK EACH REQUIREMENT AGAINST THE CV
- "met": the CV clearly shows it, either the same thing or a clear equivalent ("Postgres" for "PostgreSQL", "RGN" for "Registered Nurse")
- "partial": weaker or related evidence (a similar tool, used in a personal project rather than at work, fewer years than asked)
- "missing": no evidence anywhere in the CV
- "evidence": for met/partial, copy a short EXACT phrase from the CV (max 12 words) that proves it. For missing, use "". Never write evidence that is not in the CV text - unsupported claims are discarded.

4. DOMAIN MATCH
- "good_match": the candidate's background fits this kind of role
- "weak_match": a related field but missing key experience, or clearly too junior for the level asked
- "complete_mismatch": a fundamentally different field (e.g. a software developer applying for a nursing role)

5. OTHER FACTS
- title_alignment (0-100): how closely the candidate's recent job titles match the target role (same title 100, similar 80, related field 50, unrelated 20)
- experience.required_years: minimum years of experience the job asks for, null if not stated
- experience.candidate_years: the candidate's total relevant years based on CV dates, null if unclear
- education: "met" (required degree/qualification held), "related", "missing", or "not_required"

6. GUIDANCE
- project_recommendations: 2-4 specific, buildable projects or experiences that would prove the most important MISSING requirements. Empty list for complete_mismatch.
- advice: 2-4 concrete tips for this CV and this job, based on the candidate's real experience (which existing work to lead with, which of the job's terms to mirror, what to quantify).
- summary: 1-2 sentences on the overall fit. For complete_mismatch, say the background is in a different field and name the kind of role that would fit instead.

Respond with a single JSON object and nothing else."""

    def analyze_fit(
        self,
        cv_text: str,
        cv_skills: list,
        job_title: str,
        job_description: str
    ) -> Dict[str, Any]:
        """
        Compare a CV against a job description.

        The model reports each requirement with evidence from the CV; the score
        is then computed here so it is consistent and explainable.
        """
        user_prompt = f"""TARGET ROLE: {job_title}

JOB DESCRIPTION:
{job_description[:MAX_JD_CHARS]}

CANDIDATE CV:
{cv_text[:MAX_CV_CHARS]}

SKILLS DETECTED BY THE PARSER (hints only, may be incomplete): {', '.join(cv_skills[:40])}

Return JSON in exactly this shape:
{{
  "is_valid_cv": true,
  "rejection_reason": null,
  "domain_match": "good_match | weak_match | complete_mismatch",
  "requirements": [
    {{"name": "PostgreSQL", "importance": "must", "status": "partial", "evidence": "optimised MySQL queries"}}
  ],
  "title_alignment": 80,
  "experience": {{"required_years": 5, "candidate_years": 4}},
  "education": "met | related | missing | not_required",
  "project_recommendations": ["..."],
  "advice": ["..."],
  "summary": "..."
}}"""

        result = self._call_llm(self.ANALYZE_SYSTEM_PROMPT, user_prompt, json_mode=True, temperature=0.2)

        if not result.get("success") or not result.get("data"):
            return result

        data = result["data"]

        if data.get("is_valid_cv") is False:
            return {
                "success": False,
                "error": "The provided document does not appear to be a CV or Resume. Please upload a valid CV or Resume."
            }

        # Discard claimed matches that aren't backed by the CV text
        cv_norm = _normalize(cv_text)
        cv_words = _words(cv_norm)
        requirements = _clean_requirements(data.get("requirements"))
        unsupported = 0
        for req in requirements:
            if req["status"] != "missing" and not _has_evidence(req, cv_norm, cv_words):
                req["status"] = "missing"
                req["evidence"] = ""
                unsupported += 1
        if unsupported:
            logger.info(f"🔍 Dropped {unsupported} unsupported skill match(es) during analysis")

        domain_match = data.get("domain_match")
        if domain_match not in DOMAIN_CAPS:
            domain_match = "weak_match"

        # Component scores
        skills_score = _skills_score(requirements)
        title_score = min(max(_to_number(data.get("title_alignment")) or 50.0, 0), 100)
        required_years = _to_number((data.get("experience") or {}).get("required_years"))
        candidate_years = _to_number((data.get("experience") or {}).get("candidate_years"))
        if not required_years:
            experience_score = 100.0
        elif candidate_years is None:
            experience_score = 50.0
        else:
            experience_score = min(100.0, 100 * candidate_years / required_years)
        education_score = float(EDUCATION_SCORE.get(data.get("education"), 70))

        score = _overall_score(skills_score, title_score, experience_score, education_score, domain_match)

        met = [r["name"] for r in requirements if r["status"] == "met"]
        unmet = [r["name"] for r in requirements if r["status"] != "met"]

        result["data"] = {
            "is_valid_cv": True,
            "domain_match": domain_match,
            "score": score,
            "overall_ats_score": score,
            "requirements": requirements,
            "matching_skills": met,
            "missing_skills": unmet,
            "project_recommendations": data.get("project_recommendations") or [],
            "advice": data.get("advice") or [],
            "summary": data.get("summary") or "",
            "breakdown": {
                "skills_coverage": round(skills_score),
                "title_alignment": round(title_score),
                "experience": round(experience_score),
                "education": round(education_score),
                "keyword_match": {
                    "missing_critical_keywords": [r["name"] for r in requirements
                                                  if r["status"] == "missing" and r["importance"] == "must"]
                }
            }
        }
        logger.info(f"📊 Match score {score}% ({domain_match}); {len(met)}/{len(requirements)} requirements met")
        return result

    GENERATE_SYSTEM_PROMPT = """You are an expert CV writer who tailors a candidate's real CV to one job, for both ATS software and human recruiters.

TRUTHFULNESS - this matters more than the score:
- Keep every role, employer, job title, date, education entry, project and certification from the original CV. Never add, remove or rename one.
- Never invent numbers, percentages, team sizes, budgets or results. Keep the numbers already in the CV exactly as written. Where a bullet has no number, describe the impact in words instead.
- Only use a term from the job description if the original CV supports it: the same thing, a clear equivalent, or work that obviously involved it (CV says "Postgres" -> you may write "PostgreSQL"). If the CV shows no evidence of a requirement, leave it out completely and list it in remaining_gaps.
- Never imply years of experience, seniority, or industry exposure the CV does not show.

TAILORING - rewrite, never copy:
- Rewrite every bullet in your own words: lead with a strong action verb, and use the job description's terminology wherever it describes the same real work. Do not reproduce the original sentences unchanged.
- summary: 2-3 sentences saying who the candidate is and their strongest relevant evidence for this job, in the job's own terminology where it is true. Never use "seeking", "looking for", "aspiring", and never name the company or role.
- skills: keep the candidate's real skills, listing the ones this job asks for first. Group them into 3-5 categories that suit the industry (tech: languages, frameworks, tools, databases, cloud; healthcare: clinical_skills, certifications, systems; finance: analytical, software, certifications).
- experience: 3-6 bullets per role, most job-relevant first. Each starts with a strong action verb and says what was done, how (tools/methods), and the outcome. 70-180 characters.
- projects: most relevant first, naming the technologies used and the outcome.
- Plain text only: no markdown, no emojis, no special symbols.
- Omit any section key entirely when the original CV has no data for it. Never output empty arrays, nulls or "N/A".

Respond with a single JSON object and nothing else."""

    def generate_tailored_cv_json(
        self,
        cv_text: str,
        cv_skills: list,
        job_title: str,
        job_description: str,
        company_name: str,
        ats_analysis_json: Dict[str, Any] = None,
        contact_info: Dict[str, Any] = None,
        candidate_name: str = None
    ) -> Dict[str, Any]:
        """
        Rewrite the CV for one job as structured JSON for PDF generation.
        The resulting score is recomputed here from the generated content.
        """
        analysis = ats_analysis_json or {}
        requirements = _clean_requirements(analysis.get("requirements"))

        # Tell the writer what the CV proves, and what it must not claim
        if requirements:
            def _listing(status):
                items = [r for r in requirements if r["status"] == status]
                return "; ".join(f"{r['name']}" + (f" (CV: \"{r['evidence']}\")" if r["evidence"] else "")
                                 for r in items) or "none"
            analysis_section = f"""ANALYSIS OF THIS CV AGAINST THIS JOB:
- Domain match: {analysis.get('domain_match', 'unknown')}
- Proven by the CV (use this wording where it fits): {_listing('met')}
- Partly shown (strengthen only what is true): {_listing('partial')}
- No evidence in the CV - do NOT claim these, list them in remaining_gaps: {', '.join(r['name'] for r in requirements if r['status'] == 'missing') or 'none'}"""
        else:
            analysis_section = f"""ANALYSIS OF THIS CV AGAINST THIS JOB:
- Skills the CV shows: {', '.join(analysis.get('matching_skills', [])) or 'unknown'}
- Required but not evidenced (do NOT claim these): {', '.join(analysis.get('missing_skills', [])) or 'unknown'}"""

        # Explicit contact details, so the model never invents placeholders
        contact_section = ""
        if contact_info or candidate_name:
            lines = []
            if candidate_name:
                lines.append(f"- Name: {candidate_name}")
            for field in ("email", "phone", "linkedin"):
                if (contact_info or {}).get(field):
                    lines.append(f"- {field.capitalize()}: {contact_info[field]}")
            if lines:
                contact_section = ("\n\nCONTACT DETAILS (use exactly, never a placeholder):\n" + "\n".join(lines))

        user_prompt = f"""TARGET JOB: {job_title} at {company_name}

JOB DESCRIPTION:
{job_description[:MAX_JD_CHARS]}

ORIGINAL CV:
{cv_text[:MAX_CV_CHARS]}
{contact_section}

{analysis_section}

Return JSON in exactly this shape (omit any key with no real data):
{{
  "header": {{"name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": ""}},
  "summary": "",
  "education": [{{"degree": "", "institution": "", "location": "", "dates": ""}}],
  "skills": {{"category_name": ["Skill1", "Skill2"]}},
  "experience": [{{"title": "", "company": "", "location": "", "dates": "", "bullets": ["", ""]}}],
  "projects": [{{"name": "", "technologies": "", "dates": "", "description": ""}}],
  "certifications": [{{"name": "", "issuer": "", "year": ""}}],
  "improvement_report": {{"remaining_gaps": ["requirements you could not honestly include"]}}
}}"""

        result = self._call_llm(self.GENERATE_SYSTEM_PROMPT, user_prompt, json_mode=True, temperature=0.4)

        if result.get("success") and result.get("data"):
            self._finalize_cv(result["data"], cv_text, analysis, requirements)

        return result

    def _finalize_cv(self, data: Dict[str, Any], cv_text: str, analysis: Dict[str, Any],
                     requirements: List[Dict[str, Any]]) -> None:
        """Strip unsupported skills, then recompute the score from what the CV now says"""
        cv_norm = _normalize(cv_text)

        # Drop any skill the analysis found no evidence for and the original CV never mentions
        unsupported = {_normalize(r["name"]) for r in requirements
                       if r["status"] == "missing" and not _mentions(cv_norm, r["name"])}
        removed = []
        skills = data.get("skills")
        if unsupported and isinstance(skills, dict):
            for category, items in list(skills.items()):
                if not isinstance(items, list):
                    continue
                kept = [i for i in items if not (isinstance(i, str) and _normalize(i) in unsupported)]
                removed += [i for i in items if isinstance(i, str) and _normalize(i) in unsupported]
                if kept:
                    skills[category] = kept
                else:
                    del skills[category]
        if removed:
            logger.info(f"✂️  Removed {len(removed)} unevidenced skill(s) from the tailored CV: {', '.join(removed)}")

        if not requirements:
            return

        # Anything the tailored CV now states counts as present for ATS keyword matching
        generated_norm = _normalize(json.dumps({k: v for k, v in data.items()
                                                if k not in ("improvement_report", "header")}))
        added = []
        for req in requirements:
            if req["status"] != "met" and _mentions(generated_norm, req["name"]):
                req["status"] = "met"
                added.append(req["name"])

        breakdown = analysis.get("breakdown") or {}
        new_score = _overall_score(
            _skills_score(requirements),
            float(breakdown.get("title_alignment", 50)),
            float(breakdown.get("experience", 50)),
            float(breakdown.get("education", 70)),
            analysis.get("domain_match", "weak_match")
        )
        old_score = analysis.get("overall_ats_score") or analysis.get("score") or 0

        report = data.get("improvement_report") if isinstance(data.get("improvement_report"), dict) else {}
        report["original_score"] = old_score
        report["new_score"] = new_score
        report["skills_added"] = added
        report.setdefault("remaining_gaps", [])
        if requirements:
            report["remaining_gaps"] = [r["name"] for r in requirements if r["status"] != "met"]
        data["improvement_report"] = report
        data["gap_analysis"] = f"Optimization complete. Score improved from {old_score}% to {new_score}%."
        logger.info(f"📈 Tailored CV score {old_score}% -> {new_score}% ({len(added)} keyword(s) added)")

# Singleton instance
ai_service = AIService()
