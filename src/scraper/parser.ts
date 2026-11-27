export function parseTimeText(timeStr: string | null | undefined): number {
    if (!timeStr) return 0;

    const cleanStr = timeStr.replace("-", "").trim();
    const parts = cleanStr.split(":").map(Number);

    if (parts.length === 2) {
        const [m = 0, s = 0] = parts;
        if (Number.isNaN(m) || Number.isNaN(s)) return 0;
        return (m * 60 + s) * 1000;
    } else if (parts.length === 3) {
        const [h = 0, m = 0, s = 0] = parts;
        if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return 0;
        return (h * 3600 + m * 60 + s) * 1000;
    }
    return 0;
}

export function getStandardVideoStats() {
    let bestVideo: HTMLVideoElement | null = null;
    let maxArea = -1;

    for (const video of document.querySelectorAll("video")) {
        if (!video.paused && !video.ended && Number.isFinite(video.duration)) {
            bestVideo = video;
            break;
        }

        const rect = video.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > maxArea) {
            maxArea = area;
            bestVideo = video;
        }
    }

    const videoElement = bestVideo;

    if (videoElement) {
        const duration =
            videoElement.duration && Number.isFinite(videoElement.duration)
                ? Math.floor(videoElement.duration * 1000)
                : 0;

        const current =
            videoElement.currentTime &&
            Number.isFinite(videoElement.currentTime)
                ? Math.floor(videoElement.currentTime * 1000)
                : 0;

        return {
            currentMs: current,
            durationMs: duration,
            isPaused: videoElement.paused || videoElement.ended,
        };
    }

    const elapsedElement = document.querySelector(".jw-text-elapsed");
    const countdownElement = document.querySelector(".jw-text-countdown");
    const pausedElement = document.querySelector(".jw-state-paused");

    if (elapsedElement || countdownElement) {
        const currentMs = parseTimeText(elapsedElement?.textContent);
        const remainingMs = parseTimeText(countdownElement?.textContent);

        return {
            currentMs,
            durationMs: currentMs + remainingMs,
            isPaused: !!pausedElement,
        };
    }

    return {
        currentMs: 0,
        durationMs: 0,
        isPaused: null,
    };
}
