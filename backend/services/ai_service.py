"""
AI Service - LLM Integration for CV Tailoring
Uses Azure AI Inference SDK with GitHub Models
"""
import os
import json
from typing import Dict, Any, Optional
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
import logging

logger = logging.getLogger(__name__)

class AIService:
    """Service for AI-powered CV tailoring"""
    
    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN", "")
        self.endpoint = "https://models.inference.ai.azure.com"
        # Priority list: Try best model first, then fallback
        self.models = ["gpt-4o", "gpt-4o-mini"]
        
        if not self.token:
            logger.warning("⚠️ GITHUB_TOKEN not found. AI features will be unavailable.")
            self.client = None
        else:
            # Disable automatic retries - we handle fallback ourselves
            self.client = ChatCompletionsClient(
                endpoint=self.endpoint,
                credential=AzureKeyCredential(self.token),
                retry_total=0  # Don't wait on rate limits, fail fast
            )
    
    def _call_llm(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> Dict[str, Any]:
        """
        Make a call to the LLM with automatic fallback support
        """
        if not self.client:
            return {
                "success": False,
                "error": "AI service not configured. Set GITHUB_TOKEN environment variable."
            }
        
        # Prepare the prompt once
        full_user_prompt = user_prompt
        if json_mode:
            full_user_prompt += "\n\nIMPORTANT: Output ONLY valid JSON."
            
        last_error = None
        
        # Try models in order
        for model in self.models:
            logger.info(f"🤖 Attempting AI call with model: {model}...")
            try:
                response = self.client.complete(
                    messages=[
                        SystemMessage(content=system_prompt),
                        UserMessage(content=full_user_prompt)
                    ],
                    model=model,
                    temperature=0.7,
                    max_tokens=4000,
                    timeout=10  # Fail fast (10s)
                )
                
                content = response.choices[0].message.content
                logger.info(f"✅ Success with {model}")
                
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
                            "data": parsed_content
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
                    "usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens
                    }
                }

            except Exception as e:
                last_error = str(e)
                logger.warning(f"⚠️ AI Error with {model}: {last_error}")
                
                # Auth error - Stop immediately
                if "401" in last_error or "unauthorized" in last_error.lower():
                    return {
                        "success": False,
                        "error": "Invalid API token. Please check your GITHUB_TOKEN."
                    }
                
                # Rate limit or timeout - Continue to next model
                continue

        # If we get here, all models failed
        logger.error("❌ All models failed.")
        return {
            "success": False,
            "error": "Server is busy due to high demand. Please help keep the servers running: https://buymeacoffee.com/manojthapa",
            "details": last_error
        }
    
    def analyze_fit(
        self,
        cv_text: str,
        cv_skills: list,
        job_title: str,
        job_description: str
    ) -> Dict[str, Any]:
        """
        Perform deep analysis of CV fit for a job
        Returns score, missing skills, and advice
        """
        system_prompt = """You are an expert ATS (Applicant Tracking System) scoring engine and technical recruiter. Your task is to calculate a match score between a CV and a job description while checking domain/background compatibility.

═══════════════════════════════════════════════════════════
STEP 0: CONTENT VALIDATION (CRITICAL FIRST STEP)
═══════════════════════════════════════════════════════════

First, analyze the candidate input to ensure it is actually a professional CV/Resume. 
A valid CV must contain:
- Professional experience or history
- Educational background
- Skills or qualifications
- Contact information (or placeholders for it)

REJECT the document if it appears to be:
- A recipe, lyrics, fan fiction, or creative writing
- Source code or logs (unless part of a portfolio in a CV context)
- A generic article, blog post, or essay
- Random incoherent text

IF REJECTED:
- Set "is_valid_cv": false
- Provide a polite "rejection_reason" explaining why.
- You can stop processing further steps.

IF VALID:
- Set "is_valid_cv": true
- Proceed to Step 1.

═══════════════════════════════════════════════════════════
STEP 1: EXTRACT JOB-SPECIFIC REQUIREMENTS
═══════════════════════════════════════════════════════════

Before scoring, you MUST first analyze the job description and extract: 

a) JOB TITLE: What is the exact role? (e.g., "Senior Data Engineer", "Marketing Coordinator")

b) REQUIRED KEYWORDS (Hard Skills):
   - Technical skills mentioned (e.g., Python, AWS, SQL, React, Excel)
   - Tools/software explicitly named (e.g., Salesforce, Docker, Tableau)
   - Certifications required (e.g., PMP, AWS Certified, CPA)
   - Programming languages, frameworks, platforms
   - Extract 15-25 keywords minimum

c) REQUIRED QUALIFICATIONS:
   - Years of experience needed (e.g., "3-5 years", "entry-level")
   - Education level (e.g., "Bachelor's in Computer Science", "MBA preferred")
   - Industry experience (e.g., "fintech background", "healthcare experience")

d) SOFT SKILLS & COMPETENCIES:
   - Leadership, communication, teamwork, problem-solving
   - Methodologies (e.g., Agile, Scrum, Design Thinking)

e) KEYWORD FREQUENCY ANALYSIS:
   - Count how many times each keyword appears in job description
   - Keywords mentioned 3+ times are CRITICAL and weighted higher
   - Mark keywords as "Must-Have" (in required section) vs "Nice-to-Have" (in preferred section)

═══════════════════════════════════════════════════════════
STEP 2: DOMAIN & BACKGROUND MATCH CHECK (CRITICAL)
═══════════════════════════════════════════════════════════

Determine if the candidate's educational/professional background is compatible with the target role:

CATEGORY: "complete_mismatch"
- The candidate's core field is FUNDAMENTALLY DIFFERENT from the job
- Examples:
  * CS graduate → Nursing role
  * Mechanical Engineer → Software Developer (no coding experience)
  * Arts major → Civil Engineering
  * Marketing graduate → Data Scientist (no technical background)
- ACTION: Set final score 15-29. Focus advice on applying for roles matching their actual background.

CATEGORY: "weak_match"
- The candidate's field is RELATED but lacks specific experience/projects
- Examples:
  * CS graduate → ML Engineer (but no ML projects)
  * Fresh graduate → Senior role
  * Backend developer → DevOps Engineer (no cloud/infrastructure experience)
  * Junior developer → Lead Engineer
- ACTION: Set final score 30-59. Provide specific project recommendations to build required skills.

CATEGORY: "good_match"
- The candidate's background aligns well with the role
- Examples:
  * Software Engineer → Senior Software Engineer
  * Junior Data Analyst → Data Analyst
  * Frontend Developer → React Developer
- ACTION: Calculate normal ATS score 60-100. Focus on optimization tips.

═══════════════════════════════════════════════════════════
STEP 3: CALCULATE ATS MATCH SCORE
═══════════════════════════════════════════════════════════

Now score the CV using these 6 factors:

1. KEYWORD MATCH SCORE (Weight: 35%)
   
   CRITICAL DISTINCTION:
   - A skill is PRESENT if it appears ANYWHERE in the CV (skills section, experience, projects, education)
   - Variants count as matches: "PostgreSQL" = "SQL", "React.js" = "React", "ML" = "Machine Learning"
   - Do NOT require project experience to count a skill as present
   
   SCORING LOGIC:
   - If skill appears in CV = MATCHED (full points)
   - If skill does NOT appear anywhere in CV = MISSING
   
   Formula: (Matched Keywords / Total Extracted Keywords) × 100
   - Critical keywords (mentioned 3+ times) weighted 1.5x
   - Keywords in Professional Summary or Skills section get 1.2x bonus
   
   IMPORTANT: 
   - missing_skills array should ONLY contain skills NOT mentioned anywhere in CV
   - If "SQL" is in CV skills but no SQL projects exist, it's still MATCHED (not missing)
   - Project recommendations are SEPARATE from missing skills

2. JOB TITLE ALIGNMENT SCORE (Weight: 20%)
   - Compare CV's current/recent titles with extracted target role
   - Exact match = 100%
   - Similar title = 80%
   - Related field = 50%
   - Unrelated = 20%

3. SKILLS COVERAGE SCORE (Weight: 25%)
   - Must-have skills from job description = 2 points each
   - Nice-to-have skills = 1 point each
   - Calculate: (Points Earned / Max Points) × 100
   - Skill is counted if it appears ANYWHERE in CV

4. EXPERIENCE LEVEL ALIGNMENT (Weight: 10%)
   - Compare CV years vs job requirement
   - Match or exceed = 100%
   - Within 1 year = 80%
   - 2+ years difference = 50%

5. EDUCATION & CERTIFICATION MATCH (Weight: 5%)
   - Required degree present = 100%
   - Related degree = 70%
   - Certifications match = +10% each

6. FORMATTING & READABILITY SCORE (Weight: 5%)
   - Standard sections = +20%
   - Clean structure = +20%
   - Contact info = +20%
   - Bullet points = +20%
   - Date formatting = +20%

OVERALL SCORE = Sum of weighted scores

IMPORTANT: Respect domain_match category limits:
- complete_mismatch: final score must be 15-29
- weak_match: final score must be 30-59
- good_match: final score can be 60-100

═══════════════════════════════════════════════════════════
STEP 4: GENERATE RECOMMENDATIONS
═══════════════════════════════════════════════════════════

Based on domain_match:

IF "complete_mismatch":
- Clearly state the field mismatch in summary
- Recommend roles matching their actual background
- NO project recommendations (wrong field entirely)

IF "weak_match":
- Provide 3-5 SPECIFIC, BUILDABLE projects ONLY for skills that are MISSING from CV
- Example: If CV has "SQL" listed but no projects, DON'T recommend SQL project
- Example: If CV lacks "Docker" entirely, THEN recommend "Build a Dockerized application"
- Suggest certifications for missing skills
- Recommend entry-level roles or internships

IF "good_match":
- Focus on keyword optimization
- Suggest rephrasing bullet points to emphasize existing skills more strongly
- Recommend adding quantifiable achievements for skills already present
- Highlight sections needing strengthening

PROJECT RECOMMENDATION RULES:
1. ONLY recommend projects for skills in the "missing_skills" array
2. Do NOT recommend projects for skills already listed in CV
3. Instead, for present skills without strong evidence, recommend:
   - "Add quantifiable achievements for your SQL work"
   - "Highlight your React projects more prominently"
   - "Include metrics for your AWS experience"
"""

        user_prompt = f"""Analyze this candidate for the role of {job_title}.

INPUTS PROVIDED:
1. Candidate CV Content:
Skills: {', '.join(cv_skills)}
Experience Snippet: {cv_text[:3000]}

2. Job Description:
{job_description[:4000]}

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON)
═══════════════════════════════════════════════════════════

{{
  "is_valid_cv": true,
  "rejection_reason": null,
  "job_analysis": {{
    "job_title": "extracted role title",
    "required_experience": "e.g., 5+ years",
    "required_education": "e.g., Bachelor's in Computer Science",
    "extracted_keywords": {{
      "must_have": ["keyword1", "keyword2"],
      "nice_to_have": ["keyword3", "keyword4"],
      "critical_keywords": ["keyword1"]
    }},
    "soft_skills": ["Agile", "Communication"]
  }},
  "domain_match": "complete_mismatch | weak_match | good_match",
  "overall_ats_score": <number 0-100>,
  "score_interpretation": "Brief explanation based on score and domain match",
  "breakdown": {{
    "keyword_match": {{
      "score": 0-100,
      "weight": 35,
      "weighted_score": 0,
      "matched_keywords": ["list of matched"],
      "missing_critical_keywords": ["list of critical missing"]
    }},
    "job_title_alignment": {{
      "score": 0-100,
      "weight": 20,
      "weighted_score": 0,
      "details": "explanation of title match"
    }},
    "skills_coverage": {{
      "score": 0-100,
      "weight": 25,
      "weighted_score": 0,
      "must_have_present": 0,
      "must_have_total": 0,
      "nice_to_have_present": 0,
      "nice_to_have_total": 0
    }},
    "experience_level": {{
      "score": 0-100,
      "weight": 10,
      "weighted_score": 0,
      "cv_experience": "extracted from CV",
      "required_experience": "extracted from job"
    }},
    "education_certification": {{
      "score": 0-100,
      "weight": 5,
      "weighted_score": 0,
      "details": "explanation"
    }},
    "formatting_readability": {{
      "score": 0-100,
      "weight": 5,
      "weighted_score": 0
    }}
  }},
  "matching_skills": ["ONLY skills that appear BOTH in the job description AND in the CV - these are the overlapping skills"],
  "missing_skills": ["Skills required by the job description that are NOT found in the CV"],
  "advice": [
    "tip1",
    "tip2",
    "tip3"
  ],
  "project_recommendations": [
    "ONLY projects for skills in missing_skills array",
    "Example: 'Build X using [missing skill] to demonstrate competency'",
    "Do NOT recommend projects for skills already in CV"
  ],
  "summary": "1-2 sentence summary including domain match status and key takeaway",
  "score_guide": {{
    "80-100": "Excellent - strong ATS pass likelihood",
    "60-79": "Moderate - optimization recommended",
    "below_60": "Low - significant tailoring needed"
  }}
}}

CRITICAL RULES:
1. If domain_match is "complete_mismatch", summary MUST state: "Your background in [X] does not align with this [Y] role. We recommend applying for positions matching your [X] expertise."
2. matching_skills = INTERSECTION of (job requirements AND CV skills) - ONLY skills that the job asks for AND the candidate has
3. missing_skills = skills required by job description that are NOT found anywhere in the CV
4. DO NOT put CV skills that are irrelevant to the job in matching_skills (e.g., Python skills for a teaching job)
5. For complete_mismatch: matching_skills should be empty or only contain soft skills, missing_skills contains job requirements
6. project_recommendations = ONLY for truly missing skills, NOT for skills already listed
7. For skills present but without strong evidence, use advice array to suggest better highlighting
8. Critical keywords (mentioned 3+ times) MUST be highlighted in recommendations
9. Final score MUST respect domain_match limits (complete=15-29, weak=30-59, good=60-100)
10. Skill variants count as matches across ALL domains:
   - Tech: SQL/PostgreSQL/MySQL → "SQL matched", JavaScript/TypeScript → "JS matched"
   - Healthcare: RN/Registered Nurse/Nursing License → "Nursing matched"
   - Finance: Excel/Google Sheets/Spreadsheets → "Spreadsheet skills matched"
   - Education: Teaching/Instruction/Training/Tutoring → "Teaching matched"
   - Marketing: SEO/SEM/Search Marketing → "Search Marketing matched"
   - General: Always treat synonyms and related certifications as matching skills
"""

        result = self._call_llm(system_prompt, user_prompt, json_mode=True)
        
        if result.get("success") and result.get("data"):
            # Validation Check
            if result["data"].get("is_valid_cv") is False:
                # User requested specific static message
                return {
                    "success": False,
                    "error": "The provided document does not appear to be a CV or Resume. Please upload a valid CV or Resume."
                }

        # Ensure compatibility with frontend by mapping 'overall_ats_score' to 'score'
        if result.get("success") and result.get("data") and "overall_ats_score" in result["data"]:
            result["data"]["score"] = result["data"]["overall_ats_score"]
            
        return result
    
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
        Generate a tailored CV in structured JSON format for direct PDF generation
        """
        system_prompt = """You are an expert CV optimization specialist. Your task is to create a highly optimized, ATS-friendly CV in structured JSON format for PDF generation using Python ReportLab.

