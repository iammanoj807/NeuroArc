import { useState, useEffect } from 'react';
import { Search, MapPin, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function JobSearch({ onSearch, loading }) {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [country, setCountry] = useState('gb'); // Default to UK
    const [filters, setFilters] = useState({
        fullTime: false,
        partTime: false,
        permanent: false,
        contract: false
    });
    const [showFilters, setShowFilters] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            // Always pass the current location, even if query is empty
            onSearch(query, location, country, filters);
        }, 800);

        return () => clearTimeout(timer);
    }, [query, location, country, filters, onSearch]);

    const handleFilterChange = (e) => {
        const { name, checked } = e.target;
        setFilters(prev => ({ ...prev, [name]: checked }));
    };

    return (
        <div className="search-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="search-card-container">
                {/* Query Input */}
                <div className="input-group" style={{ flex: 1.5, position: 'relative' }}>
                    <Search className="input-icon" size={20} />
                    <input
                        type="text"
                        placeholder="What are you looking for?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="form-input"
                        style={{ border: 'none', background: 'transparent', boxShadow: 'none', paddingLeft: '3rem', fontSize: '1.1rem' }}
                    />
                </div>

                <div className="search-divider"></div>

                {/* Location Input */}
                <div className="input-group" style={{ flex: 1, position: 'relative' }}>
                    <MapPin className="input-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="form-input"
                        style={{ border: 'none', background: 'transparent', boxShadow: 'none', paddingLeft: '3rem', fontSize: '1.1rem' }}
                    />
                </div>
            </div>

            {/* Active Filter Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                {Object.entries(filters).filter(([_, value]) => value).map(([key, _]) => {
                    const label = {
                        fullTime: 'Full Time',
                        partTime: 'Part Time',
                        permanent: 'Permanent',
                        contract: 'Contract'
                    }[key];

                    return (
                        <motion.button
                            key={key}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={() => setFilters(prev => ({ ...prev, [key]: false }))}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.4rem 0.8rem',
                                background: 'rgba(45, 212, 191, 0.2)',
                                border: '1px solid var(--color-primary)',
                                borderRadius: '16px',
                                color: 'var(--color-primary)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {label}
                            <div style={{ padding: '2px', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Advanced Filters Toggle */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                    className="btn btn-text"
                    onClick={() => setShowFilters(!showFilters)}
                    style={{ padding: '0.5rem 1rem', display: 'flex', items: 'center', gap: '0.5rem', borderRadius: '20px', background: showFilters ? 'rgba(45, 212, 191, 0.1)' : 'transparent' }}
                >
                    <Filter size={16} />
                    {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                </button>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="filters-grid"
                            style={{ overflow: 'hidden', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}
                        >
                            {[
                                { name: 'fullTime', label: 'Full Time' },
                                { name: 'partTime', label: 'Part Time' },
                                { name: 'permanent', label: 'Permanent' },
                                { name: 'contract', label: 'Contract' }
                            ].map(filter => (
                                <label
                                    key={filter.name}
                                    className="checkbox-pill"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        background: filters[filter.name] ? 'rgba(45, 212, 191, 0.15)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${filters[filter.name] ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s ease',
                                        color: filters[filter.name] ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        name={filter.name}
                                        checked={filters[filter.name]}
                                        onChange={handleFilterChange}
                                        style={{ display: 'none' }}
                                    />
                                    {filter.label}
                                </label>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default JobSearch;
