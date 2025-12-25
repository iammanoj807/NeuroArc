import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, ArrowRight, Wrench, Briefcase, Search, Coffee, Trash2, X, BrainCircuit, FileSearch, Sparkles, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';

function CVAnalysis({ job, onAnalyze, onNext, onBack, upstreamError }) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dismissedError, setDismissedError] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1020);

    useEffect(() => {
        const handleResize = () => setIsSmallScreen(window.innerWidth < 1020);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Combine local and upstream errors (unless dismissed)
    const displayError = dismissedError ? null : (error || upstreamError);

    // Auto-analyze when file is set
    const startAnalysis = async (selectedFile) => {
        setFile(selectedFile);
        setError(null);
        setDismissedError(false); // Reset dismissed state
        setAnalyzing(true);

        try {
            const analysis = await onAnalyze(selectedFile, job);
            setResult(analysis);
        } catch (err) {
            setError(err.message || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];
            if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf') || selectedFile.name.endsWith('.docx')) {
                startAnalysis(selectedFile);
            } else {
                setError('Please upload a PDF or DOCX file.');
                setDismissedError(false);
            }
        }
    }, [job, onAnalyze]);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            startAnalysis(e.target.files[0]);
        }
    };

    const handleAnalyzeClick = async () => {
        if (!file) return;

        setAnalyzing(true);
        setError(null);
        setDismissedError(false);

        try {
            const analysis = await onAnalyze(file, job);
            setResult(analysis);
        } catch (err) {
            setError(err.message || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    if (result) {
        return (
            <div className="analysis-results fade-in">
                <div className="results-navigation" style={{ marginBottom: '2rem' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={onBack}
                        style={{
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            width: 'fit-content'
                        }}
                    >
                        <ArrowLeft size={18} /> Back to Search
                    </button>
                </div>

                {/* Show upstream error (e.g. optimization failed) */}
                {displayError && result && (
                    <div className="alert alert-error" style={{ marginBottom: '2rem', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', position: 'relative' }}>
                        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.95rem', lineHeight: 1.5, flex: 1 }}>
                            {displayError.includes('buymeacoffee') ? (
                                <span>
                                    Server is busy due to high demand. Please help keep the servers running — {' '}
                                    <a
                                        href="https://buymeacoffee.com/manojthapa"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--color-warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                        <Coffee size={16} /> Buy me a coffee
                                    </a>
                                </span>
                            ) : (
                                displayError
                            )}
                        </div>
                        <button
                            onClick={() => setDismissedError(true)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.7,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = 1}
                            onMouseLeave={(e) => e.target.style.opacity = 0.7}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Score & Header Section */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isSmallScreen ? '1fr' : 'minmax(250px, 1fr) 2fr',
                    gap: '2rem',
                    marginBottom: '2rem',
                    alignItems: 'stretch'
                }}>
                    {/* Score Card */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2.5rem' }}>
                        <div className="score-circle-container" style={{ position: 'relative', width: '180px', height: '180px', marginBottom: '1.5rem' }}>
                            {/* Glowing Background */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                background: `radial-gradient(circle at center, ${result.score >= 70 ? 'var(--color-success)' : (result.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)')} 0%, transparent 70%)`,
                                opacity: 0.15,
                                filter: 'blur(20px)'
                            }}></div>

                            {/* SVG Progress Circle */}
                            <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                                <circle
                                    cx="90"
                                    cy="90"
                                    r="80"
                                    fill="none"
                                    stroke="var(--color-bg-secondary)"
                                    strokeWidth="10"
                                />
                                <circle
                                    cx="90"
                                    cy="90"
                                    r="80"
                                    fill="none"
                                    stroke={result.score >= 70 ? 'var(--color-success)' : (result.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)')}
                                    strokeWidth="10"
                                    strokeDasharray={502}
                                    strokeDashoffset={502 - (502 * result.score) / 100}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                />
                            </svg>

                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                            }}>
                                <span style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>{result.score}%</span>
                                <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Match</span>
                            </div>
                        </div>
                    </div>

                    {/* Header Details Card */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                        <div style={{ marginBottom: 'auto' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '20px',
                                    background: result.domain_match === 'complete_mismatch'
                                        ? 'rgba(239, 68, 68, 0.1)'
                                        : result.domain_match === 'weak_match'
                                            ? 'rgba(245, 158, 11, 0.1)'
                                            : 'rgba(16, 185, 129, 0.1)',
                                    color: result.domain_match === 'complete_mismatch'
                                        ? 'var(--color-error)'
                                        : result.domain_match === 'weak_match'
                                            ? 'var(--color-warning)'
                                            : 'var(--color-success)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    border: `1px solid ${result.domain_match === 'complete_mismatch'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : result.domain_match === 'weak_match'
                                            ? 'rgba(245, 158, 11, 0.2)'
                                            : 'rgba(16, 185, 129, 0.2)'}`
                                }}>
                                    {result.domain_match === 'complete_mismatch' ? <AlertCircle size={14} /> : result.domain_match === 'weak_match' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                                    {result.domain_match === 'complete_mismatch' ? 'Field Mismatch' : result.domain_match === 'weak_match' ? 'Partial Match' : 'Strong Match'}
                                </div>
                            </div>
                            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>{job.title}</h2>
                            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                at <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{job.company}</span>
                            </p>
                        </div>
                        <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                            {result.domain_match === 'complete_mismatch' ? (
                                <>Your background is in a different field. Optimizing would be difficult without fabricating experience, but we can help you transition.</>
                            ) : result.domain_match === 'weak_match' ? (
                                <>You have transferable skills but need more specific experience. Focus on projects to bridge the gap.</>
                            ) : result.score >= 80 ? (
                                <>Excellent fit! Your profile closely matches the requirements. Minor tweaks can make you standout even more.</>
                            ) : (
                                <>Good foundation. Adding specific keywords and project experience will significantly boost your match score.</>
                            )}
                        </p>
                    </div>
                </div>

                <div className="skills-grid" style={{ display: 'grid', gridTemplateColumns: isSmallScreen ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Good Matches */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <CheckCircle size={24} /> Good Matches
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {result.matching_skills?.length > 0 ? (
                                result.matching_skills.map((skill, i) => (
                                    <span key={i} style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        borderRadius: '30px',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '0.95rem',
                                        fontWeight: 500
                                    }}>
                                        {skill}
                                    </span>
                                ))
                            ) : (
                                <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>No direct matches found.</span>
                            )}
                        </div>
                    </div>

                    {/* Missing / To Improve */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <AlertCircle size={24} /> Missing / To Improve
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {result.missing_skills?.length > 0 ? (
                                result.missing_skills.map((skill, i) => (
                                    <span key={i} style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(239, 68, 68, 0.05)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '30px',
                                        color: 'var(--color-text-secondary)',
                                        fontSize: '0.95rem'
                                    }}>
                                        {skill}
                                    </span>
                                ))
                            ) : result.score < 80 ? (
                                <span style={{ fontStyle: 'italic', color: 'var(--color-warning)' }}>
                                    No specific missing keywords, but experience gaps detected. Check <strong>Recommendations</strong> below.
                                </span>
                            ) : (
                                <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>None! Great job.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {result.project_recommendations && result.project_recommendations.length > 0 && result.domain_match !== 'complete_mismatch' && (
                    <div className="card" style={{ padding: '2rem', background: 'linear-gradient(to right, rgba(245, 158, 11, 0.05), transparent)' }}>
                        <h3 style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <Wrench size={24} />
                            {['Software Engineering', 'Data Science/AI'].includes(result.detected_industry) ? 'Recommended Projects' : 'Recommended Experience'}
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                            Strengthen your profile by gaining experience in these specific areas:
                        </p>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {result.project_recommendations.map((project, i) => (
                                <div key={i} style={{
                                    padding: '1rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '1rem'
                                }}>
                                    <span style={{ color: 'var(--color-warning)', fontWeight: 800 }}>{i + 1}.</span>
                                    <span style={{ color: 'var(--color-text-primary)' }}>{project}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Transition Plan (Mismatch) */}
                {result.domain_match === 'complete_mismatch' && (
                    <div className="card" style={{ marginTop: '2rem', padding: '2.5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: '56px', height: '56px', background: 'rgba(45, 212, 191, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--color-primary)' }}>
                                <Briefcase size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Transition Roadmap</h3>
                            <p style={{ color: 'var(--color-text-secondary)' }}>Steps to break into this field</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isSmallScreen ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {/* Roadmap Cards */}
                            {[
                                { title: 'Take Courses', desc: `Learn ${result.missing_skills?.slice(0, 2).join(', ')} online.` },
                                { title: 'Get Certified', desc: `Obtain certifications relevant to ${job.title}.` },
                                { title: 'Build Projects', desc: 'Create a portfolio to show hands-on skills.' },
                                { title: 'Start Junior', desc: 'Look for entry-level roles with training.' }
                            ].map((item, idx) => (
                                <div key={idx} className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ width: '28px', height: '28px', background: 'var(--color-primary)', borderRadius: '6px', color: '#050b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>{idx + 1}</div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>{item.title}</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="actions" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                    <button className="btn btn-secondary" style={{ background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px' }} onClick={() => { setFile(null); setResult(null); }}>
                        Upload Different CV
                    </button>
                    {result.domain_match !== 'complete_mismatch' ? (
                        <button
                            className="btn btn-secondary btn-lg no-hover-shadow"
                            onClick={onNext}
                            style={{ background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px', boxShadow: 'none' }}
                        >
                            Optimize CV
                        </button>
                    ) : (
                        <button className="btn btn-secondary" style={{ background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px' }} onClick={onBack}>
                            Find a Better Match
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Floating "Analyzing" State
    if (analyzing) {
        return (
            <div className="loading" style={{ textAlign: 'center', padding: '0', perspective: '1000px', marginTop: '3rem', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <motion.div
                        animate={{ rotateY: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <FileText size={80} color="var(--color-primary)" strokeWidth={1.5} />
                    </motion.div>
                    <motion.div
                        animate={{
                            y: [-5, 5, -5]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            position: 'absolute',
                            bottom: -10,
                            right: -25
                        }}
                    >
                        <ScanLine size={28} color="var(--color-primary)" />
                    </motion.div>
                </div>
                <h2 className="hero-title" style={{ marginTop: '1.5rem', fontSize: '2.5rem' }}>
                    Analyzing Your CV...
                </h2>
            </div>
        );
    }

    return (
        <div className="cv-upload-container card fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem', position: 'relative' }}>
            <button
                className="btn btn-ghost"
                onClick={onBack}
                style={{
                    position: 'absolute',
                    top: '1.5rem',
                    left: '1.5rem',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem'
                }}
            >
                <ArrowLeft size={18} /> Back
            </button>

            <div style={{ marginBottom: '2rem' }}>
                <div style={{ height: '5rem' }}></div>
                <h2>Analyze your fit for {job.title}</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>at {job.company}</p>
            </div>

            {/* Error Alert - shown at top */}
            {displayError && (
                <div className="alert alert-error" style={{ marginBottom: '1.5rem', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', position: 'relative' }}>
                    <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.95rem', lineHeight: 1.5, flex: 1 }}>
                        {displayError.includes('buymeacoffee') ? (
                            <span>
                                Server is busy due to high demand. Please help keep the servers running — {' '}
                                <a
                                    href="https://buymeacoffee.com/manojthapa"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--color-warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                    <Coffee size={16} /> Buy me a coffee
                                </a>
                            </span>
                        ) : (
                            displayError
                        )}
                    </div>
                    <button
                        onClick={() => { setError(null); setDismissedError(true); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = 1}
                        onMouseLeave={(e) => e.target.style.opacity = 0.7}
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            <div
                className={`dropzone ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                    border: isDragging ? '2px dashed var(--color-primary)' : 'none',
                    borderRadius: '12px',
                    padding: '3rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isDragging ? 'rgba(45, 212, 191, 0.05)' : 'transparent',
                }}
            >
                {!file ? (
                    <>
                        <Upload size={64} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                        <h3>Drop your CV here</h3>
                        <p style={{ margin: '1rem 0', color: 'var(--color-text-muted)' }}>or</p>
                        <label className="btn btn-secondary">
                            Browse Files
                            <input type="file" onChange={handleFileSelect} accept=".pdf,.docx" hidden />
                        </label>
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Supported formats: PDF, DOCX</p>
                    </>
                ) : (
                    <div className="file-preview">
                        <FileText size={48} style={{ color: 'var(--color-primary)' }} />
                        <h3 style={{ marginTop: '1rem' }}>{file.name}</h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            style={{
                                marginTop: '1rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                margin: '1rem auto 0'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Trash2 size={18} /> Remove File
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}

export default CVAnalysis;
