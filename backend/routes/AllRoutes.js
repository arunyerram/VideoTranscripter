const express = require("express");
require('dotenv').config();
const { Video } = require("../Models/AllSchema");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const FormData = require("form-data");
const { processVideo } = require('../controllers/videoController');

const allroutes = express.Router();

allroutes.use(express.json());
allroutes.use("/videos", express.static("videos"));


ffmpeg.setFfmpegPath('C:/Users/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe'); // Adjust the path as needed

const writeFile = (filePath, data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, "utf8", (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

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

const assemblyaiKey = process.env.ASSEMBLYAI_KEY;
const uploadAudioToAssemblyAI = async (filePath) => {
    const formData = new FormData();
    formData.append("audio", fs.createReadStream(filePath));

    try {
        const response = await axios.post("https://api.assemblyai.com/v2/upload", formData, {
            headers: {
                "authorization": "443e85486085485189193ac8a9867902",
                ...formData.getHeaders(),
            },
        });
        return response.data.upload_url;
    } catch (error) {
        console.error("Error uploading audio to AssemblyAI:", error);
        throw error;
    }
};

const transcribeAudioToText = async (audioUrl) => {
    const config = { audio_url: audioUrl };

    try {
        const response = await axios.post("https://api.assemblyai.com/v2/transcript", config, {
            headers: {
                "authorization": "443e85486085485189193ac8a9867902",
            },
        });
        const transcriptId = response.data.id;

        let transcript;
        while (true) {
            const transcriptResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: {
                    "authorization": "443e85486085485189193ac8a9867902",
                },
            });
            transcript = transcriptResponse.data;

            if (transcript.status === "completed") {
                break;
            } else if (transcript.status === "failed") {
                throw new Error("Transcription failed");
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        return transcript.text;
    } catch (error) {
        console.error("Error transcribing audio to text:", error);
        throw error;
    }
};


// Video upload and retrieval routes
const uploadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./videos");
        console.log("u reached backend video file");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + file.originalname);
        console.log("you reached backend video file");
    },
});

const uploadVideo = multer({ storage: uploadStorage });
allroutes.post("/uploadvideos", uploadVideo.single("file"), async (req, res) => {
    

    console.log(req.file);
    const title = req.body.title;
    const fileName = req.file.filename;
    try {
        const video = new Video({
            title: title,
            video: fileName,
            status: 'pending'
        });
        await video.save();
        
        // Start processing the video in the background
        processVideo(video._id);
        
        const videoPath = path.join(__dirname, "..", "videos", fileName);
        const outputAudioPath = videoPath.replace(".mp4", ".mp3");
        await convertVideoToAudio(videoPath, outputAudioPath);

        const audioUrl = await uploadAudioToAssemblyAI(outputAudioPath);
        const transcribedText = await transcribeAudioToText(audioUrl);

        const outputTextFileName = fileName.replace(".mp4", ".txt");
        const outputTextFilePath = path.join(__dirname, "..", "videos", outputTextFileName);
        await writeFile(outputTextFilePath, transcribedText);

        req.app.locals.videoTextFilePath = outputTextFilePath;

        res.json({ status: 'ok', data: video });
    } catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).json({ status: "error", message: "Failed to upload video" });
    }
});


allroutes.get("/getvideos", async (req, res) => {
    try {
        const videos = await Video.find({}, 'title video status');
        res.json({ status: 'ok', data: videos });
    } catch (error) {
        console.error("Error retrieving videos:", error);
        res.status(500).json({ status: "error", message: "Failed to retrieve videos" });
    }
});

// Get video details route
allroutes.get('/video/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ status: 'error', message: 'Video not found' });
        }
        res.json(video);
    } catch (error) {
        console.error('Error fetching video:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching video' });
    }
});

// Delete video route
allroutes.delete('/delete-video/:id', async (req, res) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);
        if (!video) {
            return res.status(404).json({ status: 'error', message: 'Video not found' });
        }
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ status: 'error', message: 'Error deleting video' });
    }
});

// 
module.exports = allroutes;


