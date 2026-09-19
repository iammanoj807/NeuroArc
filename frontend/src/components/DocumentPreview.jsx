import { useState, useEffect } from 'react';
import { Download, FileText, Check, ExternalLink, Eye, Search, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BarChart3 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Core PDF.js styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MOBILE_BREAKPOINT = 1100;

function DocumentPreview({ cv, textContent, isPdf, onDownloadCV, analysisResult, scoreBefore, job, onBack }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    const tone = analysisResult?.score >= 80 ? 'success' : 'warning';
    const gained = scoreBefore != null && analysisResult?.score > scoreBefore ? analysisResult.score - scoreBefore : 0;

    // Optimization report sidebar (also the whole view on mobile)
    const report = (
        <div className="card report-card fade-in">
            <div className="card-header">
                <h3 className="card-title"><BarChart3 size={16} /> Optimization report</h3>
            </div>
            <div className="report-body">
                {analysisResult && (
                    <>
                        <div>
                            <div className="stat-label">Match score</div>
                            <div className="stat-row">
                                <span className={`stat-value tone-${tone}`}>{analysisResult.score}%</span>
                                {gained > 0 && <span className="stat-delta">+{gained} from {scoreBefore}%</span>}
                            </div>
                            <div className={`meter tone-${tone}`}>
                                <div className="meter-fill" style={{ width: `${analysisResult.score}%` }} />
                            </div>
                        </div>

                        {analysisResult.matching_skills?.length > 0 && (
                            <div>
                                <div className="stat-label">Skills highlighted</div>
                                <ul className="check-list">
                                    {analysisResult.matching_skills.slice(0, 8).map((skill, i) => (
                                        <li key={i}><Check size={14} /> {skill}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                <div className="report-actions">
                    {isMobile && isPdf && (
                        <a href={cv} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-block">
                            <Eye size={16} /> View CV
                        </a>
                    )}
                    <button className="btn btn-primary btn-block" onClick={onDownloadCV}>
                        <Download size={16} /> Download CV
                    </button>
                    {job && (
                        <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-block">
                            <ExternalLink size={16} /> Apply for this job
                        </a>
                    )}
                    <button className="btn btn-ghost btn-block" onClick={onBack}>
                        <Search size={16} /> Find another job
                    </button>
                </div>
            </div>
        </div>
    );

    // Mobile Layout - report and actions without embedded PDF
    if (isMobile) {
        return (
            <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                {report}
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="preview-layout">
            {/* Sidebar / Stats */}
            {report}

            {/* Document Preview (React-PDF) */}
            <div className="card viewer fade-in">
                <div className="viewer-toolbar">
                    <span className="card-title">
                        <FileText size={16} /> Tailored CV
                        {isPdf && numPages && (
                            <span className="muted" style={{ fontWeight: 400, fontSize: '0.8125rem' }}>
                                · Page {pageNumber} of {numPages}
                            </span>
                        )}
                    </span>
                    {isPdf && (
                        <div className="viewer-tools">
                            <button
                                className="icon-btn"
                                onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                                disabled={scale <= 0.6}
                                aria-label="Zoom out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="zoom-value">{Math.round(scale * 100)}%</span>
                            <button
                                className="icon-btn"
                                onClick={() => setScale(s => Math.min(2.0, s + 0.2))}
                                disabled={scale >= 2.0}
                                aria-label="Zoom in"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <div className="toolbar-sep" />
                            <a href={cv} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Open in new tab" title="Open in new tab">
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    )}
                </div>

                <div className="viewer-body">
                    {isPdf ? (
                        <Document
                            file={cv}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div className="viewer-message">Loading preview…</div>}
                            error={
                                <div className="viewer-message">
                                    <p>Couldn't load the PDF preview.</p>
                                    <a href={cv} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                        Download instead
                                    </a>
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                canvasBackground="white"
                            />
                        </Document>
                    ) : (
                        <div className="text-preview">
                            {textContent}
                        </div>
                    )}
                </div>

                {isPdf && numPages && numPages > 1 && (
                    <div className="viewer-footer">
                        <button
                            className="btn btn-secondary btn-sm"
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => p - 1)}
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <span className="zoom-value">{pageNumber} / {numPages}</span>
                        <button
                            className="btn btn-secondary btn-sm"
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(p => p + 1)}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentPreview;
