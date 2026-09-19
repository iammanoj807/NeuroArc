import { useState, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, AlertTriangle, ArrowLeft, Lightbulb, Compass, Search, Trash2, X, Sparkles, ScanLine, RefreshCw, ShieldCheck } from 'lucide-react';
import GenerationProgress from './GenerationProgress';
import ErrorMessage from './ErrorMessage';

const RING_RADIUS = 66;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CVAnalysis({ job, onAnalyze, onNext, onBack, upstreamError }) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dismissedError, setDismissedError] = useState(false);

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

    const errorAlert = displayError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} />
            <div className="alert-body">
                <ErrorMessage message={displayError} />
            </div>
            <button
                className="alert-close"
                onClick={() => { setError(null); setDismissedError(true); }}
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    );

    const backButton = (
        <div className="page-toolbar">
            <button className="back-link" onClick={onBack}>
                <ArrowLeft size={16} /> Back to jobs
            </button>
        </div>
    );

    if (result) {
        const tone = result.score >= 70 ? 'success' : (result.score >= 50 ? 'warning' : 'danger');
        const match = result.domain_match === 'complete_mismatch'
            ? { tone: 'danger', label: 'Field mismatch', Icon: AlertCircle }
            : result.domain_match === 'weak_match'
                ? { tone: 'warning', label: 'Partial match', Icon: AlertTriangle }
                : { tone: 'success', label: 'Strong match', Icon: CheckCircle2 };

        return (
            <div className="analysis-results fade-in">
                {backButton}

                {/* Show upstream error (e.g. optimization failed) */}
                {errorAlert}

                {/* Score & Header Section */}
                <div className="analysis-top">
                    {/* Score Card */}
                    <div className="card score-card">
                        <div className="score-ring">
                            <svg width="100%" height="100%" viewBox="0 0 148 148">
                                <circle cx="74" cy="74" r={RING_RADIUS} fill="none" strokeWidth="10" className="score-ring-track" />
                                <circle
                                    cx="74"
                                    cy="74"
                                    r={RING_RADIUS}
                                    fill="none"
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    className={`score-ring-value tone-${tone}`}
                                    strokeDasharray={RING_CIRCUMFERENCE}
                                    strokeDashoffset={RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * result.score) / 100}
                                />
                            </svg>
                            <div className="score-ring-label">
                                <span className="score-number">{result.score}%</span>
                                <span className="score-caption">Match</span>
                            </div>
                        </div>
                        <p className="score-hint">ATS match score for this role</p>
                    </div>

                    {/* Header Details Card */}
                    <div className="card role-card">
                        <span className={`badge badge-${match.tone}`}>
                            <match.Icon size={14} /> {match.label}
                        </span>
                        <div>
                            <h2 className="role-title">{job.title}</h2>
                            <p className="role-company">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                        </div>
                        <p className="role-summary">
                            {result.domain_match === 'complete_mismatch' ? (
                                <>Your background is in a different field. Optimizing would be difficult without fabricating experience, but we can help you transition.</>
                            ) : result.domain_match === 'weak_match' ? (
                                <>You have transferable skills but need more specific experience. Focus on projects to bridge the gap.</>
                            ) : result.score >= 80 ? (
                                <>Excellent fit. Your profile closely matches the requirements, and minor tweaks can make you stand out even more.</>
                            ) : (
                                <>Good foundation. Adding specific keywords and project experience will significantly boost your match score.</>
                            )}
                        </p>
                    </div>
                </div>

                <div className="two-col">
                    {/* Good Matches */}
                    <div className="card">
                        <h3 className="panel-title">
                            <CheckCircle2 size={18} className="tone-success" /> Matching skills
                            <span className="count">{result.matching_skills?.length || 0}</span>
                        </h3>
                        <div className="tag-list">
                            {result.matching_skills?.length > 0 ? (
                                result.matching_skills.map((skill, i) => (
                                    <span key={i} className="tag tag-success">{skill}</span>
                                ))
                            ) : (
                                <span className="panel-empty">No direct matches found.</span>
                            )}
                        </div>
                    </div>

                    {/* Missing / To Improve */}
                    <div className="card">
                        <h3 className="panel-title">
                            <AlertCircle size={18} className="tone-danger" /> Missing or to improve
                            <span className="count">{result.missing_skills?.length || 0}</span>
                        </h3>
                        <div className="tag-list">
                            {result.missing_skills?.length > 0 ? (
                                result.missing_skills.map((skill, i) => (
                                    <span key={i} className="tag tag-danger">{skill}</span>
                                ))
                            ) : result.score < 80 ? (
                                <span className="panel-empty warning">
                                    No specific missing keywords, but experience gaps were detected. See the recommendations below.
                                </span>
                            ) : (
                                <span className="panel-empty">Nothing missing. Great job.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {result.project_recommendations && result.project_recommendations.length > 0 && result.domain_match !== 'complete_mismatch' && (
                    <div className="card">
                        <h3 className="panel-title" style={{ marginBottom: '0.25rem' }}>
                            <Lightbulb size={18} className="tone-warning" />
                            {['Software Engineering', 'Data Science/AI'].includes(result.detected_industry) ? 'Recommended projects' : 'Recommended experience'}
                        </h3>
                        <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
                            Strengthen your profile by gaining experience in these specific areas.
                        </p>
                        <ol className="rec-list">
                            {result.project_recommendations.map((project, i) => (
                                <li key={i} className="rec-item">
                                    <span className="rec-index">{String(i + 1).padStart(2, '0')}</span>
                                    <span>{project}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Transition Plan (Mismatch) */}
                {result.domain_match === 'complete_mismatch' && (
                    <div className="card">
                        <h3 className="panel-title" style={{ marginBottom: '0.25rem' }}>
                            <Compass size={18} /> Transition roadmap
                        </h3>
                        <p className="card-subtitle" style={{ marginBottom: '1rem' }}>Steps to break into this field</p>
                        <div className="roadmap-grid">
                            {[
                                { title: 'Take courses', desc: `Learn ${result.missing_skills?.slice(0, 2).join(', ')} online.` },
                                { title: 'Get certified', desc: `Obtain certifications relevant to ${job.title}.` },
                                { title: 'Build projects', desc: 'Create a portfolio to show hands-on skills.' },
                                { title: 'Start junior', desc: 'Look for entry-level roles with training.' }
                            ].map((item, idx) => (
                                <div key={idx} className="roadmap-item">
                                    <span className="step-index">{idx + 1}</span>
                                    <h4>{item.title}</h4>
                                    <p>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="actions-bar">
                    <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); }}>
                        <RefreshCw size={16} /> Upload a different CV
                    </button>
                    {result.domain_match !== 'complete_mismatch' ? (
                        <button className="btn btn-primary" onClick={onNext}>
                            <Sparkles size={16} /> Generate tailored CV
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={onBack}>
                            <Search size={16} /> Find a better match
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // "Analyzing" State
    if (analyzing) {
        return (
            <div className="card progress-panel fade-in">
                <div className="progress-panel-icon"><ScanLine size={22} /></div>
                <h2>Analyzing your CV</h2>
                <p>Checking your fit for {job.title} at {job.company}</p>
                <GenerationProgress type="analysis" />
            </div>
        );
    }

    return (
        <div className="upload-layout fade-in">
            {backButton}

            <div className="card upload-card">
                <div className="job-summary">
                    <div className="company-avatar" aria-hidden="true">
                        {(job.company || '?').trim().charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="job-summary-label">Selected job</div>
                        <div className="job-summary-title">{job.title}</div>
                        <div className="job-summary-company">{job.company}{job.location ? ` · ${job.location}` : ''}</div>
                    </div>
                </div>

                <div className="upload-body">
                    <h2>Upload your CV</h2>
                    <p>We'll compare it with this job description and show your match score, matching skills and gaps.</p>

                    {/* Error Alert - shown at top */}
                    {errorAlert}

                    <div
                        className={`dropzone ${isDragging ? 'dragging' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {!file ? (
                            <>
                                <div className="dropzone-icon"><UploadCloud size={22} /></div>
                                <h3>Drag and drop your CV here</h3>
                                <p>or</p>
                                <label className="btn btn-secondary">
                                    Browse files
                                    <input type="file" onChange={handleFileSelect} accept=".pdf,.docx" hidden />
                                </label>
                                <p>PDF or DOCX</p>
                            </>
                        ) : (
                            <div className="file-preview">
                                <div className="dropzone-icon"><FileText size={22} /></div>
                                <h3>{file.name}</h3>
                                <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <div className="file-actions">
                                    <button className="btn btn-primary btn-sm" onClick={handleAnalyzeClick}>
                                        <RefreshCw size={15} /> Try again
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                        <Trash2 size={15} /> Remove file
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="upload-note">
                        <ShieldCheck size={14} /> Your CV is processed in memory and never stored.
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CVAnalysis;
