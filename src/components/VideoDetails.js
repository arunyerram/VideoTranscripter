import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './css/VideoDetails.css';

const VideoDetails = () => {
    const { id } = useParams();
    const [videoDetails, setVideoDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVideoDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/video/${id}`);
                setVideoDetails(response.data);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch video details');
                setLoading(false);
            }
        };

        if (id) {
            fetchVideoDetails();
        }
    }, [id]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!videoDetails) return <div>No video details found</div>;

    return (
        <div className="video-details">
            <h2>{videoDetails.title}</h2>
            
            {videoDetails.status === 'processing' && (
                <div className="processing-status">
                    Processing video... This may take a few minutes.
                </div>
            )}

            {videoDetails.status === 'completed' && (
                <div className="content">
                    <div className="transcript-section">
                        <h3>Transcript</h3>
                        {videoDetails.segments && videoDetails.segments.map((segment, index) => (
                            <div key={index} className="segment">
                                <h4>Segment {index + 1} ({segment.startTime} - {segment.endTime} minutes)</h4>
                                <p>{segment.text}</p>
                                
                                <div className="mcqs">
                                    <h5>Questions for this segment:</h5>
                                    {segment.mcqs && segment.mcqs.map((mcq, mcqIndex) => (
                                        <div key={mcqIndex} className="mcq">
                                            <p className="question">{mcq.question}</p>
                                            <div className="options">
                                                {mcq.options.map((option, optionIndex) => (
                                                    <div key={optionIndex} className="option">
                                                        <input
                                                            type="radio"
                                                            name={`mcq-${mcqIndex}`}
                                                            id={`option-${mcqIndex}-${optionIndex}`}
                                                            value={option}
                                                        />
                                                        <label htmlFor={`option-${mcqIndex}-${optionIndex}`}>
                                                            {option}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoDetails; 