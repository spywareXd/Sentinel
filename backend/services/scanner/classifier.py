# backend/services/scanner/classifier.py

from transformers import pipeline
import torch

# Check for GPU
device = 0 if torch.cuda.is_available() else -1

print("Loading ToxicBERT model...")
# Using unitary/toxic-bert for fast, specialized toxicity detection
classifier = pipeline(
    "text-classification",
    model="unitary/toxic-bert",
    device=device
)
print("ToxicBERT model loaded.")

def is_suspicious(message: str, threshold: float = 0.5) -> bool:
    """
    Step 1: Rapidly scan a message to see if it's potentially toxic.
    If scores for any toxic category are above the threshold, mark as suspicious.
    """
    if not message or len(message.strip()) == 0:
        return False
        
    results = classifier(message)
    # toxic-bert returns a list like: [{'label': 'toxic', 'score': 0.99}]
    # It only returns the top label by default. For toxicity, if the 'label' is not 'neutral'
    # and the score is high, it's suspicious. 
    # Actually, unitary/toxic-bert labels are: toxic, severe_toxic, obscene, threat, insult, identity_hate.
    # If the score is high for any of these, it's suspicious.
    
    # Let's get the score for 'toxic' specifically as a general gatekeeper.
    # Note: toxic-bert gives 6 labels. We can check if any score > threshold.
    # Since we use pipeline("text-classification"), it only returns the top label.
    
    top_result = results[0]
    if top_result['score'] > threshold:
        return True
        
    return False

if __name__ == "__main__":
    test_msgs = [
        "Hello, how are you today?",
        "I hope you have a terrible day and die.",
        "You are a stupid idiot.",
        "Let's play some games!"
    ]
    for msg in test_msgs:
        print(f"Message: '{msg}' | Suspicious: {is_suspicious(msg)}")
