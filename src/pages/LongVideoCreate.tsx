import { useState, useEffect } from 'react';
import {
    FileText,
    Mic,
    Film,
    Upload,
    Check,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Volume2,
    Image,
    Music,
    Youtube,
    Clock,
    AlertCircle,
    RefreshCw,
    Download,
} from 'lucide-react';
import { getVoices, textToSpeech, downloadAudio, estimateAudioDuration, type ElevenLabsVoice } from '../services/elevenlabs';
import { generateScriptWithProgress, MODEL_CONFIGS, type ModelTier } from '../services/openai';
import { parseScriptIntoScenes, findVideosForAllScenes, type SelectedSceneVideo } from '../services/pexels';
import { assembleVideo, downloadVideo, type AssemblyProgress } from '../services/videoAssembly';
import { generateImagesForScenes, type SceneImageData } from '../services/falai';
import { assembleVideoFromImages } from '../services/imageToVideoAssembly';
import { useApp } from '../context/AppContext';
import './LongVideoCreate.css';

type Step = 'script' | 'voiceover' | 'assembly' | 'publish';

const steps: { id: Step; title: string; icon: React.ElementType }[] = [
    { id: 'script', title: 'Write Script', icon: FileText },
    { id: 'voiceover', title: 'Voiceover', icon: Mic },
    { id: 'assembly', title: 'Video Editing', icon: Film },
    { id: 'publish', title: 'Publish', icon: Upload },
];

