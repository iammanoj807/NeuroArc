import { useState, useEffect } from 'react';
import { Download, FileText, Check, ExternalLink, Sparkles, AlertTriangle, Eye } from 'lucide-react';

function DocumentPreview({ cv, textContent, isPdf, onDownloadCV, analysisResult, job, onBack }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1235);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1235);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Mobile Layout - stacked without embedded PDF
    if (isMobile) {
        return (
            <div className="preview-container-mobile fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1rem' }}>
                {/* Optimization Report Card */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={20} color="var(--color-primary)" /> Optimization Report
                        </h3>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {analysisResult && (
                            <>
                                <div className="stat-item" style={{ marginBottom: '1.5rem' }}>
                                    <label>New Match Score</label>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: analysisResult.score >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                        {analysisResult.score}%
                                    </div>
                                    <div style={{ width: '100%', background: 'var(--color-bg-secondary)', height: '6px', borderRadius: '3px', marginTop: '0.5rem' }}>
                                        <div style={{ width: `${analysisResult.score}%`, background: analysisResult.score >= 80 ? 'var(--color-success)' : 'var(--color-warning)', height: '100%', borderRadius: '3px' }}></div>
                                    </div>
                                </div>

                                {analysisResult.matching_skills?.length > 0 && (
                                    <div className="stat-list" style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                                            Skills Added
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {analysisResult.matching_skills.slice(0, 6).map((skill, i) => (
                                                <span key={i} style={{ padding: '0.25rem 0.75rem', background: 'rgba(45, 212, 191, 0.1)', border: '1px solid rgba(45, 212, 191, 0.3)', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                                                    <Check size={12} style={{ marginRight: '0.25rem' }} /> {skill}
                                                </span>
                                            ))}
                                            {analysisResult.matching_skills.length > 6 && (
                                                <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    +{analysisResult.matching_skills.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {isPdf && (
                                <a
                                    href={cv}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-full"
                                    style={{ justifyContent: 'center', background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px' }}
                                >
                                    View CV
                                </a>
                            )}

                            <button className="btn btn-secondary btn-full" onClick={onDownloadCV} style={{ justifyContent: 'center', background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px' }}>
                                Download CV
                            </button>

                            {job && (
                                <a
                                    href={job.redirect_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-full"
                                    style={{ justifyContent: 'center', background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px' }}
                                >
                                    Apply
                                </a>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop Layout - side by side with embedded PDF
    return (
        <div className="preview-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem', minHeight: '500px', maxHeight: 'calc(100vh - 250px)', paddingBottom: '2rem' }}>

            {/* Sidebar / Stats */}
            <div className="preview-sidebar fade-in">
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={20} color="var(--color-primary)" /> Optimization Report
                        </h3>
                    </div>

                    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                        {analysisResult && (
                            <>
                                <div className="stat-item" style={{ marginBottom: '1.5rem' }}>
                                    <label>New Match Score</label>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: analysisResult.score === 100 ? 'var(--color-success)' : (analysisResult.score >= 80 ? 'var(--color-success)' : 'var(--color-warning)') }}>
                                        {analysisResult.score}%
                                    </div>
                                    <div style={{ width: '100%', background: 'var(--color-bg-secondary)', height: '6px', borderRadius: '3px', marginTop: '0.5rem' }}>
                                        <div style={{ width: `${analysisResult.score}%`, background: analysisResult.score === 100 ? 'var(--color-success)' : (analysisResult.score >= 80 ? 'var(--color-success)' : 'var(--color-warning)'), height: '100%', borderRadius: '3px' }}></div>
                                    </div>

                                    {/* Why not 100%? Explanation - Show whenever score is below 100 */}
                                    {analysisResult.score < 100 ? (
                                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                                            <div style={{ color: 'var(--color-warning)', fontWeight: 600, marginBottom: '0.25rem' }}>
                                                Why not 100%?
                                            </div>
                                            <div style={{ color: 'var(--color-text-secondary)' }}>
                                                {analysisResult.missing_skills && analysisResult.missing_skills.length > 0 ? (
                                                    ['Software Engineering', 'Data Science/AI'].includes(analysisResult.detected_industry) ? (
                                                        <>You need projects demonstrating: {analysisResult.missing_skills.slice(0, 3).join(', ')}{analysisResult.missing_skills.length > 3 ? ` + ${analysisResult.missing_skills.length - 3} more` : ''}</>
                                                    ) : (
                                                        <>You need experience demonstrating: {analysisResult.missing_skills.slice(0, 3).join(', ')}{analysisResult.missing_skills.length > 3 ? ` + ${analysisResult.missing_skills.length - 3} more` : ''}</>
                                                    )
                                                ) : (
                                                    ['Software Engineering', 'Data Science/AI'].includes(analysisResult.detected_industry) ? (
                                                        <>Build more projects with relevant technologies to reach 100%. The job requires specific experience we couldn't add without fabricating.</>
                                                    ) : (
                                                        <>Gain more experience in relevant areas to reach 100%. The job requires specific experience we couldn't add without fabricating.</>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '0.75rem', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 500 }}>
                                            ✨ Perfect match! All required skills covered.
                                        </div>
                                    )}
                                </div>

                                <div className="stat-list">
                                    <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                                        skills added
                                    </h4>
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {analysisResult.matching_skills?.slice(0, 6).map((skill, i) => (
                                            <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Check size={14} color="var(--color-success)" /> {skill}
                                            </li>
                                        ))}
                                        {analysisResult.matching_skills?.length > 6 && (
                                            <li style={{ padding: '0.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                + {analysisResult.matching_skills.length - 6} more
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                {/* Remaining Gaps - What couldn't be added */}
                                {analysisResult.missing_skills && analysisResult.missing_skills.length > 0 && (
                                    <div className="remaining-gaps" style={{ marginTop: '1.5rem' }}>
                                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-warning)' }}>
                                            <AlertTriangle size={14} style={{ marginRight: '0.5rem' }} />
                                            Gaps Remaining
                                        </h4>

                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                            {analysisResult.missing_skills.slice(0, 4).map((skill, i) => (
                                                <li key={i} style={{ padding: '0.4rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                                    • {skill}
                                                </li>
                                            ))}
                                            {analysisResult.missing_skills.length > 4 && (
                                                <li style={{ padding: '0.4rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                    + {analysisResult.missing_skills.length - 4} more
                                                </li>
                                            )}
                                        </ul>

                                        {/* Industry-specific improvement suggestions */}
                                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                                            <div style={{ color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                                                💡 How to improve:
                                            </div>
                                            <div style={{ color: 'var(--color-text-secondary)' }}>
                                                {['Software Engineering', 'Data Science/AI'].includes(analysisResult.detected_industry) ? (
                                                    <>Build personal projects or contribute to open-source to demonstrate: <strong>{analysisResult.missing_skills.slice(0, 2).join(', ')}</strong></>
                                                ) : analysisResult.detected_industry === 'Healthcare' ? (
                                                    <>Gain hands-on experience through clinical rotations, CPD courses, or volunteering to demonstrate: <strong>{analysisResult.missing_skills.slice(0, 2).join(', ')}</strong></>
                                                ) : analysisResult.detected_industry === 'Finance' ? (
                                                    <>Consider relevant certifications (CFA, ACCA) or internships to demonstrate: <strong>{analysisResult.missing_skills.slice(0, 2).join(', ')}</strong></>
                                                ) : analysisResult.detected_industry === 'Marketing' ? (
                                                    <>Run personal campaigns, get Google/HubSpot certifications to demonstrate: <strong>{analysisResult.missing_skills.slice(0, 2).join(', ')}</strong></>
                                                ) : (
                                                    <>Seek internships, certifications, or volunteering opportunities to demonstrate: <strong>{analysisResult.missing_skills.slice(0, 2).join(', ')}</strong></>
                                                )}
                                            </div>
                                        </div>

                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                            We don't fabricate details. Gain real experience to close these gaps.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button className="btn btn-secondary btn-full" style={{ background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px' }} onClick={onDownloadCV}>
                                Download CV
                            </button>

                            {job && (
                                <a
                                    href={job.redirect_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-full"
                                    style={{ background: 'rgba(10, 22, 37, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '12px' }}
                                >
                                    Apply
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Preview */}
            <div className="document-viewer card fade-in" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="viewer-header" style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-secondary)' }}>
                    <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} /> Generated Application
                    </span>
                    {isPdf && (
                        <a href={cv} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-text">
                            <ExternalLink size={14} /> Open in New Tab
                        </a>
                    )}
                </div>

                <div style={{ flex: 1, background: '#525659', position: 'relative' }}>
                    {isPdf ? (
                        <object
                            data={cv}
                            type="application/pdf"
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                        >
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                <p style={{ marginBottom: '1rem' }}>PDF preview is blocked by your browser.</p>
                                <a
                                    href={cv}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                >
                                    <ExternalLink size={16} /> Open PDF in New Tab
                                </a>
                            </div>
                        </object>
                    ) : (
                        <div style={{ padding: '2rem', height: '100%', overflowY: 'auto', background: 'white', color: 'black', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                            {textContent}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DocumentPreview;
