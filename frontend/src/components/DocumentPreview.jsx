import { useState, useEffect } from 'react';
import { Download, FileText, Check, ExternalLink, Sparkles, AlertTriangle, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Core PDF.js styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function DocumentPreview({ cv, textContent, isPdf, onDownloadCV, analysisResult, job, onBack }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1235);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1235);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    // Mobile Layout - stacked without embedded PDF
    if (isMobile) {
        return (
            <div className="preview-container-mobile fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1rem' }}>
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
                                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Skills Added</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {analysisResult.matching_skills.slice(0, 6).map((skill, i) => (
                                                <span key={i} style={{ padding: '0.25rem 0.75rem', background: 'rgba(45, 212, 191, 0.1)', border: '1px solid rgba(45, 212, 191, 0.3)', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                                                    <Check size={12} style={{ marginRight: '0.25rem' }} /> {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {isPdf && (
                                <a href={cv} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full" style={{ justifyContent: 'center' }}>
                                    View CV PDF
                                </a>
                            )}
                            <button className="btn btn-secondary btn-full" onClick={onDownloadCV} style={{ justifyContent: 'center' }}>
                                Download CV
                            </button>
                            {job && (
                                <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full" style={{ justifyContent: 'center' }}>
                                    Apply
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop Layout
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
                                <div className="stat-item" style={{ marginBottom: '1rem' }}>
                                    <label>New Match Score</label>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: analysisResult.score >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                        {analysisResult.score}%
                                    </div>
                                    <div style={{ width: '100%', background: 'var(--color-bg-secondary)', height: '6px', borderRadius: '3px', marginTop: '0.5rem' }}>
                                        <div style={{ width: `${analysisResult.score}%`, background: analysisResult.score >= 80 ? 'var(--color-success)' : 'var(--color-warning)', height: '100%', borderRadius: '3px' }}></div>
                                    </div>
                                </div>
                                <div className="stat-list">
                                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>skills added</h4>
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {analysisResult.matching_skills?.slice(0, 8).map((skill, i) => (
                                            <li key={i} style={{ padding: '0.25rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Check size={14} color="var(--color-success)" /> {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button className="btn btn-secondary btn-full" onClick={onDownloadCV}>Download CV</button>
                            {job && (
                                <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full" style={{ textAlign: 'center' }}>
                                    Apply
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Preview (React-PDF) */}
            <div className="document-viewer card fade-in" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="viewer-header" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} /> Generated Application
                        </span>
                        {isPdf && numPages && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Page {pageNumber} of {numPages}
                            </span>
                        )}
                    </div>
                    {isPdf && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button className="btn btn-sm btn-icon" onClick={() => setScale(s => Math.max(0.6, s - 0.2))} disabled={scale <= 0.6}>
                                <ZoomOut size={16} />
                            </button>
                            <span style={{ fontSize: '0.85rem', minWidth: '3ch', textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
                            <button className="btn btn-sm btn-icon" onClick={() => setScale(s => Math.min(2.0, s + 0.2))} disabled={scale >= 2.0}>
                                <ZoomIn size={16} />
                            </button>
                            <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 0.5rem' }}></div>
                            <a href={cv} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-text">
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, background: '#525659', position: 'relative', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    {isPdf ? (
                        <Document
                            file={cv}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div style={{ color: 'white' }}>Loading PDF...</div>}
                            error={<div style={{ color: 'white', textAlign: 'center' }}>
                                <p>Failed to load PDF preview.</p>
                                <a href={cv} target="_blank" className="btn btn-primary" style={{ marginTop: '1rem' }}>Download Instead</a>
                            </div>}
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                canvasBackground="white"
                                className="pdf-page-shadow"
                            />
                        </Document>
                    ) : (
                        <div style={{ padding: '2rem', width: '100%', maxWidth: '800px', background: 'white', color: 'black', fontFamily: 'monospace', whiteSpace: 'pre-wrap', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            {textContent}
                        </div>
                    )}
                </div>

                {isPdf && numPages && numPages > 1 && (
                    <div style={{ padding: '0.75rem', background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <button className="btn btn-sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <button className="btn btn-sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)}>
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentPreview;
