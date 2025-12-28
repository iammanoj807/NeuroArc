import { useState, useCallback, useEffect } from 'react';
import {
    Brain,
    CheckCircle,
    AlertCircle,
    Sparkles,
    Loader2,
    Coffee,
    FileText,
    Hammer,
    RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JobSearch from './components/JobSearch';
import JobList from './components/JobList';
import CVAnalysis from './components/CVAnalysis';
import DocumentPreview from './components/DocumentPreview';
import Background3D from './components/Background3D';
import GenerationProgress from './components/GenerationProgress'; // Added this import based on the instruction's intent
import AboutUs from './components/AboutUs';
import ReviewsPage from './components/ReviewsPage';

const API_BASE = '/api';

// Generation Progress Component
// Moved to its own file, but keeping the definition here for context if it's not yet moved.
// If GenerationProgress is imported from './components/GenerationProgress', this local definition should be removed.
// Assuming for now it's still defined here and the import instruction was a hint for future refactoring or a mistake.
// Based on the instruction's "Code Edit" snippet, it seems the user intended to import it.
// I will remove the local definition and assume it's imported.
// Generation Progress Component
// Moved to its own file.



function App() {
    // Application state
    // Steps: 'search', 'analysis', 'preview'
    const [currentStep, setCurrentStep] = useState('search');

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
                limit: '400'
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
                const err = await response.json();
                throw new Error(err.detail || 'Failed to search jobs');
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
        setSelectedJob(job);
        setCurrentStep('analysis');
    }, []);

    // Handle CV Analysis (Upload + Analyze)
    const handleAnalysis = useCallback(async (file, job) => {
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // 1. Upload CV
            const uploadRes = await fetch(`${API_BASE}/cv/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.detail || 'Failed to upload CV');
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
                    job_description: job.description,
                    company_name: job.company
                })
            });

            if (!analyzeRes.ok) {
                const err = await analyzeRes.json();
                throw new Error(err.detail || 'Analysis failed');
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
    }, []);

    // Generate optimized CV
    const handleOptimize = useCallback(async () => {
        if (!cvData || !selectedJob) return;

        setLoading(true);
        setLoadingType('cv');
        setError(null);
        setCurrentStep('preview');

        try {
            // Generate PDF directly
            const response = await fetch(`${API_BASE}/cv/generate/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cv_id: cvData.cv_id,
                    job_title: selectedJob.title,
                    job_description: selectedJob.description,
                    company_name: selectedJob.company,
                    ats_analysis: analysisResult
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Failed to generate PDF' }));
                throw new Error(err.detail || 'Failed to generate PDF');
            }

            // Extract improvement metrics from headers
            const newScoreHeader = response.headers.get('X-New-Score');
            const skillsAddedHeader = response.headers.get('X-Skills-Added');

            if (newScoreHeader) {
                const newScore = parseInt(newScoreHeader, 10);
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
    }, [cvData, selectedJob, analysisResult]);

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
                const err = await response.json().catch(() => ({ detail: 'Failed to generate cover letter' }));
                throw new Error(err.detail || 'Failed to generate cover letter');
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
        setAnalysisResult(null);
        setCvData(null);
        setCurrentStep('search');
    }, []);

    // 6. About Us View
    if (currentStep === 'about') {
        return (
            <div className="app">
                <Background3D />
                <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
                    <AboutUs onBack={handleBackToSearch} onNavigateToReviews={() => setCurrentStep('reviews')} />
                </main>
            </div>
        );
    }

    // 7. Reviews View
    if (currentStep === 'reviews') {
        return (
            <div className="app">
                <Background3D />
                <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
                    <ReviewsPage onBack={handleBackToSearch} />
                </main>
            </div>
        );
    }

    return (
        <div className="app">
            <Background3D />

            {/* Header */}
            <header style={{
                padding: '2rem 3rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 10
            }}>
                <div onClick={handleReset} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Brain size={64} color="var(--color-primary)" />
                    <div>
                        <h1 style={{
                            fontSize: '2.2rem',
                            fontWeight: 800,
                            margin: 0,
                            background: 'linear-gradient(to right, #fff, var(--color-primary-light))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2
                        }}>NeuroArc</h1>
                        <p style={{
                            margin: 0,
                            color: 'var(--color-text-muted)',
                            fontSize: '1.1rem',
                            fontWeight: 500
                        }}>AI Career Architect</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>


                    <div className="tooltip-container">
                        <a href="https://www.buymeacoffee.com/manojthapa" target="_blank" rel="noopener noreferrer" className="hide-mobile">
                            <img
                                src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                                alt="Buy Me A Coffee"
                                style={{ height: '50px', width: 'auto' }}
                            />
                        </a>

                        <a href="https://www.buymeacoffee.com/manojthapa" target="_blank" rel="noopener noreferrer" className="show-mobile">
                            <img
                                src="/bmc-icon.png"
                                alt="Buy Me A Coffee"
                                style={{ height: '36px', width: 'auto', borderRadius: '50%', boxShadow: '0 4px 12px rgba(255, 221, 0, 0.3)' }}
                            />
                        </a>
                        <span className="tooltip-text">Support Manoj</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Steps Indicator */}
                {/* Dynamic Step Indicator */}
                {/* Dynamic Step Indicator - Visuals Hidden, kept for spacing */}
                {/* Dynamic Step Indicator - Visuals Hidden, kept for spacing */}
                <div className="steps-container" style={{
                    marginBottom: currentStep === 'search' ? '11rem' : '2rem',
                    height: '80px',
                    visibility: 'hidden',
                    transition: 'margin-bottom 0.5s ease-in-out'
                }}>
                    {/* Visual elements removed to rely on 3D background */}
                </div>

                {/* Error Alert */}
                <AnimatePresence>
                    {error && currentStep !== 'analysis' && (
                        <motion.div
                            initial={{ opacity: 0, y: -50, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: -50, x: '-50%' }}
                            className="alert"
                            style={{
                                position: 'fixed',
                                top: '2rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 100,
                                width: 'auto',
                                maxWidth: '90%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem 1.5rem',
                                background: 'rgba(23, 23, 23, 0.95)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid var(--color-error)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                color: 'var(--color-text-primary)'
                            }}
                        >
                            <AlertCircle size={24} color="var(--color-error)" />
                            {error.includes('buymeacoffee') ? (
                                <span style={{ fontSize: '0.95rem' }}>
                                    Server is busy due to high demand. Please help keep the servers running — {' '}
                                    <a
                                        href="https://buymeacoffee.com/manojthapa"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--color-warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                                    >
                                        <Coffee size={16} /> Buy me a coffee
                                    </a>
                                </span>
                            ) : (
                                <span>{error}</span>
                            )}
                            <button
                                onClick={() => setError(null)}
                                style={{
                                    marginLeft: '1rem',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'none'; }}
                            >
                                ×
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {/* Step 1: Job Search */}
                    {currentStep === 'search' && (
                        <motion.div
                            key="search"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                                <h1 className="hero-title">Find Your Next Role</h1>
                                <p className="hero-subtitle">Search for jobs, analyze your fit, and get a tailored application in seconds.</p>
                            </div>

                            <JobSearch key={searchKey} onSearch={handleJobSearch} loading={loading} />

                            {/* Loading Animation for Job Search */}
                            {loading && currentStep === 'search' && (
                                <motion.div
                                    className="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        marginTop: '3rem',
                                        textAlign: 'center',
                                        minHeight: '50vh',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Loader2 size={64} className="spinner" />
                                    <h2 className="hero-title" style={{ marginTop: '1.5rem', fontSize: '2.5rem' }}>Looking for jobs...</h2>
                                </motion.div>
                            )}

                            {!loading && (
                                <motion.div
                                    style={{ marginTop: '2rem' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <JobList
                                        jobs={jobs}
                                        selectedJob={selectedJob}
                                        onSelectJob={handleSelectJob}
                                        cvSkills={[]}
                                        postedFilter={postedFilter}
                                        setPostedFilter={setPostedFilter}
                                        hasSearched={hasSearched}
                                    />
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 2: CV Analysis */}
                    {currentStep === 'analysis' && selectedJob && (
                        <motion.div
                            key="analysis"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5 }}
                        >
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
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {loading ? (
                                <div className="loading" style={{ textAlign: 'center', padding: '0', perspective: '1000px', marginTop: '3rem', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                    {/* 3D Renovation Animation */}
                                    <div style={{ position: 'relative' }}>
                                        <motion.div
                                            animate={{ rotateY: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <FileText size={80} color="var(--color-primary)" strokeWidth={1.5} />
                                        </motion.div>
                                        <motion.div
                                            animate={{ y: [-5, 5, -5] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                            style={{
                                                position: 'absolute',
                                                bottom: -10,
                                                right: -25
                                            }}
                                        >
                                            <Hammer size={36} color="var(--color-primary)" />
                                        </motion.div>
                                    </div>
                                    <GenerationProgress type="cv" />
                                </div>
                            ) : (
                                <div>
                                    <div className="card fade-in" style={{
                                        marginBottom: '2rem',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        padding: '1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5rem',
                                        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: '4px',
                                            height: '100%',
                                            background: 'var(--color-success)',
                                            position: 'absolute',
                                            left: 0,
                                            top: 0
                                        }}></div>
                                        <div style={{
                                            background: 'var(--color-success)',
                                            borderRadius: '50%',
                                            width: '48px',
                                            height: '48px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
                                        }}>
                                            <CheckCircle size={28} color="#050b14" strokeWidth={3} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, color: 'var(--color-success)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                Optimization Complete! <Sparkles size={18} />
                                            </h3>
                                            <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-primary)' }}>
                                                Your documents are ready for <strong style={{ color: 'white' }}>{selectedJob?.title}</strong> at {selectedJob?.company}.
                                            </p>
                                        </div>
                                    </div>

                                    <DocumentPreview
                                        cv={generatedDocs.cv}
                                        textContent={generatedDocs.textContent}
                                        isPdf={generatedDocs.isPdf}
                                        onDownloadCV={handleDownloadCV}
                                        analysisResult={analysisResult}
                                        job={selectedJob}
                                        onBack={handleBackToSearch}
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer - hidden on preview step */}
            {
                currentStep !== 'preview' && <footer className="footer-responsive">
                    {/* Left: About Us */}
                    {/* Left: Footer Links */}
                    <div className="footer-left" style={{ display: 'flex', gap: '1.5rem' }}>
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); setCurrentStep('about'); }}
                            style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 600, opacity: 0.8 }}
                        >
                            About Us
                        </a>
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); setCurrentStep('reviews'); }}
                            style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 600, opacity: 0.8 }}
                        >
                            Reviews
                        </a>
                    </div>

                    {/* Center: Copyright */}
                    <div className="footer-center">
                        <p style={{ color: 'var(--color-text-muted)', margin: 0, opacity: 0.8, fontWeight: 600 }}>
                            &copy; NeuroArc 2025
                        </p>

                        <p style={{ color: 'var(--color-text-muted)', margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>
                            Privacy Notice: No data is stored. All CV analysis and optimization are processed in-memory.
                        </p>
                    </div>

                    {/* Right: BMC */}
                    <div className="footer-right">
                        <div className="tooltip-container footer-bmc">
                            <a href="https://www.buymeacoffee.com/manojthapa" target="_blank" rel="noopener noreferrer">
                                <img
                                    src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                                    alt="Buy Me A Coffee"
                                    style={{ height: '32px', width: 'auto' }}
                                />
                            </a>
                            <span className="tooltip-text">Support Manoj</span>
                        </div>
                    </div>
                </footer>
            }


        </div >
    );
}

export default App;
