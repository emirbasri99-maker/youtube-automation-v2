/**
 * Video Assembly Service
 * 
 * Automatically assembles final video from:
 * - Pexels scene videos
 * - Voiceover audio
 * - Script timing
 * 
 * Uses FFmpeg.wasm for browser-side video processing
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { SelectedSceneVideo } from './pexels';

let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoaded = false;

export interface AssemblyProgress {
    stage: 'init' | 'download' | 'process' | 'merge' | 'audio' | 'export' | 'done';
    progress: number; // 0-100
    message: string;
}

export interface AssemblyOptions {
    sceneVideos: SelectedSceneVideo[];
    audioBlob: Blob;
    onProgress?: (progress: AssemblyProgress) => void;
}

/**
 * Initialize FFmpeg instance
 */
async function loadFFmpeg(onProgress?: (progress: AssemblyProgress) => void): Promise<FFmpeg> {
    if (ffmpegInstance && isFFmpegLoaded) {
        return ffmpegInstance;
    }

    if (onProgress) {
        onProgress({
            stage: 'init',
            progress: 0,
            message: 'FFmpeg hazırlanıyor...',
        });
    }

    const ffmpeg = new FFmpeg();

    // Enable logging for debugging
    ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
    });

    ffmpeg.on('progress', ({ progress }) => {
        console.log('[FFmpeg Progress]', progress);
    });

    try {
        console.log('🎬 Attempting to load FFmpeg...');

        // Use CDN URLs - more reliable than local node_modules
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

        console.log(`Loading from: ${baseURL}`);

        await ffmpeg.load({
            coreURL: `${baseURL}/ffmpeg-core.js`,
            wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        });

        console.log('✅ FFmpeg loaded successfully!');

        ffmpegInstance = ffmpeg;
        isFFmpegLoaded = true;

        if (onProgress) {
            onProgress({
                stage: 'init',
                progress: 10,
                message: 'FFmpeg hazır!',
            });
        }

        return ffmpeg;
    } catch (error) {
        console.error('❌ FFmpeg load error:', error);

        // Provide detailed error message
        let errorMsg = 'FFmpeg yüklenemedi';
        if (error instanceof Error) {
            console.error('Error details:', error.message, error.stack);
            errorMsg = `FFmpeg hatası: ${error.message}`;
        }

        throw new Error(errorMsg);
    }
}

/**
 * Download video from URL as Blob
 */
async function downloadVideoBlob(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
    }
    const blob = await response.blob();
    return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Process single scene video
 * Trims or loops video to match scene duration
 */
async function processSceneVideo(
    ffmpeg: FFmpeg,
    sceneVideo: SelectedSceneVideo,
    sceneIndex: number,
    onProgress?: (progress: AssemblyProgress) => void
): Promise<string> {
    const inputFileName = `scene_${sceneIndex}_input.mp4`;
    const outputFileName = `scene_${sceneIndex}_output.mp4`;

    if (onProgress) {
        onProgress({
            stage: 'download',
            progress: 15 + (sceneIndex * 10),
            message: `Sahne ${sceneIndex + 1} indiriliyor...`,
        });
    }

    // Download video
    const videoData = await downloadVideoBlob(sceneVideo.selectedFile.link);
    await ffmpeg.writeFile(inputFileName, videoData);

    if (onProgress) {
        onProgress({
            stage: 'process',
            progress: 20 + (sceneIndex * 10),
            message: `Sahne ${sceneIndex + 1} işleniyor...`,
        });
    }

    const targetDuration = Math.round(sceneVideo.scene.duration);

    if (sceneVideo.needsLooping) {
        // Loop video to match duration
        const loopCount = sceneVideo.loopCount || 2;
        await ffmpeg.exec([
            '-stream_loop', String(loopCount - 1),
            '-i', inputFileName,
            '-t', String(targetDuration),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-c:a', 'copy',
            outputFileName
        ]);
    } else {
        // Trim video to duration
        await ffmpeg.exec([
            '-i', inputFileName,
            '-t', String(targetDuration),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-c:a', 'copy',
            outputFileName
        ]);
    }

    // Clean up input file
    await ffmpeg.deleteFile(inputFileName);

    return outputFileName;
}