function LongVideoCreate() {
    const { addNotification } = useApp();
    const [currentStep, setCurrentStep] = useState<Step>('script');
    const [completedSteps, setCompletedSteps] = useState<Step[]>([]);

    // Form states
    const [topic, setTopic] = useState('');
    const [script, setScript] = useState('');
    const [optimizedConcept, setOptimizedConcept] = useState('');
    const [duration, setDuration] = useState(10);
    const [selectedVoice, setSelectedVoice] = useState('');
    const [speed, setSpeed] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelTier>('standard');
    const [generationStage, setGenerationStage] = useState<'concept' | 'script' | null>(null);

    // ElevenLabs states
    const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

    // Pexels states
    const [visualStyle, setVisualStyle] = useState<'stock' | 'ai' | 'infographic'>('stock');
    const [sceneVideos, setSceneVideos] = useState<SelectedSceneVideo[]>([]);
    const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);

    // Fal.AI states
    const [aiImages, setAiImages] = useState<SceneImageData[]>([]);
    const [isGeneratingAiImages, setIsGeneratingAiImages] = useState(false);
    const [aiImageProgress, setAiImageProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

    // Video Assembly states
    const [isAssembling, setIsAssembling] = useState(false);
    const [assemblyProgress, setAssemblyProgress] = useState<AssemblyProgress | null>(null);
    const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

    // Fetch voices on mount
    useEffect(() => {
        const fetchVoices = async () => {
            setIsLoadingVoices(true);
            try {
                const fetchedVoices = await getVoices();
                setVoices(fetchedVoices);
                if (fetchedVoices.length > 0) {
                    setSelectedVoice(fetchedVoices[0].voice_id);
                }
            } catch (error) {
                console.error('Error fetching voices:', error);
                addNotification({
                    type: 'error',
                    title: 'Ses Yüklenemedi',
                    message: 'ElevenLabs sesleri yüklenirken bir hata oluştu.',
                });
            } finally {
                setIsLoadingVoices(false);
            }
        };

        fetchVoices();
    }, [addNotification]);

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    const handleGenerateScript = async () => {
        if (!topic) {
            addNotification({
                type: 'warning',
                title: 'Eksik Bilgi',
                message: 'Lütfen video konusu girin.',
            });
            return;
        }

        setIsGenerating(true);
        setOptimizedConcept('');
        setScript('');

        try {
            const result = await generateScriptWithProgress(
                {
                    userInput: topic,
                    targetDuration: duration,
                    videoType: 'long',
                    modelTier: selectedModel,
                },
                (stage, content) => {
                    setGenerationStage(stage);
                    if (stage === 'concept' && content !== 'Optimizing concept...') {
                        setOptimizedConcept(content);
                    } else if (stage === 'script' && content !== 'Generating narration text...') {
                        setScript(content);
                    }
                }
            );

            setOptimizedConcept(result.optimizedConcept);
            setScript(result.finalScript);
            setGenerationStage(null);

            addNotification({
                type: 'success',
                title: 'Script Generated',
                message: `${result.finalScript.split(' ').length} word script ready!`,
            });
        } catch (error) {
            console.error('Error generating script:', error);
            addNotification({
                type: 'error',
                title: 'Hata',
                message: 'Script oluşturulurken bir hata oluştu.',
            });
        } finally {
            setIsGenerating(false);
            setGenerationStage(null);
        }
    };

    const handleGenerateVoiceover = async () => {
        if (!script || !selectedVoice) {
            addNotification({
                type: 'warning',
                title: 'Eksik Bilgi',
                message: 'Please write a script first and select a voice.',
            });
            return;
        }

        setIsGeneratingAudio(true);
        try {
            const result = await textToSpeech({
                text: script,
                voice_id: selectedVoice,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true,
                },
            });

            setAudioUrl(result.audioUrl);
            setAudioBlob(result.audio);

            addNotification({
                type: 'success',
                title: 'Voiceover Completed',
                message: 'Ses dosyanız başarıyla oluşturuldu!',
            });
        } catch (error) {
            console.error('Error generating voiceover:', error);

            let errorMessage = 'Ses oluşturulurken bir hata oluştu.';

            if (error instanceof Error) {
                if (error.message.includes('API key is missing')) {
                    errorMessage = 'ElevenLabs API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.';
                } else if (error.message.includes('401')) {
                    errorMessage = 'ElevenLabs API anahtarı geçersiz. Lütfen .env dosyasındaki API key\'i kontrol edin.';
                } else if (error.message.includes('quota')) {
                    errorMessage = 'ElevenLabs API kotanız dolmuş. Lütfen hesabınızı kontrol edin.';
                } else {
                    errorMessage = `Hata: ${error.message}`;
                }
            }

            addNotification({
                type: 'error',
                title: 'Voiceover Error',
                message: errorMessage,
            });
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleDownloadAudio = () => {
        if (audioBlob) {
            downloadAudio(audioBlob, `${topic || 'voiceover'}.mp3`);
        }
    };

    const handleGenerateVideos = async () => {
        if (!script || visualStyle !== 'stock') {
            addNotification({
                type: 'info',
                title: 'Bilgi',
                message: visualStyle === 'stock' ? 'Stock video seçimi için script gerekli.' : 'Bu görsel stili henüz aktif değil.',
            });
            return;
        }

        setIsGeneratingVideos(true);
        try {
            // Get actual audio duration
            let audioDuration = duration * 60; // Default estimate

            if (audioBlob) {
                try {
                    // Create audio element to get actual duration
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);

                    await new Promise((resolve, reject) => {
                        audio.onloadedmetadata = () => {
                            audioDuration = audio.duration;
                            URL.revokeObjectURL(audioUrl);
                            resolve(null);
                        };
                        audio.onerror = () => {
                            URL.revokeObjectURL(audioUrl);
                            reject(new Error('Could not load audio metadata'));
                        };
                    });

                    console.log('✅ Actual audio duration:', audioDuration, 'seconds');
                } catch (error) {
                    console.warn('Could not get exact audio duration, using estimate');
                }
            }

            // Parse script into scenes with CORRECT duration
            const scenes = parseScriptIntoScenes(script, audioDuration);
            console.log('📝 Parsed scenes:', scenes.length, 'Total duration:', audioDuration);

            if (scenes.length === 0) {
                throw new Error('Script sahnelere ayrılamadı.');
            }

            // Find videos for all scenes
            const selectedVideos = await findVideosForAllScenes(scenes, 'landscape');
            setSceneVideos(selectedVideos);

            addNotification({
                type: 'success',
                title: 'Videolar Hazır',
                message: `${selectedVideos.length} sahne için video seçildi!`,
            });
        } catch (error) {
            console.error('Error generating videos:', error);
            addNotification({
                type: 'error',
                title: 'Video Seçim Hatası',
                message: 'Pexels videoları seçilirken bir hata oluştu.',
            });
        } finally {
            setIsGeneratingVideos(false);
        }
    };

    const handleGenerateAiImages = async () => {
        if (!script || visualStyle !== 'ai' || !audioBlob) {
            addNotification({
                type: 'info',
                title: 'Bilgi',
                message: 'AI görsel oluşturma için script ve seslendirme gerekli.',
            });
            return;
        }

        setIsGeneratingAiImages(true);
        setAiImageProgress({ current: 0, total: 0 });

        try {
            // Get actual audio duration
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            const audioDuration = await new Promise<number>((resolve, reject) => {
                audio.onloadedmetadata = () => {
                    URL.revokeObjectURL(audioUrl);
                    resolve(audio.duration);
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error('Could not load audio metadata'));
                };
            });

            console.log('🎨 Generating AI images for', audioDuration, 'seconds');

            const images = await generateImagesForScenes(
                script,
                audioDuration,
                (current, total, imageUrl) => {
                    setAiImageProgress({ current, total });
                    if (imageUrl) {
                        console.log(`✅ Image ${current}/${total} ready`);
                    }
                }
            );

            setAiImages(images);

            addNotification({
                type: 'success',
                title: 'Görseller Hazır',
                message: `${images.length} AI görsel oluşturuldu!`,
            });
        } catch (error) {
            console.error('Error generating AI images:', error);
            addNotification({
                type: 'error',
                title: 'Image Generation Error',
                message: error instanceof Error ? error.message : 'Bilinmeyen hata.',
            });
        } finally {
            setIsGeneratingAiImages(false);
        }
    };

    const handleAssembleVideo = async () => {
        // Check for stock video path
        if (visualStyle === 'stock' && (!audioBlob || sceneVideos.length === 0)) {
            addNotification({
                type: 'error',
                title: 'Eksik İçerik',
                message: 'Video oluşturmak için seslendirme ve sahneler gerekli.',
            });
            return;
        }

        // Check for AI image path
        if (visualStyle === 'ai' && (!audioBlob || aiImages.length === 0)) {
            addNotification({
                type: 'error',
                title: 'Eksik İçerik',
                message: 'Video oluşturmak için seslendirme ve AI görseller gerekli.',
            });
            return;
        }

        setIsAssembling(true);
        setAssemblyProgress({
            stage: 'init',
            progress: 0,
            message: 'Hazırlanıyor...',
        });

        try {
            let videoBlob: Blob;

            // Route to appropriate assembly service
            if (visualStyle === 'stock') {
                console.log('🎬 Assembling with stock videos...');
                videoBlob = await assembleVideo({
                    sceneVideos,
                    audioBlob: audioBlob!, // We checked above
                    onProgress: (progress) => {
                        setAssemblyProgress(progress);
                    },
                });
            } else if (visualStyle === 'ai') {
                console.log('🎨 Assembling with AI images...');

                // Get FFmpeg instance (we need to import it from videoAssembly)
                const { FFmpeg } = await import('@ffmpeg/ffmpeg');
                const ffmpeg = new FFmpeg();
                ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));

                await ffmpeg.load({
                    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
                    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
                });

                videoBlob = await assembleVideoFromImages(
                    ffmpeg,
                    aiImages,
                    audioBlob!, // We checked above
                    (progress) => {
                        setAssemblyProgress(progress);
                    },
                );
            } else {
                throw new Error('Unsupported visual style');
            }

            // Create preview URL
            const videoUrl = URL.createObjectURL(videoBlob);
            setFinalVideoBlob(videoBlob);
            setFinalVideoUrl(videoUrl);

            addNotification({
                type: 'success',
                title: 'Video Hazır!',
                message: 'Videonuz başarıyla oluşturuldu!',
            });
        } catch (error) {
            console.error('Video assembly error:', error);
            addNotification({
                type: 'error',
                title: 'Video Creation Error',
                message: error instanceof Error ? error.message : 'Bilinmeyen hata.',
            });
        } finally {
            setIsAssembling(false);
        }
    };

    const handleDownloadFinalVideo = () => {
        if (finalVideoBlob) {
            downloadVideo(finalVideoBlob, `${topic || 'video'}.mp4`);
        }
    };

    const goToNextStep = () => {
        setCompletedSteps([...completedSteps, currentStep]);
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
            setCurrentStep(steps[nextIndex].id);
        }
    };

    const goToPrevStep = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(steps[prevIndex].id);
        }
    };

    const isStepCompleted = (stepId: Step) => completedSteps.includes(stepId);

    return (
        <div className="video-create animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="heading-lg">Create Long Video</h1>
                    <p className="page-subtitle">Create 1-60 minute professional YouTube videos</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="wizard-steps">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`wizard-step ${currentStep === step.id ? 'active' : ''} ${isStepCompleted(step.id) ? 'completed' : ''
                            }`}
                    >
                        <div className="step-circle">
                            {isStepCompleted(step.id) ? <Check size={18} /> : <step.icon size={18} />}
                        </div>
                        <span className="step-label">{step.title}</span>
                        {index < steps.length - 1 && <div className="step-connector" />}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="wizard-content glass-card-static">
                {/* Step 1: Script */}
                {currentStep === 'script' && (
                    <div className="step-content">
                        <div className="step-header">
                            <FileText size={28} className="step-icon" />
                            <div>
                                <h2 className="heading-md">Video Scripti</h2>
                                <p>AI ile otomatik script oluşturun veya kendiniz yazın</p>
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div className="model-selection">
                            <label className="input-label">AI Model Kalitesi</label>
                            <div className="model-grid">
                                {Object.entries(MODEL_CONFIGS).map(([key, config]) => (
                                    <button
                                        key={key}
                                        className={`model-card glass-card ${selectedModel === key ? 'selected' : ''}`}
                                        onClick={() => setSelectedModel(key as ModelTier)}
                                    >
                                        <div className="model-header">
                                            <span className="model-name">{config.displayName}</span>
                                            {selectedModel === key && (
                                                <Check size={16} className="model-check" />
                                            )}
                                        </div>
                                        <p className="model-desc">{config.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="input-group">
                                <label className="input-label">Video Konusu</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Örn: Yapay zeka ile para kazanmanın 10 yolu"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Hedef Süre (Dakika)</label>
                                <div className="duration-slider">
                                    <input
                                        type="range"
                                        min={1}
                                        max={60}
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                    />
                                    <span className="duration-value">{duration} dk</span>
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary generate-btn"
                            onClick={handleGenerateScript}
                            disabled={!topic || isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    {generationStage === 'concept' && 'Optimizing concept...'}
                                    {generationStage === 'script' && 'Generating narration text...'}
                                    {!generationStage && 'Generating AI Script...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Generate AI Script ({MODEL_CONFIGS[selectedModel].displayName})
                                </>
                            )}
                        </button>

                        {optimizedConcept && (
                            <div className="optimized-concept glass-card">
                                <h4>
                                    <Check size={16} className="check-icon" />
                                    Optimize Edilmiş Kurgu
                                </h4>
                                <div className="concept-content">
                                    {optimizedConcept}
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">
                                Video Scripti
                                {script && <span className="char-count">{script.length} karakter</span>}
                            </label>
                            <textarea
                                className="input-field textarea-field script-textarea"
                                placeholder="AI ile oluşturun veya kendi scriptinizi yazın..."
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                            />
                        </div>

                        <div className="script-tips glass-card">
                            <h4><AlertCircle size={16} /> Script Tips</h4>
                            <ul>
                                <li>Use a strong hook in the first 10 seconds</li>
                                <li>Add engagement loops every 2-3 minutes</li>
                                <li>Have a clear CTA (Call to Action) at the end</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Step 2: Voiceover */}
                {currentStep === 'voiceover' && (
                    <div className="step-content">
                        <div className="step-header">
                            <Mic size={28} className="step-icon" />
                            <div>
                                <h2 className="heading-md">Voiceover</h2>
                                <p>AI seslendirme ayarlarını yapın</p>
                            </div>
                        </div>

                        {isLoadingVoices ? (
                            <div className="loading-voices">
                                <RefreshCw size={24} className="animate-spin" />
                                <p>Sesler yükleniyor...</p>
                            </div>
                        ) : (
                            <div className="voice-grid">
                                {voices.map((voice) => (
                                    <button
                                        key={voice.voice_id}
                                        className={`voice-card glass-card ${selectedVoice === voice.voice_id ? 'selected' : ''}`}
                                        onClick={() => setSelectedVoice(voice.voice_id)}
                                    >
                                        <div className="voice-avatar">
                                            <Volume2 size={24} />
                                        </div>
                                        <div className="voice-info">
                                            <span className="voice-name">{voice.name}</span>
                                            <span className="voice-meta">
                                                {voice.labels?.accent || 'English'} • {voice.labels?.gender || 'Neutral'}
                                            </span>
                                        </div>
                                        {selectedVoice === voice.voice_id && (
                                            <div className="voice-selected">
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="voice-settings">
                            <div className="input-group">
                                <label className="input-label">Konuşma Hızı: {speed}x</label>
                                <input
                                    type="range"
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="range-input"
                                />
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleGenerateVoiceover}
                            disabled={!script || !selectedVoice || isGeneratingAudio}
                        >
                            {isGeneratingAudio ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Volume2 size={18} />
                                    Generate Voiceover
                                </>
                            )}
                        </button>

                        {audioUrl && (
                            <div className="audio-player glass-card">
                                <div className="audio-header">
                                    <h4>Ses Önizleme</h4>
                                    <button className="btn btn-ghost btn-sm" onClick={handleDownloadAudio}>
                                        <Download size={16} />
                                        İndir
                                    </button>
                                </div>
                                <audio controls src={audioUrl} className="audio-element">
                                    Tarayıcınız ses çalmayı desteklemiyor.
                                </audio>
                                <p className="audio-info">
                                    Tahmini süre: ~{estimateAudioDuration(script)} saniye
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Assembly */}
                {currentStep === 'assembly' && (
                    <div className="step-content">
                        <div className="step-header">
                            <Film size={28} className="step-icon" />
                            <div>
                                <h2 className="heading-md">Video Editing</h2>
                                <p>Görsel ve müzik ayarlarını yapın</p>
                            </div>
                        </div>

                        <div className="assembly-options">
                            <div className="assembly-section">
                                <h3><Image size={20} /> Görsel Stili</h3>
                                <div className="style-grid">
                                    <button
                                        className={`style-option ${visualStyle === 'stock' ? 'selected' : ''}`}
                                        onClick={() => setVisualStyle('stock')}
                                    >
                                        <span className="style-icon">🎬</span>
                                        <span>Stock Video (Pexels)</span>
                                        {visualStyle === 'stock' && <Check size={14} className="style-check" />}
                                    </button>
                                    <button
                                        className={`style-option ${visualStyle === 'ai' ? 'selected' : ''}`}
                                        onClick={() => setVisualStyle('ai')}
                                    >
                                        <span className="style-icon">🎨</span>
                                        <span>AI Görsel (Fal.AI)</span>
                                        {visualStyle === 'ai' && <Check size={14} className="style-check" />}
                                    </button>
                                    <button
                                        className={`style-option ${visualStyle === 'infographic' ? 'selected' : ''}`}
                                        onClick={() => setVisualStyle('infographic')}
                                        disabled
                                    >
                                        <span className="style-icon">📊</span>
                                        <span>Infografik</span>
                                        <span className="coming-soon">Yakında</span>
                                    </button>
                                </div>
                            </div>

                            {visualStyle === 'stock' && (
                                <div className="pexels-section">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleGenerateVideos}
                                        disabled={!script || isGeneratingVideos}
                                    >
                                        {isGeneratingVideos ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" />
                                                Pexels'den videolar seçiliyor...
                                            </>
                                        ) : (
                                            <>
                                                <Film size={18} />
                                                Sahneler için Video Seç
                                            </>
                                        )}
                                    </button>

                                    {sceneVideos.length > 0 && (
                                        <div className="scene-videos-preview">
                                            <h4>🎬 Seçilen Videolar ({sceneVideos.length} sahne)</h4>
                                            <div className="scene-videos-grid">
                                                {sceneVideos.map((sceneVideo, index) => (
                                                    <div key={index} className="scene-video-card">
                                                        <img
                                                            src={sceneVideo.video.image}
                                                            alt={`Sahne ${sceneVideo.scene.sceneNumber}`}
                                                            className="scene-thumbnail"
                                                        />
                                                        <div className="scene-video-info">
                                                            <span className="scene-number">Sahne {sceneVideo.scene.sceneNumber}</span>
                                                            <span className="scene-duration">
                                                                {Math.round(sceneVideo.scene.duration)}s
                                                                {sceneVideo.needsLooping && ` (x${sceneVideo.loopCount})`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Görsel - Fal.AI Integration */}
                            {visualStyle === 'ai' && (
                                <div className="pexels-section">
                                    <div className="info-banner" style={{ marginBottom: '16px', padding: '12px', background: '#1a1f2e', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <AlertCircle size={16} />
                                        <span>Fal.AI Flux Pro ile script'inizden otomatik AI görseller oluşturulacak (5-12s sahne süreleri)</span>
                                    </div>

                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleGenerateAiImages}
                                        disabled={!script || !audioBlob || isGeneratingAiImages}
                                    >
                                        {isGeneratingAiImages ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" />
                                                AI görseller oluşturuluyor... {aiImageProgress.current}/{aiImageProgress.total}
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Generate AI Images
                                            </>
                                        )}
                                    </button>

                                    {aiImages.length > 0 && (
                                        <div className="scene-videos-preview">
                                            <h4>🎨 Generated AI Images ({aiImages.length} scenes)</h4>
                                            <div className="scene-videos-grid">
                                                {aiImages.map((sceneImage) => (
                                                    <div key={sceneImage.sceneNumber} className="scene-video-card">
                                                        <img
                                                            src={sceneImage.imageUrl}
                                                            alt={`Sahne ${sceneImage.sceneNumber}`}
                                                            className="scene-thumbnail"
                                                        />
                                                        <div className="scene-video-info">
                                                            <span className="scene-number">Sahne {sceneImage.sceneNumber}</span>
                                                            <span className="scene-duration">{sceneImage.duration}s</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}


                            <div className="assembly-section">
                                <h3><Music size={20} /> Arka Plan Müziği</h3>
                                <div className="music-options">
                                    <button className="music-option selected">
                                        <span>🎵 Motivasyonel</span>
                                    </button>
                                    <button className="music-option">
                                        <span>🎶 Sakin</span>
                                    </button>
                                    <button className="music-option">
                                        <span>🎸 Enerjik</span>
                                    </button>
                                    <button className="music-option">
                                        <span>🔇 Müzik Yok</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Video Assembly Button */}
                        {((sceneVideos.length > 0 && visualStyle === 'stock') || (aiImages.length > 0 && visualStyle === 'ai')) && audioBlob && !finalVideoBlob && (
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleAssembleVideo}
                                disabled={isAssembling}
                            >
                                {isAssembling ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" />
                                        {assemblyProgress?.message || 'Video oluşturuluyor...'}
                                    </>
                                ) : (
                                    <>
                                        <Film size={20} />
                                        🎬 Auto-Create Video
                                    </>
                                )}
                            </button>
                        )}

                        {/* Assembly Progress */}
                        {isAssembling && assemblyProgress && (
                            <div className="assembly-progress-section">
                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${assemblyProgress.progress}%` }}
                                    />
                                </div>
                                <div className="progress-info">
                                    <span className="progress-percentage">{assemblyProgress.progress}%</span>
                                    <span className="progress-message">{assemblyProgress.message}</span>
                                </div>
                            </div>
                        )}

                        {/* Final Video Preview */}
                        {finalVideoUrl && (
                            <div className="final-video-section">
                                <h3>✅ Video Hazır!</h3>
                                <div className="video-container">
                                    <video
                                        src={finalVideoUrl}
                                        controls
                                        className="final-video-player"
                                    />
                                </div>
                                <div className="final-video-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleDownloadFinalVideo}
                                    >
                                        <Download size={18} />
                                        Videoyu İndir
                                    </button>
                                    <button className="btn btn-primary">
                                        <Youtube size={18} />
                                        YouTube'a Yükle
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="assembly-preview">
                            <div className="preview-placeholder">
                                <Clock size={48} />
                                <p>Video oluşturuluyor...</p>
                                <span>Estimated time: 5-10 minutes</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Publish */}
                {currentStep === 'publish' && (
                    <div className="step-content">
                        <div className="step-header">
                            <Upload size={28} className="step-icon" />
                            <div>
                                <h2 className="heading-md">YouTube'a Yayınla</h2>
                                <p>Video detaylarını girin ve yayınlayın</p>
                            </div>
                        </div>

                        <div className="publish-form">
                            <div className="input-group">
                                <label className="input-label">Video Başlığı</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Dikkat çekici bir başlık yazın..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Açıklama</label>
                                <textarea
                                    className="input-field textarea-field"
                                    placeholder="Video açıklaması..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Etiketler (virgülle ayırın)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="yapay zeka, para kazanma, tutorial..."
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                />
                            </div>

                            <div className="publish-options">
                                <button className="publish-option selected">
                                    <Youtube size={20} />
                                    <span>Hemen Yayınla</span>
                                </button>
                                <button className="publish-option">
                                    <Clock size={20} />
                                    <span>Zamanla</span>
                                </button>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg publish-btn">
                            <Youtube size={20} />
                            YouTube'a Yükle
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="wizard-nav">
                {currentStepIndex > 0 && (
                    <button className="btn btn-secondary" onClick={goToPrevStep}>
                        <ArrowLeft size={18} />
                        Geri
                    </button>
                )}
                <div className="nav-spacer" />
                {currentStepIndex < steps.length - 1 && (
                    <button className="btn btn-primary" onClick={goToNextStep}>
                        Continue
                        <ArrowRight size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default LongVideoCreate;
