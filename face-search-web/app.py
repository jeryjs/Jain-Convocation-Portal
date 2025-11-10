import cv2
from flask import Flask, request, jsonify, render_template, send_file
from flask_sock import Sock
import logging
import json
from face_search import find_similar_faces
import os
import base64
from threading import Event
from flask_cors import CORS  # Add this import

app = Flask(__name__)
# Update CORS configuration to be more permissive
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "allow_headers": ["Content-Type"],
        "methods": ["GET", "POST", "OPTIONS"]
    }
})
sock = Sock(app)

print(f"CUDA available: {cv2.cuda.getCudaEnabledDeviceCount() > 0}")

# Configure logging for both app and face_search
logging.basicConfig(
    level=logging.INFO,
    # format='%(asctime)s [%(levelname)s] %(message)s',
    format='%(message)s',
    datefmt='%H:%M:%S'
)

# Set paths
SELFIE_DIR = "selfie_images"
EXCLUDE_FACES_DIR = "Y:/All-Projects/Jain-Convocation-Portal/face-search-web/exclude_faces"
CONVOCATION_PHOTOS_DIR = "Z:/Downloads/jain 14th convo/13-11-2024 Day 1/02PM to 05PM/Stage 1 (Left)"
BASE_PHOTOS_DIR = "Z:/Downloads/jain 14th convo"
os.makedirs(SELFIE_DIR, exist_ok=True)

# Add search cancellation event
active_searches = {}

# Custom logging handler that sends logs to WebSocket clients
class WebSocketHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.clients = set()
        self.search_cancelled = Event()

    def emit(self, record):
        log_entry = {
            # 'time': datetime.now().strftime('%H:%M:%S'),
            # 'level': record.levelname,
            'message': self.format(record)
        }
        message = json.dumps(log_entry)
        dead_clients = set()
        
        for ws in self.clients:
            try:
                ws.send(message)
            except Exception:
                dead_clients.add(ws)
        
        self.clients -= dead_clients
        if not self.clients:  # No clients connected
            self.search_cancelled.set()  # Signal search cancellation

ws_handler = WebSocketHandler()
logging.getLogger().addHandler(ws_handler)
logging.getLogger().setLevel(logging.INFO)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/capture', methods=['POST'])
def capture_image():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415
        
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({"error": "Missing image data"}), 400
        
    try:
        img_data = base64.b64decode(data['image'].split(",")[1])
        selfie_path = os.path.join(SELFIE_DIR, "selfie.jpg")
        
        with open(selfie_path, "wb") as f:
            f.write(img_data)
        
        return jsonify({"status": "success", "message": "Selfie saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sock.route('/ws')
def ws(ws):
    ws_handler.clients.add(ws)
    ws_handler.search_cancelled.clear()  # Reset cancellation flag
    try:
        while True:
            ws.receive()  # Keep connection alive
    except Exception:
        logging.warning("WebUI connection lost")
    finally:
        ws_handler.clients.remove(ws)
        if not ws_handler.clients:  # If no clients left
            ws_handler.search_cancelled.set()

def get_folder_structure():
    try:
        if not os.path.exists(BASE_PHOTOS_DIR):
            logging.error(f"Base directory not found: {BASE_PHOTOS_DIR}")
            return []

        folders = []
        logging.info(f"Recursively scanning directory: {BASE_PHOTOS_DIR}")
        
        def scan_folder(current_path, depth=0):
            try:
                for item in os.listdir(current_path):
                    full_path = os.path.join(current_path, item)
                    if os.path.isdir(full_path):
                        # Create relative path for display
                        rel_path = os.path.relpath(full_path, BASE_PHOTOS_DIR)
                        name = f"{'  ' * depth}└─ {rel_path}"
                        folders.append({
                            'name': name,
                            'path': full_path
                        })
                        logging.info(f"Found folder: {rel_path}")
                        # Recursively scan subfolder
                        scan_folder(full_path, depth + 1)
            except Exception as e:
                logging.error(f"Error scanning {current_path}: {str(e)}")
        
        # Start recursive scan
        scan_folder(BASE_PHOTOS_DIR)
        
        # Sort folders by name for better organization
        folders.sort(key=lambda x: x['name'])
        logging.info(f"Total folders found: {len(folders)}")
        return folders
        
    except Exception as e:
        logging.error(f"Error in get_folder_structure: {str(e)}")
        return []

@app.route('/folders')
def get_folders():
    try:
        folders = get_folder_structure()
        logging.info(f"Returning {len(folders)} folders")
        return jsonify(folders)
    except Exception as e:
        logging.error(f"Error in get_folders: {str(e)}")
        return jsonify([])

@app.route('/search', methods=['POST'])
def search_faces():
    try:
        exclude_dir = EXCLUDE_FACES_DIR
        folder = request.form.get('folder') or CONVOCATION_PHOTOS_DIR
        selfie_path = os.path.join(SELFIE_DIR, "selfie.jpg")
        if not os.path.exists(selfie_path):
            raise FileNotFoundError("Please capture or upload an image first")
            
        logging.info(f"Starting face search in: {folder}")
        ws_handler.search_cancelled.clear()
        
        matches = find_similar_faces(selfie_path, folder, exclude_dir, ws_handler.search_cancelled, 20)
        
        if not matches:
            logging.warning("No matches found")
            return jsonify({"matches": [], "message": "No matches found"})
            
        logging.info(f"Search completed, found {len(matches)} matches")
        results = [{"path": path, "similarity": similarity} for path, similarity in matches]
        return jsonify({"matches": results})
        
    except Exception as e:
        error_msg = str(e)
        if ws_handler.search_cancelled.is_set():
            error_msg = "Search cancelled - connection lost"
        logging.error(f"Search failed: {error_msg}")
        return jsonify({"error": error_msg}), 500
    finally:
        # Force cleanup after search
        from face_search import cleanup_gpu_memory
        cleanup_gpu_memory()

@app.route('/photo/<path:photo_path>')
def serve_photo(photo_path):
    try:
        # Security check to ensure the path is within BASE_PHOTOS_DIR
        full_path = os.path.abspath(photo_path)
        base_dir = os.path.abspath(BASE_PHOTOS_DIR)
        if not full_path.startswith(base_dir):
            logging.error(f"Access denied. Path {full_path} is not within {base_dir}")
            return "Access denied", 403
        return send_file(full_path)
    except Exception as e:
        logging.error(f"Error serving photo {photo_path}: {str(e)}")
        return str(e), 404

if __name__ == "__main__":
    ssl_context = None
    cert_path = 'cert.pem'
    key_path = 'key.pem'
    
    if os.path.exists(cert_path) and os.path.exists(key_path):
        try:
            ssl_context = (cert_path, key_path)
            print("Running with HTTPS enabled")
        except Exception as e:
            print(f"Error setting up SSL: {e}")
            print("Falling back to HTTP")
    else:
        print("SSL certificates not found, running in HTTP mode")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        # ssl_context=ssl_context,
        threaded=True
    )
