import { useState } from 'react';
import {
    FileText,
    Link,
    Download,
    Copy,
    Check,
    RefreshCw,
    Languages,
    Clock,
    FileDown,
    Subtitles,
    AlertCircle,
} from 'lucide-react';
import { summarizeSingleYouTubeVideo, isValidYouTubeUrl } from '../services/apify';
import './Transcribe.css';

function Transcribe() {
    const [videoUrl, setVideoUrl] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [language, setLanguage] = useState('tr');
    const [copied, setCopied] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');

    const handleTranscribe = async () => {
        if (!videoUrl) return;

        // Validate YouTube URL
        if (!isValidYouTubeUrl(videoUrl)) {
            alert('Geçerli bir YouTube URL\'si giriniz (video veya shorts).');
            return;
        }

        setIsTranscribing(true);
        setTranscript('');
        setProgressStatus('Başlatılıyor...');

        try {
            const result = await summarizeSingleYouTubeVideo(
                videoUrl,
                (status) => setProgressStatus(status)
            );

            // Format the transcript with video info
            let formattedTranscript = '';

            if (result.title) {
                formattedTranscript += `Video Başlık: ${result.title}\n\n`;
            }

            if (result.duration) {
                const minutes = Math.floor(result.duration / 60);
                const seconds = result.duration % 60;
                formattedTranscript += `Süre: ${minutes}:${seconds.toString().padStart(2, '0')}\n\n`;
            }

            formattedTranscript += `=== VIDEO ÖZETİ ===\n\n${result.summary}\n`;

            if (result.transcript) {
                formattedTranscript += `\n\n=== TAM TRANİSKRIPT ===\n\n${result.transcript}`;
            }

            setTranscript(formattedTranscript);
            setProgressStatus('Tamamlandı!');
        } catch (error: any) {
            console.error('❌ Transcription error:', error);

            // More detailed error message
            let errorMessage = 'Video işlenirken bir hata oluştu.\n\n';

            if (error.message?.includes('No valid YouTube URLs')) {
                errorMessage += 'URL geçerli değil.';
            } else if (error.message?.includes('401') || error.message?.includes('403')) {
                errorMessage += 'API anahtarı geçersiz. Lütfen .env dosyasını kontrol edin.';
            } else if (error.message?.includes('timed out')) {
                errorMessage += 'İşlem zaman aşımına uğradı. Video çok uzun olabilir (max 60 dk).';
            } else if (error.message?.includes('FAILED')) {
                errorMessage += 'Apify actor başarısız. Video URL\'sini kontrol edin.';
            } else {
                errorMessage += error.message || 'Bilinmeyen hata.';
            }

            errorMessage += '\n\nDetaylar için browser console\'u kontrol edin (F12).';

            alert(errorMessage);
            setProgressStatus('');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = (format: 'txt' | 'srt' | 'vtt') => {
        let content = transcript;
        let filename = 'transcript';
        let mimeType = 'text/plain';

        if (format === 'srt') {
            // Convert to SRT format
            const lines = transcript.split('\n\n');
            content = lines.map((line, index) => {
                const match = line.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
                if (match) {
                    const text = line.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/, '');
                    return `${index + 1}\n${match[1]}:${match[2]}:${match[3]},000 --> ${match[1]}:${match[2]}:${parseInt(match[3]) + 15},000\n${text}`;
                }
                return line;
            }).join('\n\n');
            filename = 'transcript.srt';
        } else if (format === 'vtt') {
            content = 'WEBVTT\n\n' + transcript;
            filename = 'transcript.vtt';
        } else {
            filename = 'transcript.txt';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    return (
        <div className="transcribe animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="heading-lg">Video Transcribe</h1>
                    <p className="page-subtitle">YouTube videolarından otomatik metin çıkarın</p>
                </div>
            </div>

            <div className="transcribe-layout">
                {/* Input Section */}
                <div className="transcribe-input glass-card-static">
                    <div className="input-header">
                        <Link size={20} />
                        <h3>Video URL</h3>
                    </div>

                    <div className="url-input-group">
                        <input
                            type="text"
                            className="input-field"
                            placeholder="https://youtube.com/watch?v=... veya shorts URL"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                        />
                    </div>

                    <div className="transcribe-options">
                        <div className="option-group">
                            <label className="input-label">
                                <Languages size={16} />
                                Dil
                            </label>
                            <select
                                className="input-field select-field"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option value="tr">Turkish</option>
                                <option value="en">İngilizce</option>
                                <option value="de">Almanca</option>
                                <option value="fr">Fransızca</option>
                                <option value="es">İspanyolca</option>
                                <option value="auto">Otomatik Algıla</option>
                            </select>
                        </div>

                        <div className="option-group">
                            <label className="input-label">
                                <Clock size={16} />
                                Format
                            </label>
                            <select className="input-field select-field">
                                <option value="timestamps">Timestamped</option>
                                <option value="plain">Düz Metin</option>
                                <option value="paragraphs">Paragraflar</option>
                            </select>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary btn-lg transcribe-btn"
                        onClick={handleTranscribe}
                        disabled={!videoUrl || isTranscribing}
                    >
                        {isTranscribing ? (
                            <>
                                <RefreshCw size={20} className="animate-spin" />
                                {progressStatus || 'Transcribe Ediliyor...'}
                            </>
                        ) : (
                            <>
                                <FileText size={20} />
                                Generate AI Video Summary
                            </>
                        )}
                    </button>

                    <div className="apify-info">
                        <AlertCircle size={14} />
                        <span>Apify ile desteklenmektedir. Maksimum 60 dakikalık videolar.</span>
                    </div>
                </div>

                {/* Output Section */}
                {transcript && (
                    <div className="transcribe-output glass-card-static">
                        <div className="output-header">
                            <div className="output-title">
                                <FileText size={20} />
                                <h3>Transkript</h3>
                                <span className="word-count">
                                    {transcript.split(' ').length} kelime
                                </span>
                            </div>
                            <div className="output-actions">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'Kopyalandı!' : 'Kopyala'}
                                </button>
                            </div>
                        </div>

                        <div className="transcript-content">
                            <pre>{transcript}</pre>
                        </div>

                        <div className="download-options">
                            <span className="download-label">
                                <FileDown size={16} />
                                İndir:
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDownload('txt')}
                            >
                                TXT
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDownload('srt')}
                            >
                                <Subtitles size={14} />
                                SRT
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDownload('vtt')}
                            >
                                VTT
                            </button>
                        </div>
                    </div>
                )}

                {/* Features */}
                {!transcript && (
                    <div className="transcribe-features">
                        <div className="feature-item glass-card">
                            <div className="feature-icon-box">🎯</div>
                            <h4>Yüksek Doğruluk</h4>
                            <p>AI destekli transkripsiyon ile %98 doğruluk oranı</p>
                        </div>
                        <div className="feature-item glass-card">
                            <div className="feature-icon-box">🌍</div>
                            <h4>50+ Dil Desteği</h4>
                            <p>Dünya dillerinin çoğunda transcribe yapabilme</p>
                        </div>
                        <div className="feature-item glass-card">
                            <div className="feature-icon-box">⚡</div>
                            <h4>Hızlı İşlem</h4>
                            <p>10 dakikalık video sadece 30 saniyede</p>
                        </div>
                        <div className="feature-item glass-card">
                            <div className="feature-icon-box">📝</div>
                            <h4>SRT/VTT Export</h4>
                            <p>Altyazı formatlarına direkt çıktı alma</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Transcribe;
