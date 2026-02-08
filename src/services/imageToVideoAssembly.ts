/**
 * Image to Video Assembly Service
 * 
 * Converts AI-generated images to video using FFmpeg
 * Merges with voiceover audio
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { SceneImageData } from './falai';
import type { AssemblyProgress } from './videoAssembly';

/**
 * Download image from URL as Blob
 */
async function downloadImageBlob(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
    }
    const blob = await response.blob();
    return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Convert single image to video with duration
 */
async function imageToVideo(
    ffmpeg: FFmpeg,
    sceneImage: SceneImageData,
    sceneIndex: number,
    onProgress?: (progress: AssemblyProgress) => void
): Promise<string> {
    const inputFileName = `image_${sceneIndex}.jpg`;
    const outputFileName = `scene_${sceneIndex}.mp4`;

    if (onProgress) {
        onProgress({
            stage: 'download',
            progress: 15 + (sceneIndex * 5),
            message: `Sahne ${sceneIndex + 1} görseli indiriliyor...`,
        });
    }

    // Download image
    console.log(`📥 Downloading image for scene ${sceneIndex + 1}...`);
    const imageData = await downloadImageBlob(sceneImage.imageUrl);
    await ffmpeg.writeFile(inputFileName, imageData);
    console.log(`✅ Image downloaded: ${imageData.length} bytes`);

    if (onProgress) {
        onProgress({
            stage: 'process',
            progress: 20 + (sceneIndex * 5),
            message: `Sahne ${sceneIndex + 1} videoya dönüştürülüyor...`,
        });
    }

    const fps = 30;
    const frames = sceneImage.duration * fps;

    // 12 Different Effects - Randomly Select One per Scene
    const effects = [
        {
            name: 'Zoom In (Ken Burns)',
            filter: `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0015,1.15)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Zoom Out',
            filter: `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='max(zoom-0.0015,1.0)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Pan Left',
            filter: `scale=2400:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z=1:d=${frames}:x='iw/2+(iw-ow)/2-t*10':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Pan Right',
            filter: `scale=2400:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z=1:d=${frames}:x='iw/2-(iw-ow)/2+t*10':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Pan Up',
            filter: `scale=1920:1350:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z=1:d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2+(ih-oh)/2-t*5':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Pan Down',
            filter: `scale=1920:1350:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z=1:d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih-oh)/2+t*5':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Diagonal Pan (Top-Left to Bottom-Right)',
            filter: `scale=2400:1350:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z=1:d=${frames}:x='t*8':y='t*4':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Zoom In + Pan Right',
            filter: `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.001,1.1)':d=${frames}:x='iw/2-(iw/zoom/2)+t*5':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Slow Zoom with Rotation',
            filter: `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,rotate=a='t*0.02':c=black:ow=1920:oh=1080,zoompan=z='min(1.0+zoom*0.001,1.08)':d=${frames}:s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Fade In + Zoom',
            filter: `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0012,1.1)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps},fade=t=in:st=0:d=1`,
        },
        {
            name: 'Bounce Zoom',
            filter: `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='1.0+sin(t/2)*0.05':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`,
        },
        {
            name: 'Circular Pan',
            filter: `scale=2200:1200:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z=1:d=${frames}:x='iw/2-(iw/zoom/2)+sin(t/3)*100':y='ih/2-(ih/zoom/2)+cos(t/3)*100':s=1920x1080:fps=${fps}`,
        },
    ];

    // Randomly select an effect for this scene
    const selectedEffect = effects[sceneIndex % effects.length]; // Cycle through effects
    // Or use random: const selectedEffect = effects[Math.floor(Math.random() * effects.length)];

    console.log(`🎬 Converting image ${sceneIndex + 1} to ${sceneImage.duration}s video with "${selectedEffect.name}" effect...`);

    await ffmpeg.exec([
        '-loop', '1',
        '-i', inputFileName,
        '-vf', selectedEffect.filter,
        '-c:v', 'libx264',
        '-t', String(sceneImage.duration),
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '23',
        outputFileName
    ]);

    console.log(`✅ Scene ${sceneIndex + 1} video created (${sceneImage.duration}s with "${selectedEffect.name}")`);

    // Clean up input file
    await ffmpeg.deleteFile(inputFileName);

    return outputFileName;
}

/**
 * Concatenate all scene videos
 */
async function concatenateSceneVideos(
    ffmpeg: FFmpeg,
    sceneFiles: string[],
    onProgress?: (progress: AssemblyProgress) => void
): Promise<string> {
    if (onProgress) {
        onProgress({
            stage: 'merge',
            progress: 70,
            message: 'Sahneler birleştiriliyor...',
        });
    }

    const outputFileName = 'merged_images_video.mp4';

    // Create concat file list
    const concatList = sceneFiles.map(file => `file '${file}'`).join('\n');
    await ffmpeg.writeFile('concat_list.txt', concatList);

    console.log('Concatenating scene videos...');

    // Concatenate videos
    await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c', 'copy',
        outputFileName
    ]);

    console.log('✅ Videos concatenated');

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
            progress: 85,
            message: 'Seslendirme ekleniyor...',
        });
    }

    const audioFileName = 'voiceover.mp3';
    const outputFileName = 'final_ai_video.mp4';

    // Write audio file
    const audioData = await fetchFile(audioBlob);
    await ffmpeg.writeFile(audioFileName, audioData);

    console.log('🎵 Merging audio with video...');

    // Merge video and audio
    await ffmpeg.exec([
        '-i', videoFileName,
        '-i', audioFileName,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-map', '0:v:0',
        '-map', '1:a:0',
        outputFileName
    ]);

    console.log('✅ Audio merged successfully');

    // Clean up
    await ffmpeg.deleteFile(videoFileName);
    await ffmpeg.deleteFile(audioFileName);

    return outputFileName;
}

/**
 * Assemble video from AI images
 */
export async function assembleVideoFromImages(
    ffmpegInstance: FFmpeg,
    sceneImages: SceneImageData[],
    audioBlob: Blob,
    onProgress?: (progress: AssemblyProgress) => void
): Promise<Blob> {
    try {
        console.log(`🎬 Starting image-to-video assembly (${sceneImages.length} scenes)`);

        // Convert each image to video
        const sceneVideoFiles: string[] = [];
        for (let i = 0; i < sceneImages.length; i++) {
            const videoFile = await imageToVideo(ffmpegInstance, sceneImages[i], i, onProgress);
            sceneVideoFiles.push(videoFile);
        }

        // Concatenate all videos
        const mergedVideo = await concatenateSceneVideos(ffmpegInstance, sceneVideoFiles, onProgress);

        // Add audio
        const finalVideo = await addAudioToVideo(ffmpegInstance, mergedVideo, audioBlob, onProgress);

        if (onProgress) {
            onProgress({
                stage: 'export',
                progress: 95,
                message: 'Video hazırlanıyor...',
            });
        }

        // Read final video
        const data = await ffmpegInstance.readFile(finalVideo);
        // @ts-ignore - FFmpeg FileData type compatibility
        const blob = new Blob([data], { type: 'video/mp4' });

        // Clean up
        await ffmpegInstance.deleteFile(finalVideo);

        if (onProgress) {
            onProgress({
                stage: 'done',
                progress: 100,
                message: '✅ AI Video hazır!',
            });
        }

        console.log('✅ Image-to-video assembly complete!');

        return blob;
    } catch (error) {
        console.error('❌ Image-to-video assembly error:', error);
        throw new Error(`Video oluşturulurken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
}
