import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const STEPS = {
    cv: [
        "Analyzing job requirements",
        "Identifying your best achievements",
        "Drafting professional summary",
        "Optimizing bullet points with the STAR method",
        "Applying ATS-friendly formatting",
        "Compiling your CV"
    ],
    cover_letter: [
        "Analyzing job requirements",
        "Matching your experience",
        "Crafting a compelling opening",
        "Highlighting key achievements",
        "Writing a professional closing",
        "Generating PDF"
    ],
    analysis: [
        "Reading your CV",
        "Extracting skills and experience",
        "Comparing against the job requirements",
        "Calculating your match score"
    ]
};

const GenerationProgress = ({ type = 'cv' }) => {
    const [step, setStep] = useState(0);
    const steps = STEPS[type] || STEPS.cv;

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(s => (s < steps.length - 1 ? s + 1 : s));
        }, 2000);
        return () => clearInterval(interval);
    }, [steps.length]);

    return (
        <ul className="progress-steps" aria-live="polite">
            {steps.map((label, i) => {
                const state = i < step ? 'done' : i === step ? 'current' : 'pending';
                return (
                    <li key={label} className={`progress-step ${state}`}>
                        {state === 'done' && <CheckCircle2 size={18} />}
                        {state === 'current' && <Loader2 size={18} className="spinner" />}
                        {state === 'pending' && <Circle size={18} />}
                        {label}
                    </li>
                );
            })}
        </ul>
    );
};

export default GenerationProgress;
