import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import {
    Brain,
    Check,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Coffee,
    FileText,
    ShieldCheck,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JobSearch from './components/JobSearch';
import JobList, { JobListSkeleton } from './components/JobList';
import CVAnalysis from './components/CVAnalysis';
import DocumentPreview from './components/DocumentPreview';
import GenerationProgress from './components/GenerationProgress';
import AboutUs from './components/AboutUs';
import ErrorMessage, { SUPPORT_URL } from './components/ErrorMessage';

const API_BASE = '/api';

// Read the error message from a failed API response. The body can be empty or
// not JSON (e.g. when the backend isn't running behind the Vite proxy).
async function readError(response, fallback) {
    const data = await response.json().catch(() => null);
    if (typeof data?.detail === 'string') return data.detail;
    if (!data && response.status >= 500) return 'Could not reach the server. Please make sure it is running and try again.';
    return fallback;
}

const STEPS = [
    { id: 'search', label: 'Choose a job' },
    { id: 'analysis', label: 'Analyze fit' },
    { id: 'preview', label: 'Tailored CV' }
];

function Stepper({ current }) {
    const currentIndex = STEPS.findIndex(s => s.id === current);

    return (
        <ol className="stepper" aria-label="Progress">
            {STEPS.map((step, i) => (
                <Fragment key={step.id}>
                    {i > 0 && <li className="step-sep" aria-hidden="true" />}
                    <li
                        className={`step ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}
                        aria-current={i === currentIndex ? 'step' : undefined}
                    >
                        <span className="step-index">{i < currentIndex ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                        <span className="step-label">{step.label}</span>
                    </li>
                </Fragment>
            ))}
        </ol>
    );
}

function App() {
    // Application state
    // Steps: 'search', 'analysis', 'preview', plus the 'about' page
    const [currentStep, setCurrentStep] = useState('search');
    const [returnStep, setReturnStep] = useState('search'); // Where About's "Back" returns to

    // Data states
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [cvData, setCvData] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [generatedDocs, setGeneratedDocs] = useState({ cv: null, coverLetter: null });

    // UI states
    const [loading, setLoading] = useState(false);
    const [loadingType, setLoadingType] = useState('cv'); // 'cv' or 'cover_letter'
    const [error, setError] = useState(null);
    const [searchKey, setSearchKey] = useState(0); // Add key to force reset JobSearch
    const [postedFilter, setPostedFilter] = useState('all'); // Lifted state for persistence
    const [hasSearched, setHasSearched] = useState(false);
    const [scoreBefore, setScoreBefore] = useState(null); // Match score before tailoring
    const jobDescriptions = useRef(new Map()); // job id -> promise of its full description

    // Search results only carry a short snippet, so fetch the full ad for the AI steps
    const ensureFullDescription = useCallback((job) => {
        const snippet = job?.description || '';
        if (!job?.id) return Promise.resolve(snippet);

        if (!jobDescriptions.current.has(job.id)) {
            const request = fetch(`${API_BASE}/jobs/${job.id}`)
                .then(res => (res.ok ? res.json() : null))
                .then(data => {
                    const full = data?.job?.description || '';
                    return full.length > snippet.length ? full : snippet;
                })
                .catch(() => snippet); // A Reed hiccup shouldn't block the flow
            jobDescriptions.current.set(job.id, request);
        }
        return jobDescriptions.current.get(job.id);
    }, []);

    // Start each step/page at the top
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentStep]);

    // Handle job search
    // Initial load - fetch default jobs
    useEffect(() => {
        if (!hasSearched) {
            handleJobSearch('', '', 'gb');
        }
    }, []);

    // Handle job search
    const handleJobSearch = useCallback(async (query, location, country, filters = {}) => {
        setLoading(true);
        setError(null);
        setHasSearched(true); // Always set to true as we are searching

        // If query is empty, we still fetch, but just clear the previous jobs first
        setJobs([]);

        try {
            const params = new URLSearchParams({
                q: query, // Can be empty string now
                country: country,
                limit: '600'
            });

            if (location) {
                params.append('location', location);
            }

            // Add filter parameters
            if (filters.fullTime) params.append('fullTime', 'true');
            if (filters.partTime) params.append('partTime', 'true');
            if (filters.permanent) params.append('permanent', 'true');
            if (filters.contract) params.append('contract', 'true');
            if (filters.graduate) params.append('graduate', 'true');

            const response = await fetch(`${API_BASE}/jobs/search?${params}`);

            if (!response.ok) {
                throw new Error(await readError(response, 'Failed to search jobs'));
            }

            const data = await response.json();
            setJobs(data.jobs);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle job selection
    const handleSelectJob = useCallback((job) => {
        ensureFullDescription(job); // Prefetch while the user picks their CV file
        setSelectedJob(job);
        setCurrentStep('analysis');
    }, [ensureFullDescription]);

    // Handle CV Analysis (Upload + Analyze)
    const handleAnalysis = useCallback(async (file, job) => {
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const jobDescription = await ensureFullDescription(job);

            // 1. Upload CV
            const uploadRes = await fetch(`${API_BASE}/cv/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error(await readError(uploadRes, 'Failed to upload CV'));
            }

            const uploadData = await uploadRes.json();
            setCvData(uploadData);

            // 2. Analyze Fit
            const analyzeRes = await fetch(`${API_BASE}/cv/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cv_id: uploadData.cv_id,
                    job_title: job.title,
                    job_description: jobDescription,
                    company_name: job.company
                })
            });

            if (!analyzeRes.ok) {
                throw new Error(await readError(analyzeRes, 'Analysis failed'));
            }

            const analyzeData = await analyzeRes.json();
            // Merge detected_industry into the analysis result for UI logic
            setAnalysisResult({
                ...analyzeData.analysis,
                detected_industry: analyzeData.detected_industry
            });
            return analyzeData.analysis;

        } catch (err) {
            // setError(err.message); // Lets CVAnalysis handle the error locally
            throw err;
        }
    }, [ensureFullDescription]);

    // Generate optimized CV
    const handleOptimize = useCallback(async () => {
        if (!cvData || !selectedJob) return;

        setLoading(true);
        setLoadingType('cv');
        setError(null);
        setCurrentStep('preview');

        try {
            const jobDescription = await ensureFullDescription(selectedJob);

            // Generate PDF directly
            const response = await fetch(`${API_BASE}/cv/generate/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cv_id: cvData.cv_id,
                    job_title: selectedJob.title,
                    job_description: jobDescription,
                    company_name: selectedJob.company,
                    ats_analysis: analysisResult
                })
            });

            if (!response.ok) {
                throw new Error(await readError(response, 'Failed to generate PDF'));
            }

            // Extract improvement metrics from headers
            const newScoreHeader = response.headers.get('X-New-Score');
            const skillsAddedHeader = response.headers.get('X-Skills-Added');

            if (newScoreHeader) {
                const newScore = parseInt(newScoreHeader, 10);
                setScoreBefore(analysisResult?.score ?? null);
                const addedSkills = skillsAddedHeader ? skillsAddedHeader.split(',').map(s => s.trim()) : [];

                // Update analysis result to reflect optimization
                setAnalysisResult(prev => {
                    if (!prev) return null;

                    // Filter out added skills from missing list
                    const newMissing = prev.missing_skills.filter(
                        missing => !addedSkills.some(added => added.toLowerCase() === missing.toLowerCase())
                    );

                    // Add to matching list
                    const newMatching = [...prev.matching_skills, ...addedSkills];

                    return {
                        ...prev,
                        score: newScore,
                        summary: `Optimized! Score improved to ${newScore}%.`,
                        missing_skills: newMissing,
                        matching_skills: newMatching
                    };
                });
            }

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/pdf')) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                setGeneratedDocs(prev => ({ ...prev, cv: url, isPdf: true, textContent: null }));
            } else {
                const text = await response.text();
                setGeneratedDocs(prev => ({ ...prev, cv: null, isPdf: false, textContent: text }));
            }
        } catch (err) {
            setError(err.message);
            setCurrentStep('analysis');
        } finally {
            setLoading(false);
        }
    }, [cvData, selectedJob, analysisResult, ensureFullDescription]);

    // Generate cover letter
    const handleGenerateCoverLetter = useCallback(async () => {
        if (!cvData || !selectedJob) return;

        setLoading(true);
        setLoadingType('cover_letter');
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/cv/cover-letter/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cv_id: cvData.cv_id,
                    job_title: selectedJob.title,
                    job_description: selectedJob.description,
                    company_name: selectedJob.company
                })
            });

            if (!response.ok) {
                throw new Error(await readError(response, 'Failed to generate cover letter'));
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setGeneratedDocs(prev => ({ ...prev, coverLetter: url }));

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [cvData, selectedJob]);

    // Download CV Handler
    const handleDownloadCV = useCallback(() => {
        if (!selectedJob) return;

        try {
            const a = document.createElement('a');

            if (generatedDocs.isPdf && generatedDocs.cv) {
                a.href = generatedDocs.cv;
                a.download = `CV_${selectedJob.company.replace(/\s+/g, '_')}_${selectedJob.title.replace(/\s+/g, '_')}.pdf`;
            } else if (generatedDocs.textContent) {
                const blob = new Blob([generatedDocs.textContent], { type: 'application/x-tex' });
                const url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = `CV_${selectedJob.company.replace(/\s+/g, '_')}_${selectedJob.title.replace(/\s+/g, '_')}.tex`;
            } else {
                return;
            }

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            setError(err.message);
        }
    }, [generatedDocs, selectedJob]);

    // Reset to start
    const handleReset = useCallback(() => {
        setCvData(null);
        setAnalysisResult(null);
        setJobs([]);
        setSelectedJob(null);
        setGeneratedDocs({ cv: null, coverLetter: null });
        setScoreBefore(null);
        setCurrentStep('search');
        setError(null);
        setSearchKey(prev => prev + 1); // Force re-mount of JobSearch
        setPostedFilter('all');
        setHasSearched(false);
    }, []);

    const handleBackToSearch = useCallback(() => {
        setSelectedJob(null);
        setAnalysisResult(null);
        setCvData(null);
        setCurrentStep('search');
    }, []);

    // The About page remembers the step it was opened from
    const openAbout = useCallback(() => {
        if (currentStep !== 'about') setReturnStep(currentStep);
        setCurrentStep('about');
    }, [currentStep]);

    const handleClosePage = useCallback(() => {
        setCurrentStep(returnStep);
    }, [returnStep]);

    const isContentPage = currentStep === 'about';

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="container header-inner">
                    <button className="brand" onClick={handleReset} aria-label="NeuroArc home">
                        <span className="brand-mark"><Brain size={22} /></span>
                        <span className="brand-name">NeuroArc</span>
                        <span className="brand-tag">AI Career Architect</span>
                    </button>

                    <nav className="header-nav" aria-label="Main">
                        <button className={`nav-link ${currentStep === 'about' ? 'active' : ''}`} onClick={openAbout}>
                            About
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="main">
                {/* Error Toast */}
                <AnimatePresence>
                    {error && currentStep !== 'analysis' && !isContentPage && (
                        <motion.div
                            role="alert"
                            className="alert alert-error toast"
                            initial={{ opacity: 0, y: -8, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: -8, x: '-50%' }}
                        >
                            <AlertCircle size={18} />
                            <div className="alert-body">
                                <ErrorMessage message={error} />
                            </div>
                            <button className="alert-close" onClick={() => setError(null)} aria-label="Dismiss">
                                <X size={16} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {(currentStep === 'analysis' || currentStep === 'preview') && <Stepper current={currentStep} />}

                <AnimatePresence mode="wait">
                    {/* About */}
                    {currentStep === 'about' && (
                        <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            <AboutUs onBack={handleClosePage} />
                        </motion.div>
                    )}

                    {/* Step 1: Job Search */}
                    {currentStep === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            <section className="page-hero">
                                <span className="eyebrow"><Sparkles size={14} /> AI-powered job application assistant</span>
                                <h1 className="hero-title">Find your next role</h1>
                                <p className="hero-subtitle">
                                    Search live UK jobs, see how well your CV matches, and generate a tailored, ATS-friendly CV in seconds.
                                </p>
                            </section>

                            <JobSearch key={searchKey} onSearch={handleJobSearch} loading={loading} />

                            <section className="results">
                                {loading ? (
                                    <JobListSkeleton />
                                ) : (
                                    <JobList
                                        jobs={jobs}
                                        selectedJob={selectedJob}
                                        onSelectJob={handleSelectJob}
                                        cvSkills={[]}
                                        postedFilter={postedFilter}
                                        setPostedFilter={setPostedFilter}
                                        hasSearched={hasSearched}
                                    />
                                )}
                            </section>
                        </motion.div>
                    )}

                    {/* Step 2: CV Analysis */}
                    {currentStep === 'analysis' && selectedJob && (
                        <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            <CVAnalysis
                                job={selectedJob}
                                onAnalyze={handleAnalysis}
                                onNext={handleOptimize}
                                onBack={handleBackToSearch}
                                upstreamError={error}
                            />
                        </motion.div>
                    )}

                    {/* Step 3: Preview & Apply */}
                    {currentStep === 'preview' && (
                        <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            {loading ? (
                                <div className="card progress-panel fade-in">
                                    <div className="progress-panel-icon"><FileText size={22} /></div>
                                    <h2>Tailoring your CV</h2>
                                    <p>For {selectedJob?.title} at {selectedJob?.company}</p>
                                    <GenerationProgress type="cv" />
                                </div>
                            ) : (
                                <>
                                    <div className="alert alert-success fade-in" style={{ marginBottom: '1rem' }}>
                                        <CheckCircle2 size={20} />
                                        <div className="alert-body">
                                            <div className="alert-title">Your tailored CV is ready</div>
                                            Optimized for {selectedJob?.title} at {selectedJob?.company}. Review it below, then download and apply.
                                        </div>
                                    </div>

                                    <DocumentPreview
                                        cv={generatedDocs.cv}
                                        textContent={generatedDocs.textContent}
                                        isPdf={generatedDocs.isPdf}
                                        onDownloadCV={handleDownloadCV}
                                        analysisResult={analysisResult}
                                        scoreBefore={scoreBefore}
                                        job={selectedJob}
                                        onBack={handleBackToSearch}
                                    />
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="site-footer">
                <div className="container footer-inner">
                    <span>&copy; {new Date().getFullYear()} NeuroArc</span>
                    <span className="footer-privacy">
                        <ShieldCheck size={14} /> No data is stored. CVs are processed in memory only.
                    </span>
                    <nav className="footer-links" aria-label="Footer">
                        <button onClick={openAbout}>About</button>
                        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                            <Coffee size={14} /> Support
                        </a>
                    </nav>
                </div>
            </footer>
        </div>
    );
}

export default App;
