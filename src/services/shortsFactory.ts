/**
 * Shorts Factory API Client
 * Communicates with Python backend for AI Shorts generation
 */

export interface ShortsRequest {
    mode: 'idea' | 'manual';
    content: string;
    target_duration: number;
    scene_duration_min: number;
    scene_duration_max: number;
}

export interface JobResponse {
    job_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    message: string;
}

export interface VideoScene {
    scene_id: number;
    voiceover: string;
    image_url: string;
    video_url: string;
    duration: number;
}

export interface JobStatus {
    job_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    current_scene: number;
    total_scenes: number;
    message: string;
    videos: VideoScene[];
    error?: string;
    created_at: string;
    completed_at?: string;
}

const API_BASE_URL = import.meta.env.VITE_SHORTS_API_URL || 'http://localhost:8000';

/**
 * Start a new shorts generation job
 */
export async function generateShorts(request: ShortsRequest): Promise<JobResponse> {
    const response = await fetch(`${API_BASE_URL}/api/shorts/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to start job: ${error}`);
    }

    return response.json();
}

/**
 * Get status of a shorts generation job
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE_URL}/api/shorts/status/${jobId}`);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Job not found');
        }
        const error = await response.text();
        throw new Error(`Failed to get status: ${error}`);
    }

    return response.json();
}

/**
 * Poll job status until completion
 */
export async function pollJobStatus(
    jobId: string,
    onProgress?: (status: JobStatus) => void,
    pollingInterval: number = 2000
): Promise<JobStatus> {
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                const status = await getJobStatus(jobId);

                if (onProgress) {
                    onProgress(status);
                }

                if (status.status === 'completed') {
                    resolve(status);
                } else if (status.status === 'failed') {
                    reject(new Error(status.error || 'Job failed'));
                } else {
                    // Continue polling
                    setTimeout(poll, pollingInterval);
                }
            } catch (error) {
                reject(error);
            }
        };

        poll();
    });
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/shorts/${jobId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to cancel job: ${error}`);
    }
}

/**
 * Check if backend is healthy
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        return response.ok;
    } catch {
        return false;
    }
}
