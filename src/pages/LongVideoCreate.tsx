import { useState, useEffect, useRef } from 'react';
import {
    FileText,
    Mic,
    Film,
    Check,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Volume2,
    Image,
    Clock,
    AlertCircle,
    RefreshCw,
    Download,
    Play,
    Search,
} from 'lucide-react';
import { getPollyVoices, synthesizeSpeech, previewVoice, downloadAudio, estimateAudioDuration, type LanguageGroup, type PollyVoice } from '../services/awsPolly';
import { generateScriptWithProgress, MODEL_CONFIGS, type ModelTier } from '../services/openai';
import { parseScriptIntoScenes, findVideosForAllScenes, type SelectedSceneVideo } from '../services/pexels';
import { assembleVideo, downloadVideo, type AssemblyProgress } from '../services/videoAssembly';
import { generateImagesForScenes, type SceneImageData } from '../services/falai';
import { assembleVideoFromImages } from '../services/imageToVideoAssembly';
import { useApp } from '../context/AppContext';
import { saveVideo, uploadVideo } from '../services/videoLibrary';
import { supabase } from '../lib/supabase';
import './LongVideoCreate.css';

type Step = 'script' | 'voiceover' | 'assembly';

const steps: { id: Step; title: string; icon: React.ElementType }[] = [
    { id: 'script', title: 'Write Script', icon: FileText },
    { id: 'voiceover', title: 'Voiceover', icon: Mic },
    { id: 'assembly', title: 'Video Editing', icon: Film },
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
    const [selectedVoice, setSelectedVoice] = useState('en-US-GuyNeural');
    const [speed, setSpeed] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelTier>('standard');
    const [generationStage, setGenerationStage] = useState<'concept' | 'script' | null>(null);

    // AWS Polly states
    const [languages, setLanguages] = useState<LanguageGroup[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');
    const [filteredVoices, setFilteredVoices] = useState<PollyVoice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState('Ruth');
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [languageSearch, setLanguageSearch] = useState('');
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);

    // Pexels states
    const [visualStyle, setVisualStyle] = useState<'stock' | 'ai'>('stock');
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

    // Credit confirmation modal
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [userCredits, setUserCredits] = useState<number>(0);
    const [isDeductingCredits, setIsDeductingCredits] = useState(false);

    // Fetch voices on mount
    useEffect(() => {
        const fetchVoices = async () => {
            setIsLoadingVoices(true);
            try {
                const fetchedLanguages = await getPollyVoices();
                setLanguages(fetchedLanguages);
                // Set default language and voice (Ruth for en-US)
                const enUS = fetchedLanguages.find(l => l.locale === 'en-US');
                if (enUS) {
                    setFilteredVoices(enUS.voices);
                    setSelectedLanguage('en-US');
                    const defaultVoice = enUS.voices.find(v => v.id === 'Ruth') || enUS.voices[0];
                    if (defaultVoice) setSelectedVoiceId(defaultVoice.id);
                } else if (fetchedLanguages.length > 0) {
                    setFilteredVoices(fetchedLanguages[0].voices);
                    setSelectedLanguage(fetchedLanguages[0].locale);
                    if (fetchedLanguages[0].voices.length > 0) {
                        setSelectedVoiceId(fetchedLanguages[0].voices[0].id);
                    }
                }
            } catch (error) {
                console.error('Error fetching voices:', error);
            } finally {
                setIsLoadingVoices(false);
            }
        };

        fetchVoices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update filtered voices when language changes
    useEffect(() => {
        const lang = languages.find(l => l.locale === selectedLanguage);
        if (lang) {
            setFilteredVoices(lang.voices);
            if (lang.voices.length > 0 && !lang.voices.find(v => v.id === selectedVoiceId)) {
                setSelectedVoiceId(lang.voices[0].id);
            }
        }
    }, [selectedLanguage, languages, selectedVoiceId]);

    const handleLanguageSelect = (locale: string) => {
        setSelectedLanguage(locale);
        setShowLanguageDropdown(false);
        setLanguageSearch('');
    };

    const handlePreviewVoice = async () => {
        if (!selectedVoiceId || isPreviewPlaying) return;
        setIsPreviewPlaying(true);
        try {
            const result = await previewVoice(selectedVoiceId);
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
            }
            const audio = new Audio(result.audioUrl);
            previewAudioRef.current = audio;
            audio.onended = () => setIsPreviewPlaying(false);
            audio.onerror = () => setIsPreviewPlaying(false);
            await audio.play();
        } catch {
            setIsPreviewPlaying(false);
        }
    };

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    const handleGenerateScript = async () => {
        if (!topic) {
            addNotification({
                type: 'warning',
                title: 'Missing Information',
                message: 'Please enter a video topic.',
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
                title: 'Error',
                message: 'An error occurred while generating the script.',
            });
        } finally {
            setIsGenerating(false);
            setGenerationStage(null);
        }
    };

    const handleGenerateVoiceover = async () => {
        if (!script || !selectedVoiceId) {
            addNotification({
                type: 'warning',
                title: 'Missing Information',
                message: 'Please write a script first and select a voice.',
            });
            return;
        }

        setIsGeneratingAudio(true);
        try {
            const result = await synthesizeSpeech(script, selectedVoiceId, 'neural');

            setAudioUrl(result.audioUrl);
            setAudioBlob(result.audio);

            addNotification({
                type: 'success',
                title: 'Voiceover Completed',
                message: 'Your audio file has been successfully created with AWS Polly Neural!',
            });
        } catch (error) {
            console.error('Error generating voiceover:', error);

            let errorMessage = 'An error occurred while generating audio.';
            if (error instanceof Error) {
                if (error.message.includes('fetch')) {
                    errorMessage = 'Polly server not reachable. Make sure to run: cd backend && node polly-server.js';
                } else {
                    errorMessage = `Error: ${error.message}`;
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
                title: 'Info',
                message: visualStyle === 'stock' ? 'Script is required for stock video selection.' : 'This visual style is not yet active.',
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
                throw new Error('Script could not be parsed into scenes.');
            }

            // Find videos for all scenes
            const selectedVideos = await findVideosForAllScenes(scenes, 'landscape');
            setSceneVideos(selectedVideos);

            addNotification({
                type: 'success',
                title: 'Videos Ready',
                message: `Videos selected for ${selectedVideos.length} scenes!`,
            });
        } catch (error) {
            console.error('Error generating videos:', error);
            addNotification({
                type: 'error',
                title: 'Video Selection Error',
                message: 'An error occurred while selecting stock videos.',
            });
        } finally {
            setIsGeneratingVideos(false);
        }
    };

    const handleGenerateAiImages = async () => {
        if (!script || visualStyle !== 'ai' || !audioBlob) {
            addNotification({
                type: 'info',
                title: 'Info',
                message: 'Script and voiceover are required for AI image generation.',
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
                title: 'Images Ready',
                message: `${images.length} AI images generated!`,
            });
        } catch (error) {
            console.error('Error generating AI images:', error);
            addNotification({
                type: 'error',
                title: 'Image Generation Error',
                message: error instanceof Error ? error.message : 'Unknown error.',
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
                title: 'Missing Content',
                message: 'Voiceover and scenes are required to create a video.',
            });
            return;
        }

        // Check for AI image path
        if (visualStyle === 'ai' && (!audioBlob || aiImages.length === 0)) {
            addNotification({
                type: 'error',
                title: 'Missing Content',
                message: 'Voiceover and AI images are required to create a video.',
            });
            return;
        }

        setIsAssembling(true);
        setAssemblyProgress({
            stage: 'init',
            progress: 0,
            message: 'Preparing...',
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

            // ── Save to Library ───────────────────────────────────────────────
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    addNotification({ type: 'info', title: 'Saving', message: 'Saving video to library...' });

                    let videoUrl: string | null = null;

                    // Try to upload to Supabase Storage
                    try {
                        videoUrl = await uploadVideo(videoBlob, user.id);
                    } catch (uploadErr) {
                        console.warn('Upload failed, saving without cloud URL:', uploadErr);
                    }

                    await saveVideo({
                        id: crypto.randomUUID(),
                        title: topic || 'Untitled Long Video',
                        description: `${duration} minute video about: ${topic}`,
                        type: 'long',
                        createdAt: new Date().toISOString(),
                        duration: duration * 60,
                        videoUrl: videoUrl || '',
                        script: script,
                        userId: user.id,
                    });

                    addNotification({ type: 'success', title: 'Saved to Library', message: 'Video added to your library!' });
                }
            } catch (saveError) {
                console.error('Failed to save to library:', saveError);
                addNotification({
                    type: 'warning',
                    title: 'Save Failed',
                    message: `Video created but library save failed. Please download it.`,
                });
            }

            addNotification({
                type: 'success',
                title: 'Video Ready!',
                message: 'Your video has been successfully created!',
            });
        } catch (error) {
            console.error('Video assembly error:', error);
            addNotification({
                type: 'error',
                title: 'Video Creation Error',
                message: error instanceof Error ? error.message : 'Unknown error.',
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

    // Show credit confirmation before moving from Script → Voiceover
    const handleContinueClick = async () => {
        if (currentStep === 'script') {
            if (!script) {
                addNotification({ type: 'warning', title: 'Script Required', message: 'Please generate or write a script first.' });
                return;
            }
            // Fetch current balance to show in modal
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: sub } = await supabase.from('subscriptions').select('credits').eq('user_id', user.id).single();
                    setUserCredits(sub?.credits ?? 0);
                }
            } catch { setUserCredits(0); }
            setShowCreditModal(true);
        } else {
            goToNextStep();
        }
    };

    const handleConfirmCredits = async () => {
        setIsDeductingCredits(true);
        const creditsToDeduct = duration * 250;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            const newCredits = Math.max(0, userCredits - creditsToDeduct);

            const { error } = await supabase
                .from('subscriptions')
                .update({ credits: newCredits, updated_at: new Date().toISOString() })
                .eq('user_id', user.id);

            if (error) throw error;

            await supabase.from('credit_transactions').insert({
                user_id: user.id,
                amount: -creditsToDeduct,
                type: 'USAGE',
                description: `Long video started: ${duration} min × 250 credits`,
                balance_after: newCredits,
            });

            setShowCreditModal(false);
            goToNextStep();
        } catch (err) {
            addNotification({ type: 'error', title: 'Credit Error', message: 'Could not deduct credits. Please try again.' });
        } finally {
            setIsDeductingCredits(false);
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
                                <h2 className="heading-md">Video Script</h2>
                                <p>Generate a script automatically with AI or write your own</p>
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div className="model-selection">
                            <label className="input-label">AI Model Quality</label>
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
                                <label className="input-label">Video Topic</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="E.g: 10 ways to make money with AI"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Target Duration (Minutes)</label>
                                <div className="duration-slider">
                                    <input
                                        type="range"
                                        min={1}
                                        max={60}
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                    />
                                    <span className="duration-value">{duration} min</span>
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
                                    Optimized Concept
                                </h4>
                                <div className="concept-content">
                                    {optimizedConcept}
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">
                                Video Script
                                {script && <span className="char-count">{script.length} characters</span>}
                            </label>
                            <textarea
                                className="input-field textarea-field script-textarea"
                                placeholder="Generate with AI or write your own script..."
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
                                <p>Configure AI voiceover settings (AWS Polly Neural — Premium Quality)</p>
                            </div>
                        </div>

                        {isLoadingVoices ? (
                            <div className="loading-voices">
                                <RefreshCw size={24} className="animate-spin" />
                                <p>Loading voices...</p>
                            </div>
                        ) : (
                            <div className="voice-selector-panel">
                                {/* Language Dropdown */}
                                <div className="input-group">
                                    <label className="input-label">Language</label>
                                    <div className="searchable-dropdown" style={{ position: 'relative' }}>
                                        <div
                                            className="dropdown-trigger input-field"
                                            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                        >
                                            <span>{languages.find(l => l.locale === selectedLanguage)?.language || selectedLanguage}</span>
                                            <ArrowRight size={14} style={{ transform: showLanguageDropdown ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                        </div>
                                        {showLanguageDropdown && (
                                            <div className="dropdown-menu glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '280px', overflowY: 'auto', zIndex: 100, marginTop: '4px', borderRadius: '12px', padding: '4px' }}>
                                                <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                                                        <Search size={14} style={{ opacity: 0.5 }} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search language..."
                                                            value={languageSearch}
                                                            onChange={(e) => setLanguageSearch(e.target.value)}
                                                            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', width: '100%', fontSize: '14px' }}
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                {languages
                                                    .filter(l => l.language.toLowerCase().includes(languageSearch.toLowerCase()) || l.locale.toLowerCase().includes(languageSearch.toLowerCase()))
                                                    .map(lang => (
                                                        <div
                                                            key={lang.locale}
                                                            className={`dropdown-item ${selectedLanguage === lang.locale ? 'active' : ''}`}
                                                            onClick={() => handleLanguageSelect(lang.locale)}
                                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            <span style={{ fontSize: '14px' }}>{lang.language} <span style={{ opacity: 0.5, fontSize: '12px' }}>({lang.locale})</span></span>
                                                            {selectedLanguage === lang.locale && <Check size={14} className="text-primary" />}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Voice Dropdown + Preview */}
                                <div className="input-group">
                                    <label className="input-label">Voice</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <select
                                            className="input-field"
                                            value={selectedVoiceId}
                                            onChange={(e) => setSelectedVoiceId(e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            {filteredVoices.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name} ({v.gender})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={handlePreviewVoice}
                                            disabled={isPreviewPlaying}
                                            title="Preview voice"
                                            style={{ minWidth: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {isPreviewPlaying ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="voice-settings">
                            <div className="input-group">
                                <label className="input-label">Speech Speed: {speed}x</label>
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
                            disabled={!script || !selectedVoiceId || isGeneratingAudio}
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
                                    <h4>Audio Preview</h4>
                                    <button className="btn btn-ghost btn-sm" onClick={handleDownloadAudio}>
                                        <Download size={16} />
                                        Download
                                    </button>
                                </div>
                                <audio controls src={audioUrl} className="audio-element">
                                    Your browser does not support audio playback.
                                </audio>
                                <p className="audio-info">
                                    Estimated duration: ~{estimateAudioDuration(script)} seconds
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
                                <p>Configure visual and audio settings</p>
                            </div>
                        </div>

                        <div className="assembly-options">
                            <div className="assembly-section">
                                <h3><Image size={20} /> Visual Style</h3>
                                <div className="style-grid">
                                    <button
                                        className={`style-option ${visualStyle === 'stock' ? 'selected' : ''}`}
                                        onClick={() => setVisualStyle('stock')}
                                    >
                                        <span className="style-icon">🎬</span>
                                        <span>Stock Video</span>
                                        {visualStyle === 'stock' && <Check size={14} className="style-check" />}
                                    </button>
                                    <button
                                        className={`style-option ${visualStyle === 'ai' ? 'selected' : ''}`}
                                        onClick={() => setVisualStyle('ai')}
                                    >
                                        <span className="style-icon">🎨</span>
                                        <span>AI Generated</span>
                                        {visualStyle === 'ai' && <Check size={14} className="style-check" />}
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
                                                Selecting videos...
                                            </>
                                        ) : (
                                            <>
                                                <Film size={18} />
                                                Select Videos for Scenes
                                            </>
                                        )}
                                    </button>

                                    {sceneVideos.length > 0 && (
                                        <div className="scene-videos-preview">
                                            <h4>🎬 Selected Videos ({sceneVideos.length} scenes)</h4>
                                            <div className="scene-videos-grid">
                                                {sceneVideos.map((sceneVideo, index) => (
                                                    <div key={index} className="scene-video-card">
                                                        <img
                                                            src={sceneVideo.video.image}
                                                            alt={`Scene ${sceneVideo.scene.sceneNumber}`}
                                                            className="scene-thumbnail"
                                                        />
                                                        <div className="scene-video-info">
                                                            <span className="scene-number">Scene {sceneVideo.scene.sceneNumber}</span>
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
                                        <span>AI images will be automatically generated from your script using Flux Pro (5-12s scene durations)</span>
                                    </div>

                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleGenerateAiImages}
                                        disabled={!script || !audioBlob || isGeneratingAiImages}
                                    >
                                        {isGeneratingAiImages ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" />
                                                Generating AI images... {aiImageProgress.current}/{aiImageProgress.total}
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
                                                            alt={`Scene ${sceneImage.sceneNumber}`}
                                                            className="scene-thumbnail"
                                                        />
                                                        <div className="scene-video-info">
                                                            <span className="scene-number">Scene {sceneImage.sceneNumber}</span>
                                                            <span className="scene-duration">{sceneImage.duration}s</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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
                                        {assemblyProgress?.message || 'Creating video...'}
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
                                <h3>✅ Video Ready!</h3>
                                <div className="video-container">
                                    <video
                                        src={finalVideoUrl}
                                        controls
                                        className="final-video-player"
                                    />
                                </div>
                                <div className="final-video-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleDownloadFinalVideo}
                                    >
                                        <Download size={18} />
                                        Download Video
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="assembly-preview">
                            <div className="preview-placeholder">
                                <Clock size={48} />
                                <p>Creating video...</p>
                                <span>Estimated time: 5-10 minutes</span>
                            </div>
                        </div>
                    </div>
                )}


            </div>

            {/* Navigation */}
            <div className="wizard-nav">
                {currentStepIndex > 0 && (
                    <button className="btn btn-secondary" onClick={goToPrevStep}>
                        <ArrowLeft size={18} />
                        Back
                    </button>
                )}
                <div className="nav-spacer" />
                {currentStepIndex < steps.length - 1 && (
                    <button className="btn btn-primary" onClick={handleContinueClick}>
                        Continue
                        <ArrowRight size={18} />
                    </button>
                )}
            </div>

            {/* Credit Confirmation Modal */}
            {showCreditModal && (
                <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
                    <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, padding: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
                        <h2 className="heading-md" style={{ marginBottom: 8 }}>Confirm Credit Usage</h2>
                        <p className="text-muted" style={{ marginBottom: 24 }}>
                            Creating a <strong>{duration}-minute</strong> video will cost:
                        </p>
                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '16px 24px', marginBottom: 24 }}>
                            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-primary)' }}>
                                {(duration * 250).toLocaleString()} Credits
                            </div>
                            <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                                {duration} min × 250 credits/min
                            </div>
                        </div>
                        <div className="text-sm text-muted" style={{ marginBottom: 24 }}>
                            Your balance: <strong>{userCredits.toLocaleString()}</strong> credits
                            {userCredits < duration * 250 && (
                                <div style={{ color: 'var(--color-error, #ef4444)', marginTop: 6 }}>
                                    ⚠️ Insufficient credits!
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => setShowCreditModal(false)}
                                disabled={isDeductingCredits}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                onClick={handleConfirmCredits}
                                disabled={isDeductingCredits || userCredits < duration * 250}
                            >
                                {isDeductingCredits ? 'Processing...' : 'Confirm & Continue →'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LongVideoCreate;
