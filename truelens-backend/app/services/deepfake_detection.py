import io
import logging

logger = logging.getLogger(__name__)

# Lazy initialization variables
_model = None
_processor = None
_import_error = None
MODEL_NAME = "prithivMLmods/Deepfake-Detect-Siglip2"

def _load_model():
    """Lazy load the deepfake detection model."""
    global _model, _processor, _import_error
    if _import_error:
        raise _import_error
    if _model is not None and _processor is not None:
        return

    try:
        import torch
        from transformers import AutoImageProcessor, AutoModelForImageClassification

        logger.info(f"Loading {MODEL_NAME} for the first time... this may take a moment.")
        _processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
        _model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
        _model.eval()  # Set to evaluation mode

        # Use GPU if available
        if torch.cuda.is_available():
            _model = _model.to("cuda")

        logger.info(f"{MODEL_NAME} loaded successfully.")
    except Exception as e:
        _import_error = e
        logger.error(f"Failed to load deepfake model: {e}")
        raise


def detect_deepfake(image_bytes: bytes) -> dict:
    """
    Analyzes an image using Deepfake-Detect-Siglip2 to determine if it is authentic or AI generated.
    """
    try:
        import torch
        from PIL import Image

        _load_model()

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Prepare inputs
        inputs = _processor(images=image, return_tensors="pt")

        if torch.cuda.is_available():
            inputs = {k: v.to("cuda") for k, v in inputs.items()}

        with torch.no_grad():
            outputs = _model(**inputs)

        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=1).squeeze().tolist()

        labels = _model.config.id2label
        # Map probabilities to classes
        predictions = {labels[i]: round(probs[i], 3) for i in range(len(probs))}

        # Determine the winner
        predicted_label = "Fake" if predictions.get("Fake", 0) > predictions.get("Real", 0) else "Real"
        confidence = predictions[predicted_label]

        return {
            "label": predicted_label,
            "confidence": confidence,
            "probabilities": predictions,
            "detailed_analysis": {
                "model": MODEL_NAME,
                "fake_probability": predictions.get("Fake", 0),
                "real_probability": predictions.get("Real", 0)
            }
        }
    except Exception as e:
        logger.error(f"Error in deepfake detection: {e}")
        return {
            "label": "Unknown",
            "confidence": 0.0,
            "probabilities": {"Fake": 0.0, "Real": 0.0},
            "error": str(e)
        }
