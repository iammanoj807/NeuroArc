import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Reviews from './Reviews';

const ReviewsPage = ({ onBack }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card reviews-page-card"
            style={{
                maxWidth: '800px',
                width: '100%',
                margin: '2rem auto',
                position: 'relative',
                padding: '2rem'
            }}
        >
            {/* Header / Back Button */}
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
                    fontSize: '0.9rem',
                    zIndex: 10
                }}
            >
                <ArrowLeft size={18} /> Back
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className="show-mobile" style={{ height: '3rem' }}></div>
                <h2 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>User Reviews</h2>
                <div style={{ width: '60px', height: '4px', background: 'var(--color-primary)', margin: '0 auto', borderRadius: '2px' }}></div>
                <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
                    See what others are saying about NeuroArc.
                </p>
            </div>

            <Reviews />
        </motion.div>
    );
};

export default ReviewsPage;
