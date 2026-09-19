import { useState, useEffect } from 'react';
import { Search, MapPin, Check } from 'lucide-react';

const FILTER_OPTIONS = [
    { name: 'fullTime', label: 'Full-time' },
    { name: 'partTime', label: 'Part-time' },
    { name: 'permanent', label: 'Permanent' },
    { name: 'contract', label: 'Contract' }
];

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
        <div className="search-panel">
            <div className="search-bar" role="search">
                {/* Query Input */}
                <label className="search-field grow">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Job title, skill or keyword"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Job title, skill or keyword"
                    />
                </label>

                <div className="search-divider" />

                {/* Location Input */}
                <label className="search-field">
                    <MapPin size={18} />
                    <input
                        type="text"
                        placeholder="City or postcode"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        aria-label="Location"
                    />
                </label>
            </div>

            {/* Job Type Filters */}
            <div className="filter-row">
                <span className="filter-label">Job type</span>
                {FILTER_OPTIONS.map(filter => (
                    <label key={filter.name} className={`chip ${filters[filter.name] ? 'active' : ''}`}>
                        <input
                            type="checkbox"
                            name={filter.name}
                            checked={filters[filter.name]}
                            onChange={handleFilterChange}
                        />
                        {filters[filter.name] && <Check size={13} strokeWidth={2.5} />}
                        {filter.label}
                    </label>
                ))}
            </div>
        </div>
    );
}

export default JobSearch;
