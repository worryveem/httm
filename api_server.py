import os
import sys
import tempfile
import numpy as np
import torch
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import librosa

# Setup paths
base_dir = os.path.dirname(os.path.abspath(__file__))
pytorch_dir = os.path.join(base_dir, 'pytorch')
utils_dir = os.path.join(base_dir, 'utils')
if pytorch_dir not in sys.path:
    sys.path.insert(0, pytorch_dir)
if utils_dir not in sys.path:
    sys.path.insert(0, utils_dir)

import config
from models import Cnn14, Cnn14_DecisionLevelMax
from pytorch_utils import move_data_to_device

app = FastAPI(title="PANNs Audio Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
MODEL_CACHE = {}

def get_cnn14_model():
    if 'Cnn14' not in MODEL_CACHE:
        ckpt_path = os.path.join(base_dir, "Cnn14_mAP=0.431.pth")
        if not os.path.isfile(ckpt_path):
            raise RuntimeError(f"Checkpoint not found at {ckpt_path}. Please wait for download or provide valid weights.")
        print(f"Loading Cnn14 from {ckpt_path} on {DEVICE}...")
        model = Cnn14(
            sample_rate=config.sample_rate,
            window_size=1024,
            hop_size=320,
            mel_bins=64,
            fmin=50,
            fmax=14000,
            classes_num=config.classes_num
        )
        checkpoint = torch.load(ckpt_path, map_location=DEVICE)
        model.load_state_dict(checkpoint['model'])
        model.to(DEVICE)
        model.eval()
        MODEL_CACHE['Cnn14'] = model
        print("Cnn14 loaded successfully.")
    return MODEL_CACHE['Cnn14']

@app.get("/api/health")
def health_check():
    ckpt_path = os.path.join(base_dir, "Cnn14_mAP=0.431.pth")
    ckpt_ready = os.path.isfile(ckpt_path)
    file_size_mb = 0
    if ckpt_ready:
        file_size_mb = round(os.path.getsize(ckpt_path) / (1024 * 1024), 2)
    return {
        "status": "online",
        "device": str(DEVICE),
        "classes_count": config.classes_num,
        "checkpoint_ready": ckpt_ready and file_size_mb > 300,
        "checkpoint_size_mb": file_size_mb,
    }

@app.get("/api/labels")
def get_labels():
    return {
        "total": len(config.labels),
        "labels": config.labels
    }

@app.post("/api/predict")
async def predict_audio(
    file: UploadFile = File(...),
    top_k: int = Form(10),
    threshold: float = Form(0.0)
):
    temp_path = None
    try:
        # Check model checkpoint
        ckpt_path = os.path.join(base_dir, "Cnn14_mAP=0.431.pth")
        if not os.path.isfile(ckpt_path) or os.path.getsize(ckpt_path) < 300 * 1024 * 1024:
            raise HTTPException(
                status_code=503, 
                detail="Pretrained weights Cnn14_mAP=0.431.pth are still downloading. Please retry in a moment."
            )

        suffix = os.path.splitext(file.filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_path = tmp.name

        sample_rate = config.sample_rate
        # Load audio using librosa
        try:
            waveform, sr = librosa.core.load(temp_path, sr=sample_rate, mono=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode audio: {str(e)}")

        duration = float(len(waveform)) / sample_rate

        # Prepare waveform tensor
        waveform_tensor = waveform[None, :]  # shape: (1, samples)
        waveform_tensor = move_data_to_device(waveform_tensor, DEVICE)

        model = get_cnn14_model()
        with torch.no_grad():
            output_dict = model(waveform_tensor, None)

        clipwise_output = output_dict['clipwise_output'].data.cpu().numpy()[0]
        sorted_indexes = np.argsort(clipwise_output)[::-1]

        results = []
        labels = config.labels
        for idx in sorted_indexes:
            score = float(clipwise_output[idx])
            if score < threshold and len(results) >= min(5, top_k):
                break
            results.append({
                "label": labels[idx],
                "score": round(score, 4),
                "percentage": round(score * 100, 2)
            })
            if len(results) >= top_k:
                break

        has_embedding = 'embedding' in output_dict
        embedding_shape = list(output_dict['embedding'].shape) if has_embedding else None

        # Sample amplitude waveform for visualization (downsampled to 100 points)
        downsample_factor = max(1, len(waveform) // 100)
        downsampled_wave = [round(float(x), 3) for x in waveform[::downsample_factor][:100]]

        return {
            "filename": file.filename,
            "duration_seconds": round(duration, 2),
            "sample_rate": sample_rate,
            "predictions": results,
            "waveform_preview": downsampled_wave,
            "has_embedding": has_embedding,
            "embedding_shape": embedding_shape
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="127.0.0.1", port=8000, reload=False)
