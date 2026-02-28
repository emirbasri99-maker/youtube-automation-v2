import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Sparkles,
    Video,
    RefreshCw,
    Download,
    Wand2,
    FileText,
    Image as ImageIcon,
    Film,
    Check,
    AlertCircle,
} from 'lucide-react';
import {
    generateShortsScript,
    processAllScenes,
    parseManualScript,
    type SceneScript,
    type GeneratedScene,
    type ShortsProgress
} from '../services/shortsWan';
import { saveVideo, uploadVideo } from '../services/videoLibrary';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { deductCreditsFromDatabase, refundCredits } from '../services/database';
import { calculateShortsCost, type AIModelType } from '../config/creditCosts';
import CreditPreview from '../components/CreditPreview';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import UpgradeModal from '../components/UpgradeModal';
import { PlanType } from '../config/plans';
import './ShortsCreate.css';

const trendingTopics = [
    { id: 1, topic: 'AI Tools', growth: '+245%' },
    { id: 2, topic: 'Quick Recipes', growth: '+180%' },
    { id: 3, topic: 'Life Hacks', growth: '+156%' },
    { id: 4, topic: 'Make Money', growth: '+134%' },
    { id: 5, topic: 'Motivation', growth: '+98%' },
];

function ShortsCreate() {
    const { addNotification } = useApp();
    const { user } = useAuth();
    const location = useLocation();

    // Mode: 'ai' = AI generates script, 'manual' = user writes script
    const [mode, setMode] = useState<'ai' | 'manual'>('ai');

    // Script states
    const [topic, setTopic] = useState('');
    const [manualScript, setManualScript] = useState('');
    const [sceneCount, setSceneCount] = useState(6);
    const [durationMode, setDurationMode] = useState<'auto' | 'manual'>('auto');
    const [manualDuration, setManualDuration] = useState(5);
    const [scenes, setScenes] = useState<SceneScript[]>([]);

    // Processing states
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<ShortsProgress | null>(null);

    // Check for suggested topic from TrendAnalyzer
    useEffect(() => {
        if (location.state?.suggestedTopic) {
            setTopic(location.state.suggestedTopic);
            setMode('ai');
            // Show notification
            addNotification({
                type: 'success',
                title: 'Trend suggestion loaded',
                message: `✨ "${location.state.suggestedTopic}"`,
            });
        }
    }, [location.state, addNotification]);

    // Results
    const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([]);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);

    // Subscription & Credits
    const { subscription, upgradeSubscription, refreshSubscription } = useSubscription();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
    const [upgradeReason] = useState('');
    const [aiModel] = useState<AIModelType>('FAST'); // Can be made dynamic later
    const [estimatedCost, setEstimatedCost] = useState(0);

    // Calculate cost whenever scene count changes
    useEffect(() => {
        const cost = calculateShortsCost(sceneCount, aiModel);
        setEstimatedCost(cost);
    }, [sceneCount, aiModel]);

    // Merge all videos using FFmpeg
    // Download helper function (works with cross-origin URLs)
    const handleDownloadFile = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    const handleMergeVideos = async () => {
        if (generatedScenes.length === 0 || !generatedScenes.every(s => s.videoUrl)) {
            addNotification({
                type: 'warning',
                title: 'No Videos',
                message: 'No videos found to merge.',
            });
            return;
        }

        setIsMerging(true);
        try {
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');

            const ffmpeg = new FFmpeg();

            ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg]', message);
            });

            await ffmpeg.load({
                coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
                wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
            });

            console.log('✅ FFmpeg loaded');

            // Download and write all videos
            const fileNames: string[] = [];
            for (let i = 0; i < generatedScenes.length; i++) {
                const scene = generatedScenes[i];
                const fileName = `video_${i}.mp4`;

                console.log(`📥 Downloading video ${i + 1}...`);
                const response = await fetch(scene.videoUrl);
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();

                await ffmpeg.writeFile(fileName, new Uint8Array(buffer));
                fileNames.push(fileName);
            }

            // Create concat file
            const concatContent = fileNames.map(f => `file '${f}'`).join('\n');
            await ffmpeg.writeFile('concat.txt', concatContent);

            console.log('🎬 Merging videos...');

            // Merge all videos
            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', 'concat.txt',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                'output.mp4'
            ]);

            console.log('✅ Videos merged');

            // Read result
            const outputData = await ffmpeg.readFile('output.mp4');
            const outputBuffer = outputData instanceof Uint8Array
                ? new Uint8Array(outputData).buffer as ArrayBuffer
                : outputData;
            const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(outputBlob);

            // Upload to Supabase Storage
            let publicUrl = url;
            if (user) {
                try {
                    addNotification({
                        type: 'info',
                        title: 'Uploading',
                        message: 'Uploading video to cloud...',
                    });

                    publicUrl = await uploadVideo(outputBlob, user.id);

                    // Save to Library
                    await saveVideo({
                        id: crypto.randomUUID(),
                        title: topic || 'Untitled Shorts',
                        description: `Generated from topic: ${topic}`,
                        type: 'shorts',
                        createdAt: new Date().toISOString(),
                        duration: sceneCount * 5, // Approximate duration
                        videoUrl: publicUrl,
                        userId: user.id
                    });

                    addNotification({
                        type: 'success',
                        title: 'Video Saved',
                        message: 'Video added to your library!',
                    });
                } catch (saveError) {
                    console.error('Failed to save to library:', saveError);
                    addNotification({
                        type: 'warning',
                        title: 'Save Failed',
                        message: `Video created but could not be saved: ${(saveError as any).message || 'Unknown error'}. Please download it.`,
                    });
                }
            }

            setFinalVideoUrl(publicUrl);

            addNotification({
                type: 'success',
                title: 'Video Ready!',
                message: 'Your Shorts video has been created and is ready!',
            });

            // Cleanup
            for (const file of fileNames) {
                await ffmpeg.deleteFile(file);
            }
            await ffmpeg.deleteFile('concat.txt');
            await ffmpeg.deleteFile('output.mp4');

        } catch (error) {
            console.error('Merge error:', error);
            addNotification({
                type: 'error',
                title: 'Merge Error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsMerging(false);
        }
    };

    // Generate script with AI
    const handleGenerateScript = async () => {
        if (!topic.trim()) {
            addNotification({
                type: 'warning',
                title: 'Topic Required',
                message: 'Please enter a shorts topic.',
            });
            return;
        }

        setIsGeneratingScript(true);
        try {
            const generatedScenes = await generateShortsScript(
                topic,
                sceneCount,
                durationMode,
                manualDuration
            );
            setScenes(generatedScenes);
            addNotification({
                type: 'success',
                title: 'Script Ready',
                message: `Script with ${generatedScenes.length} scenes created!`,
            });
        } catch (error) {
            console.error('Script generation error:', error);
            addNotification({
                type: 'error',
                title: 'Script Error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsGeneratingScript(false);
        }
    };

    // Parse manual script
    const handleParseManualScript = () => {
        if (!manualScript.trim()) {
            addNotification({
                type: 'warning',
                title: 'Script Required',
                message: 'Please write a script first.',
            });
            return;
        }

        const parsedScenes = parseManualScript(
            manualScript,
            sceneCount,
            durationMode,
            manualDuration
        );
        setScenes(parsedScenes);
        addNotification({
            type: 'success',
            title: 'Senaryo Ayrıştırıldı',
            message: `${parsedScenes.length} sahne oluşturuldu!`,
        });
    };

    // Process all scenes (images + videos)
    const handleProcessScenes = async () => {
        if (scenes.length === 0) {
            addNotification({
                type: 'warning',
                title: 'No Script',
                message: 'Please create a script first.',
            });
            return;
        }

        // Credit validation
        if (!subscription || !user) {
            addNotification({
                type: 'error',
                title: 'Subscription Required',
                message: 'Please log in first.',
            });
            return;
        }

        // Check sufficient credits
        const cost = calculateShortsCost(scenes.length, aiModel);
        if (subscription.credits < cost) {
            setShowInsufficientCreditsModal(true);
            addNotification({
                type: 'warning',
                title: 'Insufficient Credits',
                message: `This operation requires ${cost} credits. Available: ${subscription.credits}`,
            });
            return;
        }

        setIsProcessing(true);
        setProgress(null);
        setGeneratedScenes([]);

        let creditsDeducted = false;
        let deductedAmount = 0;

        try {
            // DEDUCT CREDITS BEFORE API CALLS
            const deductResult = await deductCreditsFromDatabase(
                user.id,
                cost,
                `Shorts creation: ${scenes.length} scenes`,
            );

            if (!deductResult.success) {
                throw new Error(deductResult.error || 'Credit deduction failed');
            }

            creditsDeducted = true;
            deductedAmount = cost;
            console.log(`💳 Deducted ${cost} credits. New balance: ${deductResult.newBalance}`);

            // Refresh subscription to show updated balance
            await refreshSubscription();

            // NOW process scenes with API calls
            const results = await processAllScenes(scenes, (prog) => {
                setProgress(prog);
            });

            console.log('✅ All scenes processed:', results);
            setGeneratedScenes(results);

            addNotification({
                type: 'success',
                title: 'Shorts Ready!',
                message: `${results.length} scenes created successfully! ${cost} credits used.`,
            });
        } catch (error) {
            console.error('Processing error:', error);

            // REFUND CREDITS ON ERROR
            if (creditsDeducted && user) {
                console.log(`🔄 Refunding ${deductedAmount} credits due to error...`);
                const refundResult = await refundCredits(
                    user.id,
                    deductedAmount,
                    'Shorts creation failed'
                );

                if (refundResult.success) {
                    console.log(`✅ Refunded ${deductedAmount} credits. New balance: ${refundResult.newBalance}`);
                    await refreshSubscription();
                    addNotification({
                        type: 'info',
                        title: 'Credits Refunded',
                        message: `${deductedAmount} kredi hesabınıza iade edildi.`,
                    });
                }
            }

            addNotification({
                type: 'error',
                title: 'Processing Error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Calculate total duration
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

    return (
        <div className="shorts-create-page">
            <div className="shorts-header">
                <h1>🎬 AI Shorts Factory</h1>
                <p>Fal.AI Wan ile otomatik shorts videosu oluştur</p>
            </div>

            <div className="shorts-content">
                <div className="shorts-main">
                    {/* Mode Selection */}
                    <div className="mode-selection">
                        <h2>Creation Mode</h2>
                        <div className="mode-buttons">
                            <button
                                className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
                                onClick={() => setMode('ai')}
                            >
                                <Wand2 size={20} />
                                <span>Create with AI</span>
                                <small>Enter topic, AI writes script</small>
                            </button>
                            <button
                                className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
                                onClick={() => setMode('manual')}
                            >
                                <FileText size={20} />
                                <span>Write Manually</span>
                                <small>Write your own script</small>
                            </button>
                        </div>
                    </div>

                    {/* AI Mode */}
                    {mode === 'ai' && (
                        <div className="input-section">
                            <h3><Sparkles size={18} /> Shorts Topic</h3>
                            <textarea
                                placeholder="Örnek: Mars'ta kahve içen bir astronot, etrafında uzay çiçekleri açıyor..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                rows={3}
                            />

                            <div className="scene-count-selector">
                                <label>Scene Count:</label>
                                <div className="count-buttons">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                        <button
                                            key={n}
                                            className={sceneCount === n ? 'active' : ''}
                                            onClick={() => setSceneCount(n)}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="scene-duration-selector">
                                <label>Duration per Scene:</label>
                                <div className="duration-mode-buttons">
                                    <button
                                        className={durationMode === 'auto' ? 'active' : ''}
                                        onClick={() => setDurationMode('auto')}
                                    >
                                        Auto (AI Decides)
                                    </button>
                                    <button
                                        className={durationMode === 'manual' ? 'active' : ''}
                                        onClick={() => setDurationMode('manual')}
                                    >
                                        Manual ({manualDuration}s)
                                    </button>
                                </div>

                                {durationMode === 'manual' && (
                                    <div className="duration-slider-container">
                                        <input
                                            type="range"
                                            min="5"
                                            max="15"
                                            value={manualDuration}
                                            onChange={(e) => setManualDuration(Number(e.target.value))}
                                            className="duration-slider"
                                        />
                                        <div className="slider-labels">
                                            <span>5s</span>
                                            <span className="current-val">{manualDuration}s</span>
                                            <span>15s</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleGenerateScript}
                                disabled={isGeneratingScript || !topic.trim()}
                            >
                                {isGeneratingScript ? (
                                    <>
                                        <RefreshCw size={18} className="spin" />
                                        Generating Script...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={18} />
                                        Generate Script
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Manual Mode */}
                    {mode === 'manual' && (
                        <div className="input-section">
                            <h3><FileText size={18} /> Write Your Script</h3>
                            <textarea
                                placeholder={`Scene 1: Astronaut walking on Mars surface, red soil and rocks visible

Scene 2: Astronaut bends down and finds a strange plant, purple and glowing

Scene 3: Close-up of the plant, its leaves slowly moving

...continue`}
                                value={manualScript}
                                onChange={(e) => setManualScript(e.target.value)}
                                rows={8}
                            />

                            <div className="scene-count-selector">
                                <label>Scene Count:</label>
                                <div className="count-buttons">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                        <button
                                            key={n}
                                            className={sceneCount === n ? 'active' : ''}
                                            onClick={() => setSceneCount(n)}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleParseManualScript}
                                disabled={!manualScript.trim()}
                            >
                                <Check size={18} />
                                Confirm Script
                            </button>
                        </div>
                    )}

                    {/* Generated Scenes Preview */}
                    {scenes.length > 0 && (
                        <div className="scenes-preview">
                            <h3><Film size={18} /> Scenes ({scenes.length} scenes, ~{totalDuration}s)</h3>
                            <div className="scenes-grid">
                                {scenes.map((scene) => (
                                    <div key={scene.sceneNumber} className="scene-card">
                                        <div className="scene-header">
                                            <span className="scene-number">Scene {scene.sceneNumber}</span>
                                            <span className="scene-duration">{scene.duration}s</span>
                                        </div>
                                        <p className="scene-desc">{scene.description}</p>
                                        <small className="scene-prompt">{scene.imagePrompt.substring(0, 100)}...</small>
                                    </div>
                                ))}
                            </div>

                            {/* Credit Preview */}
                            <CreditPreview
                                estimatedCost={estimatedCost}
                                currentBalance={subscription?.credits || 0}
                                operation="Shorts creation"
                            />

                            <button
                                className="btn btn-success btn-lg"
                                onClick={handleProcessScenes}
                                disabled={isProcessing || (subscription ? subscription.credits < estimatedCost : false)}
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshCw size={20} className="spin" />
                                        {progress?.message || 'Processing...'}
                                    </>
                                ) : (
                                    <>
                                        <Video size={20} />
                                        🚀 Create Shorts Video
                                    </>
                                )}
                            </button>

                            {/* Progress */}
                            {progress && isProcessing && (
                                <div className="progress-section">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                        />
                                    </div>
                                    <p>{progress.message}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generated Results */}
                    {generatedScenes.length > 0 && (
                        <div className="results-section">
                            <h3><Check size={18} /> Generated Scenes</h3>
                            <div className="results-grid">
                                {generatedScenes.map((scene) => (
                                    <div key={scene.sceneNumber} className="result-card">
                                        <div className="result-media">
                                            {scene.videoUrl ? (
                                                <video
                                                    src={scene.videoUrl}
                                                    controls
                                                    preload="metadata"
                                                    poster={scene.imageUrl}
                                                    crossOrigin="anonymous"
                                                    onError={(e) => console.error('Video load error:', e)}
                                                    playsInline
                                                />
                                            ) : scene.imageUrl ? (
                                                <img
                                                    src={scene.imageUrl}
                                                    alt={`Scene ${scene.sceneNumber}`}
                                                    crossOrigin="anonymous"
                                                    onError={(e) => console.error('Image load error:', e)}
                                                />
                                            ) : (
                                                <div className="loading-placeholder">Loading...</div>
                                            )}
                                        </div>
                                        <div className="result-info">
                                            <span>Scene {scene.sceneNumber}</span>
                                            <span>{scene.duration}s</span>
                                        </div>
                                        <div className="result-actions">
                                            <button onClick={() => handleDownloadFile(scene.imageUrl, `scene_${scene.sceneNumber}.png`)} className="btn btn-sm">
                                                <ImageIcon size={14} /> Image
                                            </button>
                                            {scene.videoUrl && (
                                                <button onClick={() => handleDownloadFile(scene.videoUrl, `scene_${scene.sceneNumber}.mp4`)} className="btn btn-sm">
                                                    <Download size={14} /> Video
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="final-actions">
                                {!finalVideoUrl ? (
                                    <button
                                        className="btn btn-success btn-lg"
                                        onClick={handleMergeVideos}
                                        disabled={isMerging || !generatedScenes.every(s => s.videoUrl)}
                                    >
                                        {isMerging ? (
                                            <>
                                                <RefreshCw size={20} className="spin" />
                                                Merging Videos...
                                            </>
                                        ) : (
                                            <>
                                                <Film size={20} />
                                                🎬 Merge All Videos
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="final-video">
                                        <h4>🎉 Your Shorts Video is Ready!</h4>
                                        <video
                                            src={finalVideoUrl}
                                            controls
                                            className="final-video-player"
                                        />
                                        <button
                                            onClick={() => handleDownloadFile(finalVideoUrl!, 'shorts_video.mp4')}
                                            className="btn btn-primary btn-lg"
                                        >
                                            <Download size={20} />
                                            Download Video
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="shorts-sidebar">
                    <div className="sidebar-card">
                        <h3>🔥 Trending Topics</h3>
                        <div className="trending-list">
                            {trendingTopics.map((item) => (
                                <button
                                    key={item.id}
                                    className="trending-item"
                                    onClick={() => setTopic(item.topic)}
                                >
                                    <span>{item.topic}</span>
                                    <span className="growth">{item.growth}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="sidebar-card">
                        <h3>💡 Shorts Tips</h3>
                        <ul className="tips-list">
                            <li>✓ Hook viewers in the first 1 second</li>
                            <li>✓ Use vertical format (9:16)</li>
                            <li>✓ 6-8 scenes is ideal</li>
                            <li>✓ Each scene 8-15 seconds</li>
                            <li>✓ Visual consistency is key</li>
                        </ul>
                    </div>

                    <div className="sidebar-card info">
                        <h3><AlertCircle size={16} /> How It Works?</h3>
                        <ol>
                            <li>Enter a topic or write a script</li>
                            <li>AI generates visuals scene by scene</li>
                            <li>Images are converted to video</li>
                            <li>Download and merge your videos</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Upgrade Modal */}
            {
                showUpgradeModal && subscription && (
                    <UpgradeModal
                        isOpen={showUpgradeModal}
                        onClose={() => setShowUpgradeModal(false)}
                        currentPlan={subscription.plan_type as PlanType}
                        requiredPlan={PlanType.PROFESSIONAL}
                        feature={upgradeReason || 'Premium features'}
                        onUpgrade={(planType) => {
                            upgradeSubscription(planType);
                            setShowUpgradeModal(false);
                        }}
                    />
                )
            }

            {/* Insufficient Credits Modal */}
            <InsufficientCreditsModal
                isOpen={showInsufficientCreditsModal}
                onClose={() => setShowInsufficientCreditsModal(false)}
                required={estimatedCost}
                available={subscription?.credits || 0}
                operation="Shorts creation"
            />
        </div >
    );
}

export default ShortsCreate;
