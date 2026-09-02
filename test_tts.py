import unittest
import requests
from sarvam_service import text_to_speech, DUMMY_AUDIO_BASE64

class TestTTS(unittest.TestCase):
    def test_shubh_voice_works(self):
        # Test TTS with shubh voice
        audio_data = text_to_speech("गेहूं का भाव क्या है?", target_language_code="hi-IN", speaker="shubh")
        self.assertIsNotNone(audio_data)
        self.assertGreater(len(audio_data), 0)  # Check audio data exists
    
    def test_multiple_languages(self):
        languages = ["hi-IN", "en-IN", "ta-IN", "te-IN", "ml-IN"]
        for lang in languages:
            audio_data = text_to_speech("Test message", target_language_code=lang, speaker="shubh")
            self.assertIsNotNone(audio_data)
            self.assertGreater(len(audio_data), 0)
    
    def test_parameters_unchanged(self):
        # Verify defaults using reflection or by testing
        # The prompt suggests a hypothetical get_tts_config() which we don't have,
        # but we can verify that the default args on text_to_speech are correct.
        import inspect
        sig = inspect.signature(text_to_speech)
        self.assertEqual(sig.parameters['model'].default, 'bulbul:v3')
        self.assertEqual(sig.parameters['speaker'].default, 'shubh')

if __name__ == '__main__':
    unittest.main()
