import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Coffee, Heart } from 'lucide-react';

const AboutUs = ({ onBack }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card about-us-card"
            style={{
                maxWidth: '800px',
                width: '100%',
                margin: '2rem auto',
                textAlign: 'center',
                position: 'relative'
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

            <div style={{ marginBottom: '2rem' }}>
                <div className="show-mobile" style={{ height: '3rem' }}></div>
                <h2 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>About NeuroArc</h2>
                <div style={{ width: '60px', height: '4px', background: 'var(--color-primary)', margin: '0 auto', borderRadius: '2px' }}></div>
            </div>

            <div style={{ marginBottom: '3rem', textAlign: 'left', lineHeight: '1.8' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
                    <strong>Who am I?</strong><br />
                    NeuroArc was built with a single mission: to help students and job seekers land their dream roles—whether part-time or full-time.
                </p>
                <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                    I understand that the job market is tough. ATS (Applicant Tracking Systems) often filter out great candidates before a human even sees them. That's why I created this tool—to give you the edge you need by optimizing your CV on the basis of ATS.
                </p>

                <div style={{
                    background: 'rgba(45, 212, 191, 0.1)',
                    border: '1px solid var(--color-primary-dark)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                }}>
                    <p style={{ margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Heart size={20} color="var(--color-primary)" fill="var(--color-primary)" style={{ flexShrink: 0 }} />
                        <span>
                            <strong>NeuroArc is completely free to use.</strong> I believe access to career tools shouldn't be behind a paywall.
                        </span>
                    </p>
                </div>

                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                    However, running the website and high-performance servers that power these optimizations does come with a cost. I keep this running out of passion, but I am a student developer.
                </p>
            </div>

            <div style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Your support creates opportunities.
                </p>
                <p style={{ maxWidth: '600px', margin: '0 auto 1.5rem', color: 'var(--color-text-muted)' }}>
                    If this tool has helped you, or if you simply believe in my mission, consider supporting me. Your contribution helps keep the servers running and the service free for everyone. I am deeply grateful for any support.
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                    <a href="https://github.com/iammanoj807" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        Connect on GitHub
                    </a>
                </div>

                <a
                    href="https://www.buymeacoffee.com/manojthapa"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block',
                        transition: 'transform 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <img
                        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                        alt="Buy Me A Coffee"
                        style={{ height: '50px', width: 'auto' }}
                    />
                </a>
            </div>
        </motion.div>
    );
};

export default AboutUs;
