from flask import Flask, request, jsonify, send_from_directory
from llama_cpp import Llama
import os

# Function to load all available models in the '/models/' directory
def load_models(directory):
    models = {}
    for filename in os.listdir(directory):
        model_name = os.path.splitext(filename)[0]
        model_path = os.path.join(directory, filename)
        models[model_name] = Llama(model_path=model_path)
    return models

model_paths = load_models('/models')

app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/v1/models/', methods=['GET'])
def list_models():
    return jsonify(list(model_paths.keys()))

@app.route('/api/v1/models/generate', methods=['POST'])
def generate_text():
    data = request.json
    model_name = data.get('model')  # Name of the model to use
    if model_name not in model_paths:
        return jsonify({"error": "Model not found"}), 404

    llm = model_paths[model_name]
    prompt = data.get('prompt', '')
    max_tokens = data.get('max_tokens', 512)  # Default value
    response_json = llm(prompt, max_tokens=max_tokens)
    model_response = response_json['choices'][0]['text'].strip()
    return jsonify({"response": model_response})

#  localhost:5000/api/v1/generate
#  {
#    "model": "<model name>"    
#    "prompt": "Text of the prompt you want to send to the model",
#    "max_tokens": 800  // optional
#  }

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')

