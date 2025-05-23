from flask import Flask, request, jsonify
from transformers import pipeline
import torch

app = Flask(__name__)

# Initialize the LLM model
# You can replace this with your preferred local LLM
model = pipeline("text2text-generation", model="facebook/bart-large-cnn")

def generate_mcqs(text):
    # This is a placeholder implementation
    # Replace with your actual LLM logic
    prompt = f"Generate 3 multiple choice questions from this text: {text}"
    response = model(prompt, max_length=200, num_return_sequences=1)
    
    # Parse the response and format as MCQs
    # This is a simplified example
    mcqs = [
        {
            "question": "Sample question 1?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Option A"
        },
        {
            "question": "Sample question 2?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Option B"
        },
        {
            "question": "Sample question 3?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Option C"
        }
    ]
    
    return mcqs

@app.route('/generate-mcqs', methods=['POST'])
def generate_mcqs_endpoint():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    mcqs = generate_mcqs(text)
    return jsonify({"mcqs": mcqs})

if __name__ == '__main__':
    app.run(port=5001) 