/**
 * Concatenate all scene videos
 */
async function concatenateScenes(
    ffmpeg: FFmpeg,
    sceneFiles: string[],
    onProgress?: (progress: AssemblyProgress) => void
): Promise<string> {
    if (onProgress) {
        onProgress({
            stage: 'merge',
            progress: 60,
            message: 'Sahneler birleştiriliyor...',
        });
    }

    const outputFileName = 'merged_video.mp4';

    // Create concat file list
    const concatList = sceneFiles.map(file => `file '${file}'`).join('\n');
    await ffmpeg.writeFile('concat_list.txt', concatList);

    // Concatenate videos
    await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c', 'copy',
        outputFileName
    ]);

    // Clean up scene files
    for (const file of sceneFiles) {
        await ffmpeg.deleteFile(file);
    }
    await ffmpeg.deleteFile('concat_list.txt');

    return outputFileName;
}

/**
 * Add audio to video
 */
async function addAudioToVideo(
    ffmpeg: FFmpeg,
    videoFileName: string,
    audioBlob: Blob,
    onProgress?: (progress: AssemblyProgress) => void
): Promise<string> {
    if (onProgress) {
        onProgress({
            stage: 'audio',
            progress: 80,
            message: 'Seslendirme ekleniyor...',
        });
    }

    const audioFileName = 'voiceover.mp3';
    const outputFileName = 'final_video.mp4';

    // Write audio file
    const audioData = await fetchFile(audioBlob);
    await ffmpeg.writeFile(audioFileName, audioData);

    console.log('🎵 Merging audio with video...');

    // Merge video and audio - use audio as master timing
    await ffmpeg.exec([
        '-i', videoFileName,
        '-i', audioFileName,
        '-c:v', 'copy',      // Copy video stream without re-encoding
        '-c:a', 'aac',       // Encode audio as AAC
        '-b:a', '192k',      // Audio bitrate
        '-shortest',         // End output at shortest input (audio or video)
        '-map', '0:v:0',     // Map first video stream from first input
        '-map', '1:a:0',     // Map first audio stream from second input
        outputFileName
    ]);

    console.log('✅ Audio merged successfully');

    // Clean up
    await ffmpeg.deleteFile(videoFileName);
    await ffmpeg.deleteFile(audioFileName);

    return outputFileName;
}

/**
 * Main assembly function
 * Processes all scenes, merges them, adds audio, and exports final video
 */
export async function assembleVideo(options: AssemblyOptions): Promise<Blob> {
    const { sceneVideos, audioBlob, onProgress } = options;

    try {
        // Initialize FFmpeg
        const ffmpeg = await loadFFmpeg(onProgress);

        // Process each scene
        const processedScenes: string[] = [];
        for (let i = 0; i < sceneVideos.length; i++) {
            const outputFile = await processSceneVideo(ffmpeg, sceneVideos[i], i, onProgress);
            processedScenes.push(outputFile);
        }

        // Concatenate all scenes
        const mergedVideo = await concatenateScenes(ffmpeg, processedScenes, onProgress);

        // Add audio
        const finalVideo = await addAudioToVideo(ffmpeg, mergedVideo, audioBlob, onProgress);

        if (onProgress) {
            onProgress({
                stage: 'export',
                progress: 95,
                message: 'Video hazırlanıyor...',
            });
        }

        // Read final video
        const data = await ffmpeg.readFile(finalVideo);
        // @ts-ignore - FFmpeg FileData type compatibility
        const blob = new Blob([data], { type: 'video/mp4' });

        // Clean up
        await ffmpeg.deleteFile(finalVideo);

        if (onProgress) {
            onProgress({
                stage: 'done',
                progress: 100,
                message: '✅ Video hazır!',
            });
        }

        return blob;
    } catch (error) {
        console.error('Video assembly error:', error);
        throw new Error(`Video oluşturulurken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
}

/**
 * Export video as downloadable file
 */
export function downloadVideo(blob: Blob, filename: string = 'youtube-video.mp4') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Get video duration from blob
 */
export async function getVideoDuration(blob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve(video.duration);
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Video metadata could not be loaded'));
        };

        video.src = URL.createObjectURL(blob);
    });
}
