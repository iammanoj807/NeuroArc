import { useState, useEffect, useRef } from 'react';
import { MapPin, Banknote, Clock, ChevronLeft, ChevronRight, ChevronDown, Check, SearchX, ExternalLink, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

const DATE_FILTERS = [
    { value: 'all', label: 'Any time' },
    { value: 'today', label: 'Past 24 hours' },
    { value: '3days', label: 'Past 3 days' },
    { value: 'week', label: 'Past week' },
    { value: 'month', label: 'Past month' }
];

// Placeholder grid shown while jobs are loading
export function JobListSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading jobs">
            <div className="results-header">
                <div className="skeleton" style={{ width: 140, height: 22 }} />
                <div className="skeleton" style={{ width: 170, height: 38, borderRadius: 'var(--radius)' }} />
            </div>
            <div className="job-grid">
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="card job-card skeleton-card">
                        <div className="skeleton" style={{ width: '75%', height: 18 }} />
                        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                            <div className="skeleton" style={{ width: 36, height: 36 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div className="skeleton" style={{ width: '50%', height: 12 }} />
                                <div className="skeleton" style={{ width: '35%', height: 12 }} />
                            </div>
                        </div>
                        <div className="skeleton" style={{ width: '100%', height: 12 }} />
                        <div className="skeleton" style={{ width: '85%', height: 12 }} />
                        <div className="job-card-footer">
                            <div className="skeleton" style={{ flex: 1, height: 34 }} />
                            <div className="skeleton" style={{ width: 72, height: 34 }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function JobList({ jobs, selectedJob, onSelectJob, cvSkills = [], postedFilter, setPostedFilter, hasSearched }) {
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 400);

    useEffect(() => {
        const handleResize = () => setIsSmallScreen(window.innerWidth < 400);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter jobs based on posted date
    const getFilteredJobs = () => {
        if (!jobs) return [];

        const now = new Date();
        return jobs.filter(job => {
            if (postedFilter === 'all') return true;

            // Use 'created' field (ISO date from backend)
            const postedDate = new Date(job.created);
            if (isNaN(postedDate.getTime())) return true; // Skip if invalid date

            const diffTime = now - postedDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (postedFilter === 'today') return diffDays <= 1;
            if (postedFilter === '3days') return diffDays <= 3;
            if (postedFilter === 'week') return diffDays <= 7;
            if (postedFilter === 'month') return diffDays <= 30;

            return true;
        });
    };

    const filteredJobs = getFilteredJobs();

    // Helper to format salary - use backend's salary_display or format manually
    const formatSalary = (job) => {
        if (job.salary_display && job.salary_display !== 'Salary not specified') {
            return job.salary_display;
        }
        if (!job.salary_min && !job.salary_max) return 'Competitive';
        const curr = '£';
        if (job.salary_min && job.salary_max) {
            return `${curr}${job.salary_min.toLocaleString()} - ${curr}${job.salary_max.toLocaleString()}`;
        }
        if (job.salary_min) return `${curr}${job.salary_min.toLocaleString()}+`;
        return `Up to ${curr}${job.salary_max.toLocaleString()}`;
    };

    // Helper to format date with relative display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    // Helper to strip HTML and decode entities
    const stripHtml = (html) => {
        if (!html) return '';
        // First decode common entities
        const decoded = html
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&nbsp;/g, ' ');

        // Then strip tags
        return decoded.replace(/<[^>]*>?/gm, '');
    };

    // Helper to clean snippet - removes redundant title/salary info from start
    const cleanSnippet = (description, title) => {
        if (!description) return '';
        let text = stripHtml(description).trim();

        // If the description starts with the job title (or part of it), skip past it
        const titleWords = title?.toLowerCase().split(/\s+/).slice(0, 3).join(' ') || '';
        const textLower = text.toLowerCase();

        if (titleWords && textLower.startsWith(titleWords)) {
            // Find where the actual description starts (after dashes, colons, or similar)
            const afterTitle = text.substring(titleWords.length);
            const match = afterTitle.match(/^[\s\-–—:,]+(.+)/s);
            if (match) {
                text = match[1].trim();
            }
        }

        // Also skip common preamble patterns like "Role:", "Job Title:", etc.
        text = text.replace(/^(Role|Position|Job Title|Job Description|About the Role|Overview|Summary|Description)[\s:–-]+/i, '');

        return text;
    };

    // Pagination
    const JOBS_PER_PAGE = 9;
    const [currentPage, setCurrentPage] = useState(1);
    const maxPages = isSmallScreen ? 3 : 5;
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close the date filter when clicking outside it
    useEffect(() => {
        if (!isDropdownOpen) return;
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isDropdownOpen]);

    // Reset page when filter changes or jobs change
    const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
    const validPage = Math.min(currentPage, totalPages || 1);

    const startIndex = (validPage - 1) * JOBS_PER_PAGE;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);

    const goToPage = (page) => {
        setCurrentPage(page);
        document.querySelector('.results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 }
    };

    const currentFilterLabel = DATE_FILTERS.find(f => f.value === postedFilter)?.label;

    return (
        <div className="job-list-container">
            {/* Controls / Filter Bar */}
            <div className="results-header">
                <h2 className="results-count">
                    {filteredJobs.length.toLocaleString()} <span>{filteredJobs.length === 1 ? 'job' : 'jobs'} found</span>
                </h2>

                <div className="dropdown" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`btn btn-secondary btn-sm dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                        aria-haspopup="listbox"
                        aria-expanded={isDropdownOpen}
                    >
                        <CalendarDays size={15} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{currentFilterLabel}</span>
                        <ChevronDown size={15} />
                    </button>

                    {isDropdownOpen && (
                        <div className="dropdown-menu" role="listbox">
                            {DATE_FILTERS.map(option => (
                                <button
                                    key={option.value}
                                    role="option"
                                    aria-selected={postedFilter === option.value}
                                    onClick={() => {
                                        setPostedFilter(option.value);
                                        setCurrentPage(1);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`dropdown-item ${postedFilter === option.value ? 'selected' : ''}`}
                                >
                                    {option.label}
                                    {postedFilter === option.value && <Check size={15} />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <motion.div
                className="job-grid"
                variants={container}
                initial="hidden"
                animate="show"
                key={`${postedFilter}-${validPage}`}
            >
                {filteredJobs.length === 0 ? (
                    <div className="card empty-state">
                        <div className="empty-icon"><SearchX size={22} /></div>
                        <h3>No jobs match your criteria</h3>
                        <p>Try different keywords or location, or widen the date posted filter.</p>
                    </div>
                ) : (
                    paginatedJobs.map(job => {
                        const snippet = cleanSnippet(job.description, job.title);

                        return (
                            <motion.article
                                key={job.id}
                                variants={item}
                                className={`card job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                                onClick={() => onSelectJob(job)}
                            >
                                <div className="job-card-top">
                                    <h3 className="job-title">{job.title}</h3>
                                    <span className="job-date">{formatDate(job.created)}</span>
                                </div>

                                <div className="job-company">
                                    <div className="company-avatar" aria-hidden="true">
                                        {(job.company || '?').trim().charAt(0).toUpperCase()}
                                    </div>
                                    <div className="company-info">
                                        <div className="company-name">{job.company}</div>
                                        {job.location && (
                                            <div className="company-location">
                                                <MapPin size={12} /> {job.location}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {snippet && <p className="job-snippet">{snippet}</p>}

                                <div className="job-meta">
                                    <span className="meta-item">
                                        <Banknote size={13} /> {formatSalary(job)}
                                    </span>
                                    {job.contract_time && job.contract_time !== 'Unknown' && (
                                        <span className="meta-item">
                                            <Clock size={13} /> {job.contract_time}
                                        </span>
                                    )}
                                </div>

                                <div className="job-card-footer">
                                    <button className="btn btn-primary btn-sm">
                                        Analyze fit
                                    </button>
                                    <a
                                        href={job.redirect_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        onClick={(e) => e.stopPropagation()}
                                        title="View original listing"
                                    >
                                        View <ExternalLink size={13} />
                                    </a>
                                </div>
                            </motion.article>
                        );
                    })
                )}
            </motion.div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                    <div className="pagination-controls">
                        <button
                            className="icon-btn plain"
                            onClick={() => goToPage(Math.max(1, validPage - 1))}
                            disabled={validPage <= 1}
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(maxPages, totalPages) }, (_, i) => {
                            let pageNum;
                            // Always show "maxPages" buttons, centered around the current page
                            if (totalPages <= maxPages) {
                                pageNum = i + 1;
                            } else if (validPage <= Math.ceil(maxPages / 2)) {
                                pageNum = i + 1;
                            } else if (validPage >= totalPages - Math.floor(maxPages / 2)) {
                                pageNum = totalPages - maxPages + 1 + i;
                            } else {
                                pageNum = validPage - Math.floor(maxPages / 2) + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    className={`page-btn ${validPage === pageNum ? 'active' : ''}`}
                                    onClick={() => goToPage(pageNum)}
                                    aria-current={validPage === pageNum ? 'page' : undefined}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            className="icon-btn plain"
                            onClick={() => goToPage(Math.min(totalPages, validPage + 1))}
                            disabled={validPage >= totalPages}
                            aria-label="Next page"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="pagination-info">
                        Page {validPage} of {totalPages}
                    </div>
                </nav>
            )}
        </div>
    );
}

export default JobList;
