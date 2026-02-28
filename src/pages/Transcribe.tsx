import { FileText, Clock, Sparkles } from 'lucide-react';
import './Transcribe.css';

function Transcribe() {
    return (
        <div className="transcribe animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="heading-lg">Video Transcribe</h1>
                    <p className="page-subtitle">Automatically extract text from YouTube videos</p>
                </div>
            </div>

            {/* Coming Soon Section */}
            <div className="transcribe-layout">
                <div className="coming-soon-container glass-card-static">
                    <div className="coming-soon-icon">
                        <Sparkles size={64} className="sparkle-icon" />
                    </div>
                    <h2 className="coming-soon-title">Coming Soon</h2>
                    <p className="coming-soon-description">
                        We're working on bringing you powerful AI-powered video transcription.
                        This feature will allow you to automatically extract transcripts, summaries,
                        and subtitles from YouTube videos.
                    </p>

                    <div className="coming-soon-features">
                        <div className="feature-preview">
                            <FileText size={24} />
                            <span>Automatic Transcription</span>
                        </div>
                        <div className="feature-preview">
                            <Clock size={24} />
                            <span>Timestamped Output</span>
                        </div>
                        <div className="feature-preview">
                            <Sparkles size={24} />
                            <span>AI-Powered Summaries</span>
                        </div>
                    </div>

                    <p className="coming-soon-eta">
                        Stay tuned for updates!
                    </p>
                </div>
            </div>

            <style>{`
                .coming-soon-container {
                    max-width: 600px;
                    margin: 2rem auto;
                    padding: 3rem 2rem;
                    text-align: center;
                }

                .coming-soon-icon {
                    margin-bottom: 1.5rem;
                }

                .sparkle-icon {
                    color: var(--accent-primary);
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.05); }
                }

                .coming-soon-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .coming-soon-description {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }

                .coming-soon-features {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                }

                .feature-preview {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-secondary);
                }

                .feature-preview svg {
                    color: var(--accent-primary);
                }

                .feature-preview span {
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .coming-soon-eta {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    font-style: italic;
                }
            `}</style>
        </div>
    );
}

export default Transcribe;