CONTEXT: You will receive ATS scoring results that identified missing keywords, domain match status, and recommendations. Use these insights to optimize the CV.

IMPORTANT CONSTRAINTS ABOUT EXPERIENCE AND PROJECTS:

- You must NOT invent or fabricate work experience, job titles, companies, dates, locations, or projects.
- You must NOT add artificial internships, freelance roles, or side projects not mentioned in the original CV.
- You must NOT fabricate certifications, degrees, or institutions.

WHEN EXPERIENCE/PROJECTS ARE WEAK OR LIMITED:

- Still optimize wording, structure, and clarity of existing content.
- Improve bullet points to be more outcome-focused using information already implied or present.
- Do NOT create new experience sections, projects, or roles to fill space.

HOW TO APPLY OPTIMIZATION:

- Only include roles, projects, and certifications from the original CV.
- You may:
  * Reorder projects so most relevant appear first
  * Merge or split bullets for clarity
  * Strengthen language around real achievements
  * Its very important to add all missing keywords from ATS analysis  (if the skill/experience exists but wasn't mentioned)
- You may NOT:
  * Add entirely new project entries or roles

If CV is under-experienced for the role, prioritize:
- Strong, honest Professional Summary highlighting learning mindset and real skills
- Well-structured Technical Skills section aligned with job description
- Clear education details and certifications

OPTIMIZATION REQUIREMENTS:

1. Professional Summary:
   - 2-3 sentences highlighting relevant skills and achievements
   - CRITICAL: Do NOT use "seeking", "looking for", "aspiring to", "eager to apply", or mention company/role name
   - State what the candidate IS, not what they WANT
   - BAD: "Seeking a Software Engineer role at Company X..."
   - GOOD: "Full-stack developer with 3+ years building scalable web applications using React and Node.js"

2. Skills Section:
   - REQUIRED: Keep ALL relevant skills from the original CV.
   - PERMITTED: You MAY add critical missing keywords (e.g. "AWS", "CI/CD") to the list if they are standard for the role, effectively suggesting the user should list them.
   - BUT: Do NOT invent Experience bullets to support them if the experience is missing. Just list the skill.
   - Group into categories (Languages, Frameworks, Tools, Databases, Other)

3. Experience Section:
   - Use strong action verbs: "Engineered", "Optimized", "Architected", "Implemented", "Led"
   - Add quantifiable achievements with metrics (%, numbers, timeframes)
   - Incorporate job description keywords naturally
   - Apply STAR method where possible

4. Keywords:
   - Strategically place job-specific keywords from ATS analysis
   - Use 2-3 times throughout (natural distribution)
   - Include both full forms and acronyms (e.g., "Machine Learning (ML)")

5. ATS Compatibility:
   - Standard section headings
   - Clean structure, no complex formatting
   - Bullet points concise (70-180 characters)
"""

        # Extract useful data from ATS analysis for the prompt
        missing_critical = []
        domain_match = "good_match"
        if ats_analysis_json:
            missing_critical = ats_analysis_json.get("breakdown", {}).get("keyword_match", {}).get("missing_critical_keywords", [])
            domain_match = ats_analysis_json.get("domain_match", "good_match")

        # Build explicit contact info section if provided
        contact_section = ""
        if contact_info or candidate_name:
            contact_section = "\n\n4. EXTRACTED CONTACT INFORMATION (USE EXACTLY AS PROVIDED):\n"
            if candidate_name:
                contact_section += f"   - Name: {candidate_name}\n"
            if contact_info:
                if contact_info.get("email"):
                    contact_section += f"   - Email: {contact_info['email']}\n"
                if contact_info.get("phone"):
                    contact_section += f"   - Phone: {contact_info['phone']}\n"
                if contact_info.get("linkedin"):
                    contact_section += f"   - LinkedIn: {contact_info['linkedin']}\n"
            contact_section += "   IMPORTANT: Use the contact details above EXACTLY. Do NOT use placeholders.\n"

        user_prompt = f"""INPUTS PROVIDED:

1. ATS Scoring Results:
{str(ats_analysis_json)}

2. Current CV:
{cv_text[:6000]}

3. Target Job:
{job_title} at {company_name}
{job_description[:3000]}
{contact_section}

TASK: Using the ATS scoring results, optimize the CV to improve the score while maintaining honesty.

Pay special attention to:
- Missing critical keywords: {', '.join(missing_critical)}
- Domain match status: {domain_match}
- Recommendations from scoring analysis

OUTPUT JSON STRUCTURE (STANDARD CV ORDER):

{{
  "header": {{
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+XX-XXXXXXXXXX",
    "location": "City, Country",
    "linkedin": "LinkedIn URL (only if in original CV)",
    "github": "GitHub URL (only if in original CV)"
  }},
  "summary": "2-3 sentence summary (NO 'seeking' or 'looking for' phrases)",
  "education": [
    {{
      "degree": "Degree Title",
      "institution": "University Name",
      "location": "City, Country",
      "dates": "Month Year - Month Year"
    }}
  ],
  "skills": {{
    // CHOOSE CATEGORIES BASED ON INDUSTRY. Examples:
    // Tech: "languages", "frameworks", "tools", "databases", "cloud"
    // Healthcare: "clinical_skills", "certifications", "software", "languages"
    // Finance: "analytical", "software", "certifications", "languages"
    // General: "technical", "software", "certifications", "soft_skills"
    
    // Use 3-5 categories that fit the CV's industry. Omit empty categories.
    "category_name": ["Skill1", "Skill2"]
  }},
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "dates": "Month Year - Month Year",
      "bullets": [
        "Achievement with metrics and keywords",
        "Achievement with quantifiable impact"
      ]
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "technologies": "Tech1, Tech2",
      "dates": "Month Year",
      "description": "Description with impact and relevant technologies"
    }}
  ],
  "certifications": [
    {{
      "name": "Certification Name",
      "issuer": "Issuer Organization",
      "year": "Year/Date"
    }}
  ],
  "improvement_report": {{
    "original_score": "Value from input",
    "new_score": "Estimated new score (0-100) after adding missing keywords",
    "skills_added": ["List of skills you successfully added to the CV"],
    "remaining_gaps": ["List of skills/experience you could NOT add (e.g. requires specific project experience)"]
  }}
}}

