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
import { saveVideo } from '../services/videoLibrary';
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
                title: 'Trend önerisi yüklendi',
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
    const handleMergeVideos = async () => {
        if (generatedScenes.length === 0 || !generatedScenes.every(s => s.videoUrl)) {
            addNotification({
                type: 'warning',
                title: 'Videolar Yok',
                message: 'Birleştirilecek video bulunamadı.',
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

            setFinalVideoUrl(url);

            addNotification({
                type: 'success',
                title: 'Video Birleştirildi!',
                message: 'Shorts videonuz hazır!',
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
                title: 'Birleştirme Hatası',
                message: error instanceof Error ? error.message : 'Bilinmeyen hata',
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
                title: 'Konu Gerekli',
                message: 'Lütfen shorts konusu girin.',
            });
            return;
        }

        setIsGeneratingScript(true);
        try {
            const generatedScenes = await generateShortsScript(topic, sceneCount);
            setScenes(generatedScenes);
            addNotification({
                type: 'success',
                title: 'Senaryo Hazır',
                message: `${generatedScenes.length} sahnelik senaryo oluşturuldu!`,
            });
        } catch (error) {
            console.error('Script generation error:', error);
            addNotification({
                type: 'error',
                title: 'Senaryo Hatası',
                message: error instanceof Error ? error.message : 'Bilinmeyen hata',
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
                title: 'Senaryo Gerekli',
                message: 'Lütfen senaryo yazın.',
            });
            return;
        }

        const parsedScenes = parseManualScript(manualScript, sceneCount);
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
                title: 'Senaryo Yok',
                message: 'Önce senaryo oluşturun.',
            });
            return;
        }

        // Credit validation
        if (!subscription || !user) {
            addNotification({
                type: 'error',
                title: 'Abonelik Gerekli',
                message: 'Lütfen giriş yapın.',
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
                title: 'Shorts Hazır!',
                message: `${results.length} sahne başarıyla oluşturuldu! ${cost} kredi kullanıldı.`,
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
                title: 'İşlem Hatası',
                message: error instanceof Error ? error.message : 'Bilinmeyen hata',
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
                                    {[2, 3, 4, 5, 6, 7, 8].map(n => (
                                        <button
                                            key={n}
                                            className={sceneCount === n ? 'active' : ''}
                                            onClick={() => setSceneCount(n)}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <small>{sceneCount * 8} - {sceneCount * 15} saniye arası video</small>
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
                            <h3><FileText size={18} /> Senaryonuzu Yazın</h3>
                            <textarea
                                placeholder={`Sahne 1: Astronot Mars yüzeyinde yürüyor, kırmızı toprak ve kayalar görünüyor

Sahne 2: Astronot eğilip garip bir bitki buluyor, mor renkli ve parlıyor

Sahne 3: Bitkiye yakın çekim, yaprakları yavaşça hareket ediyor

...devam edin`}
                                value={manualScript}
                                onChange={(e) => setManualScript(e.target.value)}
                                rows={8}
                            />

                            <div className="scene-count-selector">
                                <label>Scene Count:</label>
                                <div className="count-buttons">
                                    {[2, 3, 4, 5, 6, 7, 8].map(n => (
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
                                Senaryoyu Onayla
                            </button>
                        </div>
                    )}

                    {/* Generated Scenes Preview */}
                    {scenes.length > 0 && (
                        <div className="scenes-preview">
                            <h3><Film size={18} /> Sahneler ({scenes.length} sahne, ~{totalDuration}s)</h3>
                            <div className="scenes-grid">
                                {scenes.map((scene) => (
                                    <div key={scene.sceneNumber} className="scene-card">
                                        <div className="scene-header">
                                            <span className="scene-number">Sahne {scene.sceneNumber}</span>
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
                                operation="Shorts oluşturma"
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
                                                    alt={`Sahne ${scene.sceneNumber}`}
                                                    crossOrigin="anonymous"
                                                    onError={(e) => console.error('Image load error:', e)}
                                                />
                                            ) : (
                                                <div className="loading-placeholder">Yükleniyor...</div>
                                            )}
                                        </div>
                                        <div className="result-info">
                                            <span>Sahne {scene.sceneNumber}</span>
                                            <span>{scene.duration}s</span>
                                        </div>
                                        <div className="result-actions">
                                            <a href={scene.imageUrl} download className="btn btn-sm">
                                                <ImageIcon size={14} /> Görsel
                                            </a>
                                            {scene.videoUrl && (
                                                <a href={scene.videoUrl} download className="btn btn-sm">
                                                    <Download size={14} /> Video
                                                </a>
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
                                                Videolar Birleştiriliyor...
                                            </>
                                        ) : (
                                            <>
                                                <Film size={20} />
                                                🎬 Tüm Videoları Birleştir
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="final-video">
                                        <h4>🎉 Shorts Videonuz Hazır!</h4>
                                        <video
                                            src={finalVideoUrl}
                                            controls
                                            className="final-video-player"
                                        />
                                        <a
                                            href={finalVideoUrl}
                                            download="shorts_video.mp4"
                                            className="btn btn-primary btn-lg"
                                        >
                                            <Download size={20} />
                                            Videoyu İndir
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="shorts-sidebar">
                    <div className="sidebar-card">
                        <h3>🔥 Trend Konular</h3>
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
                            <li>✓ İlk 1 saniyede dikkat çek</li>
                            <li>✓ Dikey format (9:16) kullan</li>
                            <li>✓ 6-8 sahne ideal</li>
                            <li>✓ Her sahne 8-15 saniye</li>
                            <li>✓ Görsel tutarlılık önemli</li>
                        </ul>
                    </div>

                    <div className="sidebar-card info">
                        <h3><AlertCircle size={16} /> How It Works?</h3>
                        <ol>
                            <li>Konu yaz veya senaryo gir</li>
                            <li>AI sahne sahne görsel oluşturur</li>
                            <li>Görseller videoya dönüştürülür</li>
                            <li>Videoları indir ve birleştir</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Upgrade Modal */}
            {showUpgradeModal && subscription && (
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
            )}

            {/* Insufficient Credits Modal */}
            <InsufficientCreditsModal
                isOpen={showInsufficientCreditsModal}
                onClose={() => setShowInsufficientCreditsModal(false)}
                required={estimatedCost}
                available={subscription?.credits || 0}
                operation="Shorts oluşturma"
            />
        </div>
    );
}

export default ShortsCreate;
