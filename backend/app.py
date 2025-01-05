from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import base64
from io import BytesIO

app = Flask(__name__)
CORS(app)

model = YOLO("runs/detect/train/weights/best.pt")
@app.route('/')
def root():
    return 'Hello World!'

@app.route('/detect', methods=['POST'])
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    try:
        # Read the image
        image_file = request.files["image"]
        img = Image.open(image_file.stream)
        
        # Get original image dimensions
        width, height = img.size
        
        # Run yolo11n trained model on image
        results = model.predict(img)[0]
        
        # Convert image to base64 for sending back to frontend
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        # Format detections
        detections = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            class_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            
            detections.append({
                "bbox": {
                    "x1": int(x1),
                    "y1": int(y1),
                    "x2": int(x2),
                    "y2": int(y2)
                },
                "class": results.names[class_id],
                "confidence": round(conf * 100, 2)
            })
        
        return jsonify({
            "image": img_str,
            "dimensions": {
                "width": width,
                "height": height
            },
            "detections": detections
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)