import { useState, useEffect } from 'react';
import { MapPin, Calendar, DollarSign, Clock, Building, Search, ChevronLeft, ChevronRight, Briefcase, ChevronDown, SearchX } from 'lucide-react';
import { motion } from 'framer-motion';

function JobList({ jobs, selectedJob, onSelectJob, cvSkills = [], postedFilter, setPostedFilter, hasSearched }) {
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 400);

    useEffect(() => {
        const handleResize = () => setIsSmallScreen(window.innerWidth < 400);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter jobs based on posted date - HMR Trigger
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

    // Reset page when filter changes or jobs change
    const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
    const validPage = Math.min(currentPage, totalPages || 1);

    const startIndex = (validPage - 1) * JOBS_PER_PAGE;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };



    return (
        <div className="job-list-container">
            {/* Controls / Filter Bar */}
            <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                    <span className="text-gradient">{filteredJobs.length} Jobs Found</span>
                </h2>

                <div className="filter-select" style={{ position: 'relative', zIndex: 20 }}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="btn"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            minWidth: '160px',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ fontSize: '0.9rem' }}>
                            {postedFilter === 'all' && 'Any time'}
                            {postedFilter === 'today' && 'Past 24 hours'}
                            {postedFilter === '3days' && 'Past 3 days'}
                            {postedFilter === 'week' && 'Past week'}
                            {postedFilter === 'month' && 'Past month'}
                        </span>
                        <ChevronDown size={16} style={{ transition: 'transform 0.3s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </button>

                    {isDropdownOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '120%',
                                right: 0,
                                width: '100%',
                                minWidth: '180px',
                                background: '#050b14',
                                backdropFilter: 'none',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                padding: '0.5rem',
                                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                            }}
                        >
                            {[
                                { value: 'all', label: 'Any time' },
                                { value: 'today', label: 'Past 24 hours' },
                                { value: '3days', label: 'Past 3 days' },
                                { value: 'week', label: 'Past week' },
                                { value: 'month', label: 'Past month' }
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setPostedFilter(option.value);
                                        setCurrentPage(1);
                                        setIsDropdownOpen(false);
                                    }}
                                    style={{
                                        background: postedFilter === option.value ? 'rgba(45, 212, 191, 0.15)' : 'transparent',
                                        color: postedFilter === option.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                        border: 'none',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '8px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    className="dropdown-item"
                                >
                                    {option.label}
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
                style={{ display: 'grid', gap: '1.5rem' }}
            >
                {filteredJobs.length === 0 ? (
                    <div className="card no-hover" style={{ padding: '4rem 2rem', gridColumn: '1 / -1', maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', background: 'rgba(45, 212, 191, 0.1)', display: 'inline-flex', padding: '1.5rem', borderRadius: '50%' }}>
                            <SearchX size={48} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No jobs match your criteria</h3>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>Try adjusting your search terms, location, or the "Date Posted" filter to see more results.</p>
                    </div>
                ) : (
                    paginatedJobs.map(job => (
                        <motion.div
                            key={job.id}
                            variants={item}
                            className={`job-card card ${selectedJob?.id === job.id ? 'active' : ''}`}
                            onClick={() => onSelectJob(job)}
                            whileHover={{ y: -5, transition: { duration: 0.2 } }}
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
                        >
                            <div className="job-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 className="job-title" style={{ fontSize: '1.15rem', lineHeight: '1.4' }}>{job.title}</h3>
                                    {job.location && (
                                        <span className="job-location" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                            <MapPin size={14} /> {job.location}
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, marginTop: '0.2rem' }}>
                                    <Calendar size={14} />
                                    {formatDate(job.created)}
                                </span>
                            </div>

                            <div className="job-company" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
                                <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <Building size={16} />
                                </div>
                                {job.company}
                            </div>

                            <div className="job-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span className="meta-item">
                                    <DollarSign size={14} /> {formatSalary(job)}
                                </span>
                                {job.contract_time && job.contract_time !== 'Unknown' && (
                                    <span className="meta-item">
                                        <Clock size={14} /> {job.contract_time}
                                    </span>
                                )}
                            </div>


                            <div className="job-footer" style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-outline btn-sm btn-full">
                                    Analyze Fit
                                </button>
                                <a
                                    href={job.redirect_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    title="View Original"
                                >
                                    View
                                </a>
                            </div>
                        </motion.div>
                    ))
                )}
            </motion.div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination" style={{
                    flexWrap: 'wrap',
                    marginTop: '2rem',
                    padding: '0',
                    width: '100%',
                    maxWidth: '100%',
                    margin: '3rem auto 0',
                    flexDirection: 'column'
                }}>
                    <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        Page {validPage} of {totalPages}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={validPage <= 1}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: validPage <= 1 ? 0.5 : 1 }}
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(maxPages, totalPages) }, (_, i) => {
                                let pageNum;
                                // Logic to always show "maxPages" centered around current page
                                // But keeping first/last pages reachable
                                // Generalized logic:
                                if (totalPages <= maxPages) {
                                    pageNum = i + 1;
                                } else if (validPage <= Math.ceil(maxPages / 2)) {
                                    pageNum = i + 1;
                                } else if (validPage >= totalPages - Math.floor(maxPages / 2)) {
                                    pageNum = totalPages - maxPages + 1 + i;
                                } else {
                                    pageNum = validPage - Math.floor(maxPages / 2) + i;
                                }

                                // Planet Textures Mapping (Mercury -> Neptune)
                                const planets = [
                                    { name: 'Mercury', bg: "url('/textures/mercury_map.jpg')", color: '#fff' },
                                    { name: 'Venus', bg: "url('/textures/venus_map.jpg')", color: '#000' },
                                    { name: 'Earth', bg: "linear-gradient(135deg, rgba(20,80,180,0.7), rgba(40,120,220,0.6)), url('/textures/earth_daymap.jpg')", color: '#fff' },
                                    { name: 'Mars', bg: "url('/textures/mars_map.jpg')", color: '#fff' },
                                    { name: 'Jupiter', bg: "url('/textures/jupiter_map.jpg')", color: '#fff' },
                                    { name: 'Saturn', bg: "url('/textures/saturn_map.jpg')", color: '#fff' },
                                    { name: 'Uranus', bg: "url('/textures/uranus_map.jpg')", color: '#000' },
                                    { name: 'Neptune', bg: "url('/textures/neptune_map.jpg')", color: '#fff' }
                                ];

                                const planetIndex = (pageNum - 1) % 8;
                                const planet = planets[planetIndex];

                                return (
                                    <button
                                        key={i}
                                        className={`btn`}
                                        onClick={() => setCurrentPage(pageNum)}
                                        style={{
                                            width: '35px',
                                            height: '35px',
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '50%',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            backgroundImage: planet.bg,
                                            backgroundSize: '200%',
                                            backgroundPosition: '50% 30%',
                                            backgroundColor: '#1a3a5c',
                                            color: '#fff',
                                            border: validPage === pageNum ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
                                            boxShadow: 'none',
                                            transition: 'all 0.3s',
                                            transform: validPage === pageNum ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                        title={`${planet.name} (Page ${pageNum})`}
                                    >
                                        <span style={{
                                            position: 'relative',
                                            zIndex: 2,
                                            textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)'
                                        }}>
                                            {pageNum}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={validPage >= totalPages}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: validPage >= totalPages ? 0.5 : 1 }}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )
            }
        </div >
    );
}

export default JobList;

