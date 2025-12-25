import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const GenerationProgress = ({ type = 'cv' }) => {
    const [step, setStep] = useState(0);

    const cvSteps = [
        "Analyzing job requirements...",
        "Identifying your best achievements...",
        "Drafting professional summary...",
        "Optimizing bullet points with STAR method...",
        "Applying ATS-friendly formatting...",
        "Compiling Professional CV..."
    ];

    const coverLetterSteps = [
        "Analyzing job requirements...",
        "Matching your experience...",
        "Crafting compelling opening...",
        "Highlighting key achievements...",
        "Writing professional closing...",
        "Generating PDF..."
    ];

    const steps = type === 'cover_letter' ? coverLetterSteps : cvSteps;

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(s => (s < steps.length - 1 ? s + 1 : s));
        }, 2500);
        return () => clearInterval(interval);
    }, [steps.length]);

    return (
        <motion.p
            key={step}
            className="hero-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ fontSize: '2rem', marginTop: '1.5rem', marginBottom: 0 }}
        >
            {steps[step]}
        </motion.p>
    );
};

export default GenerationProgress;
