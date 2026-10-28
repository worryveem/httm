"""
Test suite for simplified Audio Alarm System in Antigravity PANNs Audio Recognition
Verifies:
1. When alarm toggle is ON:
   - Dangerous sound detected -> alarm triggers.
   - Normal sound detected -> alarm does NOT trigger.
2. When alarm toggle is OFF:
   - Dangerous sound detected -> alarm does NOT trigger.
   - Normal sound detected -> alarm does NOT trigger.
3. Dangerous labels strictly exist in AudioSet classes (no assumptions).
4. Audio file exists and is ready for playback.
"""

import unittest
import os
import sys

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils import config

DANGER_LABELS = {
    "Siren",
    "Alarm",
    "Fire alarm",
    "Smoke detector, smoke alarm",
    "Civil defense siren",
    "Police car (siren)",
    "Ambulance (siren)",
    "Fire engine, fire truck (siren)",
    "Car alarm",
    "Explosion",
    "Gunshot, gunfire",
    "Glass",
    "Screaming",
    "Fire",
    "Emergency vehicle",
    "Smash, crash"
}

def evaluate_alarm_decision(predictions, alarm_enabled):
    """
    Mirroring simplified App.jsx logic:
    if (alarmEnabled) {
      const isDanger = (data.predictions || []).some(item => DANGER_LABELS.has(item.label));
      if (isDanger) playAlarm();
    }
    """
    if not alarm_enabled:
        return {"play_alarm": False, "reason": "alarm_off"}
    
    is_danger = any(item['label'] in DANGER_LABELS for item in predictions)
    if is_danger:
        return {"play_alarm": True, "reason": "danger_detected"}
    return {"play_alarm": False, "reason": "normal_audio"}


class TestSimplifiedAudioAlarm(unittest.TestCase):
    def test_1_labels_strictly_exist_in_model(self):
        """Rule: Only use labels that actually exist in the model's 527 classes."""
        available_labels = set(config.labels)
        for label in DANGER_LABELS:
            self.assertIn(label, available_labels, f"Label '{label}' must exist in AudioSet classes!")

    def test_2_alarm_on_and_danger_detected_plays_alarm(self):
        """When alarm is ON, analyzing dangerous sound triggers alarm."""
        danger_preds = [{"label": "Siren", "score": 0.89}, {"label": "Speech", "score": 0.12}]
        res = evaluate_alarm_decision(danger_preds, alarm_enabled=True)
        self.assertTrue(res["play_alarm"])
        self.assertEqual(res["reason"], "danger_detected")

    def test_3_alarm_on_and_normal_sound_does_not_play_alarm(self):
        """When alarm is ON, analyzing normal sound does NOT trigger alarm."""
        normal_preds = [{"label": "Speech", "score": 0.95}, {"label": "Music", "score": 0.40}]
        res = evaluate_alarm_decision(normal_preds, alarm_enabled=True)
        self.assertFalse(res["play_alarm"])
        self.assertEqual(res["reason"], "normal_audio")

    def test_4_alarm_off_and_danger_detected_does_not_play_alarm(self):
        """When alarm is OFF, analyzing dangerous sound does NOT trigger alarm."""
        danger_preds = [{"label": "Siren", "score": 0.92}, {"label": "Alarm", "score": 0.85}]
        res = evaluate_alarm_decision(danger_preds, alarm_enabled=False)
        self.assertFalse(res["play_alarm"])
        self.assertEqual(res["reason"], "alarm_off")

    def test_5_alarm_off_and_normal_sound_does_not_play_alarm(self):
        """When alarm is OFF, analyzing normal sound does NOT trigger alarm."""
        normal_preds = [{"label": "Laughter", "score": 0.91}, {"label": "Giggle", "score": 0.60}]
        res = evaluate_alarm_decision(normal_preds, alarm_enabled=False)
        self.assertFalse(res["play_alarm"])
        self.assertEqual(res["reason"], "alarm_off")

    def test_6_audio_siren_file_exists(self):
        """Condition: Audio siren wav files exist in repo for computer speaker playback."""
        frontend_wav = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'alarm_siren.wav')
        resources_wav = os.path.join(os.path.dirname(__file__), '..', 'resources', 'alarm_siren.wav')
        self.assertTrue(os.path.exists(frontend_wav), f"{frontend_wav} must exist")
        self.assertTrue(os.path.exists(resources_wav), f"{resources_wav} must exist")
        self.assertGreater(os.path.getsize(frontend_wav), 10000)


if __name__ == '__main__':
    unittest.main()
