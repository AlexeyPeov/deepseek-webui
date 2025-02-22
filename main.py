from flask import Flask, request, Response, send_from_directory
from flask_cors import CORS
import requests
import json

app = Flask(__name__, static_folder='')
CORS(app)

OLLAMA_API_URL = 'http://localhost:11434/api/chat'

@app.route('/')
def index():
    return send_from_directory('', 'index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get('message')
    
    def generate():
        with requests.post(OLLAMA_API_URL, json={"model": "deepseek-r1:14b", "messages": [{"role": "user", "content": user_input}]}, stream=True) as r:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    data = json.loads(chunk.decode('utf-8'))
                    content = data["message"]["content"]
                    yield f"{content}\n"
    
    return Response(generate(), content_type='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
