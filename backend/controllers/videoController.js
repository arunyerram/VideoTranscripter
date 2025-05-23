const { Video } = require('../Models/AllSchema');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

// Function to split transcript into 5-minute segments
const splitTranscriptIntoSegments = (transcript, duration) => {
    const segments = [];
    const segmentDuration = 5 * 60; // 5 minutes in seconds
    const totalSegments = Math.ceil(duration / segmentDuration);

    for (let i = 0; i < totalSegments; i++) {
        const startTime = i * segmentDuration;
        const endTime = Math.min((i + 1) * segmentDuration, duration);
        
        // For now, we'll just use the full transcript for each segment
        // In a real implementation, you would split the transcript based on timestamps
        segments.push({
            startTime: startTime / 60, // Convert to minutes
            endTime: endTime / 60,
            text: transcript,
            mcqs: []
        });
    }

    return segments;
};

// Function to generate MCQs using local LLM
const generateMCQs = async (text) => {
    try {
        // Call your local LLM service here
        const response = await axios.post('http://localhost:5001/generate-mcqs', {
            text: text
        });

        return response.data.mcqs;
    } catch (error) {
        console.error('Error generating MCQs:', error);
        return [];
    }
};

// Function to convert video to audio
const convertVideoToAudio = (inputVideo, outputAudio) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputVideo)
            .noVideo()
            .audioCodec("libmp3lame")
            .save(outputAudio)
            .on("end", () => {
                console.log("Conversion complete");
                resolve(outputAudio);
            })
            .on("error", (err) => {
                console.error("Error converting video to audio:", err);
                reject(err);
            });
    });
};

// Function to transcribe audio using AssemblyAI
const transcribeAudio = async (audioPath) => {
    try {
        const formData = new FormData();
        formData.append("audio", fs.createReadStream(audioPath));

        // Upload audio to AssemblyAI
        const uploadResponse = await axios.post("https://api.assemblyai.com/v2/upload", formData, {
            headers: {
                "authorization": process.env.ASSEMBLYAI_KEY,
                ...formData.getHeaders(),
            },
        });

        const audioUrl = uploadResponse.data.upload_url;

        // Start transcription
        const transcriptResponse = await axios.post("https://api.assemblyai.com/v2/transcript", 
            { audio_url: audioUrl },
            {
                headers: {
                    "authorization": process.env.ASSEMBLYAI_KEY,
                },
            }
        );

        const transcriptId = transcriptResponse.data.id;

        // Poll for transcription completion
        let transcript;
        while (true) {
            const statusResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: {
                    "authorization": process.env.ASSEMBLYAI_KEY,
                },
            });
            transcript = statusResponse.data;

            if (transcript.status === "completed") {
                break;
            } else if (transcript.status === "failed") {
                throw new Error("Transcription failed");
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        return transcript.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw error;
    }
};

// Main video processing function
const processVideo = async (videoId) => {
    try {
        const video = await Video.findById(videoId);
        if (!video) {
            throw new Error('Video not found');
        }

        // Update status to processing
        video.status = 'processing';
        await video.save();

        // Get video path and duration
        const videoPath = path.join(__dirname, '..', 'videos', video.video);
        const duration = await new Promise((resolve, reject) => {
            exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, 
                (error, stdout, stderr) => {
                    if (error) reject(error);
                    else resolve(parseFloat(stdout));
                });
        });

        // Convert video to audio
        const audioPath = videoPath.replace('.mp4', '.mp3');
        await convertVideoToAudio(videoPath, audioPath);

        // Transcribe audio
        const transcript = await transcribeAudio(audioPath);

        // Split transcript into segments
        const segments = splitTranscriptIntoSegments(transcript, duration);

        // Generate MCQs for each segment
        for (let segment of segments) {
            segment.mcqs = await generateMCQs(segment.text);
        }

        // Update video with transcript and segments
        video.transcript = transcript;
        video.segments = segments;
        video.status = 'completed';
        await video.save();

        // Clean up temporary files
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }

    } catch (error) {
        console.error('Error processing video:', error);
        const video = await Video.findById(videoId);
        if (video) {
            video.status = 'failed';
            await video.save();
        }
    }
};

module.exports = {
    processVideo
}; 