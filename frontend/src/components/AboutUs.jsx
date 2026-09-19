import React from 'react';
import { ArrowLeft, Coffee, Heart, Github } from 'lucide-react';
import { SUPPORT_URL } from './ErrorMessage';

const AboutUs = ({ onBack }) => {
    return (
        <div className="content-page fade-in">
            <button className="back-link" onClick={onBack}>
                <ArrowLeft size={16} /> Back
            </button>

            <header className="content-header">
                <h1>About NeuroArc</h1>
                <p>A free AI assistant that helps job seekers get their CV past applicant tracking systems.</p>
            </header>

            <div className="card about-us-card">
                <div className="prose">
                    <h2>The mission</h2>
                    <p>
                        NeuroArc was built with a single mission: to help students and job seekers land their dream roles, whether part-time or full-time.
                    </p>
                    <p>
                        I understand that the job market is tough. ATS (Applicant Tracking Systems) often filter out great candidates before a human even sees them. That's why I created this tool: to give you the edge you need by optimizing your CV for ATS.
                    </p>

                    <div className="callout">
                        <Heart size={18} />
                        <span>
                            <strong>NeuroArc is completely free to use.</strong> I believe access to career tools shouldn't be behind a paywall.
                        </span>
                    </div>

                    <h2>Supporting the project</h2>
                    <p>
                        Running the website and the servers that power these optimizations does come with a cost. I keep it running out of passion, as a student developer.
                    </p>
                    <p>
                        If this tool has helped you, or if you simply believe in the mission, consider supporting it. Your contribution helps keep the servers running and the service free for everyone. I am deeply grateful for any support.
                    </p>
                </div>

                <div className="link-row">
                    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        <Coffee size={16} /> Buy me a coffee
                    </a>
                    <a href="https://github.com/iammanoj807" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        <Github size={16} /> GitHub
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
