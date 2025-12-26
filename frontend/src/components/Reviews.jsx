import { useState, useEffect } from 'react';
import { Star, User, MessageSquare, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = '/api';

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [visibleCount, setVisibleCount] = useState(4);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await fetch(`${API_BASE}/reviews`);
            if (!res.ok) throw new Error('Failed to fetch reviews');
            const data = await res.json();
            // Sort by date desc
            setReviews(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !comment.trim()) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rating, comment })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to submit review');
            }

            const newReview = await res.json();
            setReviews(prev => [newReview, ...prev]);

            // Reset form
            setName('');
            setComment('');
            setRating(5);
            setShowForm(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const confirmDelete = async () => {
        const adminSecret = import.meta.env.VITE_ADMIN_PASSWORD;
        if (deletePassword !== adminSecret) {
            setDeleteError("Password incorrect");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/reviews/${deleteTargetId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setReviews(prev => prev.filter(r => r.id !== deleteTargetId));
                setDeleteTargetId(null);
                setDeletePassword('');
                setDeleteError('');
            } else {
                setDeleteError("Failed to delete review");
            }
        } catch (err) {
            console.error(err);
            setDeleteError("Error deleting review");
        }
    };

    return (
        <div className="reviews-section" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <AnimatePresence>
                {deleteTargetId && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(5px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                        onClick={() => {
                            setDeleteTargetId(null);
                            setDeleteError('');
                            setDeletePassword('');
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(45, 212, 191, 0.2)',
                                padding: '2rem',
                                borderRadius: '20px',
                                width: '100%',
                                maxWidth: '400px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                            }}
                        >
                            <h3 style={{ color: 'white', margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Admin Access</h3>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                                Enter admin password to delete this review.
                            </p>

                            <input
                                type="password"
                                placeholder="Password"
                                value={deletePassword}
                                onChange={e => {
                                    setDeletePassword(e.target.value);
                                    if (deleteError) setDeleteError('');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: `1px solid ${deleteError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: '10px',
                                    color: 'white',
                                    marginBottom: deleteError ? '0.5rem' : '1.5rem',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmDelete();
                                }}
                            />

                            {deleteError && (
                                <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>
                                    {deleteError}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setDeleteTargetId(null)}
                                    style={{
                                        background: 'none',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        padding: '0.75rem 1.25rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    style={{
                                        background: '#ef4444',
                                        border: 'none',
                                        color: 'white',
                                        padding: '0.75rem 1.25rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.95rem',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h3 style={{
                        fontSize: '1.5rem',
                        margin: 0,
                        background: 'linear-gradient(to right, #fff, var(--color-primary-light))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <MessageSquare size={24} color="var(--color-primary)" /> Community Feedback
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Join {reviews.length} others in sharing your journey.
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn"
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.95rem',
                        background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        color: 'white',
                        border: showForm ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        borderRadius: '30px',
                        fontWeight: 600,
                        boxShadow: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {showForm ? 'Close Form' : 'Write a Review'}
                </motion.button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: '3rem' }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <form
                            onSubmit={handleSubmit}
                            className="card glass-panel"
                            style={{
                                padding: '2rem',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(45, 212, 191, 0.2)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: '20px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                            }}
                        >
                            <h4 style={{ margin: '0 0 1.5rem', color: 'white', fontSize: '1.2rem' }}>Share Your Experience</h4>

                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {/* Name Input */}
                                <div>
                                    <label style={{ display: 'block', color: 'var(--color-primary-light)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 500 }}>Your Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            minLength={2}
                                            maxLength={20}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px 12px 48px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                outline: 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.25rem' }}>
                                        {name.length}/20 characters
                                    </div>
                                </div>

                                {/* Rating Input */}
                                <div>
                                    <label style={{ display: 'block', color: 'var(--color-primary-light)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 500 }}>Rating</label>
                                    <div style={{
                                        display: 'inline-flex',
                                        gap: '0.5rem',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <motion.button
                                                key={star}
                                                type="button"
                                                whileHover={{ scale: 1.2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setRating(star)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: star <= rating ? '#fbbf24' : 'var(--color-text-muted)',
                                                }}
                                            >
                                                <Star
                                                    size={28}
                                                    fill={star <= rating ? '#fbbf24' : 'none'}
                                                    strokeWidth={1.5}
                                                />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Comment Input */}
                                <div>
                                    <label style={{ display: 'block', color: 'var(--color-primary-light)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 500 }}>Your Review</label>
                                    <textarea
                                        placeholder="What did you like about NeuroArc?"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        required
                                        minLength={5}
                                        maxLength={400}
                                        rows={4}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            resize: 'vertical',
                                            minHeight: '100px',
                                            transition: 'all 0.3s ease',
                                            fontFamily: 'inherit'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.25rem' }}>
                                        {comment.length}/400 characters
                                    </div>
                                </div>

                                {error && (
                                    <div style={{ color: '#ef4444', fontSize: '0.9rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                        {error}
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        opacity: submitting ? 0.7 : 1,
                                        boxShadow: 'none'
                                    }}
                                >
                                    {submitting ? 'Posting...' : 'Post Review'}
                                    {!submitting && <Send size={18} style={{ marginLeft: '0.75rem', display: 'inline-block', verticalAlign: 'middle' }} />}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="reviews-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {loading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p style={{ color: 'var(--color-text-muted)' }}>Loading community thoughts...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.03)' }}>
                        <MessageSquare size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                        <p>No reviews yet. Be the first to add your voice!</p>
                    </div>
                ) : (
                    reviews.slice(0, visibleCount).map((review, i) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(0,0,0,0.3)' }}
                            className="card review-card"
                            style={{
                                padding: '1.5rem',
                                background: 'rgba(20, 30, 50, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        minWidth: '42px',
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '12px',
                                        background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 50%), hsl(${Math.random() * 360}, 70%, 30%))`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                        flexShrink: 0
                                    }}>
                                        {review.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 style={{
                                            margin: '0 0 0.25rem 0',
                                            color: 'white',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            wordBreak: 'break-word',
                                            lineHeight: '1.4'
                                        }}>
                                            {review.name}
                                        </h4>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                            {new Date(review.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexShrink: 0, marginLeft: '0.5rem' }}>
                                    <div className="stars" style={{ display: 'flex', gap: '2px' }}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={14}
                                                fill={i < review.rating ? "#fbbf24" : "none"}
                                                color={i < review.rating ? "#fbbf24" : "rgba(255,255,255,0.2)"}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDeleteTargetId(review.id);
                                            setDeletePassword('');
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '0 4px',
                                            cursor: 'pointer',
                                            color: 'rgba(255, 255, 255, 0.2)',
                                            transition: 'color 0.2s',
                                            marginLeft: '0.25rem'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.2)'}
                                        title="Delete Review (Admin)"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <p style={{
                                margin: 0,
                                color: 'rgba(255,255,255,0.85)',
                                lineHeight: 1.6,
                                fontSize: '0.95rem',
                                flex: 1,
                                fontStyle: 'italic',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            }}>
                                "{review.comment}"
                            </p>
                        </motion.div>
                    ))
                )}
            </div>

            {visibleCount < reviews.length && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setVisibleCount(prev => prev + 4)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '0.75rem 2rem',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            backdropFilter: 'blur(5px)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Load More Reviews
                    </motion.button>
                </div>
            )}
        </div>
    );
}