CRITICAL: HANDLING MISSING INFORMATION
- If original CV lacks a section, COMPLETELY OMIT that key
- NO empty arrays [], null values, or "N/A" placeholders
- Only include keys with real data

CRITICAL: CONSISTENCY CHECK
- Any skill listed in "skills_added" inside "improvement_report" MUST also be present in the relevant category within the "skills" object.
- Do NOT list a skill as added if you did not actually insert it into the CV content.
- If you cannot fit a skill naturally, do not list it as added.

SCORING RULES:
- If "missing_critical_keywords" was empty and you have optimized the phrasing/formatting, the new_score MUST be very high (95-100).
- Only deduct points if there are genuine gaps you could not fill.

Begin optimization now."""

        result = self._call_llm(system_prompt, user_prompt, json_mode=True)
        
        # Ensure compatibility with frontend
        if result.get("success") and result.get("data") and ats_analysis_json:
             # Inject the gap analysis summary for legacy frontend support
             old_score = ats_analysis_json.get('overall_ats_score', 0)
             new_score = result['data'].get('improvement_report', {}).get('new_score', 'N/A')
             result["data"]["gap_analysis"] = f"Optimization Complete. Score improved from {old_score}% to {new_score}%."
             
        return result

# Singleton instance
ai_service = AIService()
