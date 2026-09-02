import unittest
import os
from dotenv import load_dotenv
load_dotenv()
from ai_pipeline import extract_location_from_message, extract_crop_from_message

class TestLocationOverride(unittest.TestCase):
    def test_extract_location_gorakhpur(self):
        message = "क्या gehun ka price Gorakhpur mein hai?"
        location = extract_location_from_message(message)
        self.assertEqual(location, "gorakhpur")
    
    def test_extract_location_lucknow(self):
        message = "What is rice price in Lucknow?"
        location = extract_location_from_message(message)
        self.assertEqual(location, "lucknow")
    
    def test_no_location(self):
        message = "gehu ka rate kya hai?"
        location = extract_location_from_message(message)
        self.assertIsNone(location)
    
    def test_extract_crop_wheat(self):
        message = "गेहूं का भाव बताओ"
        crop = extract_crop_from_message(message)
        self.assertEqual(crop, "गेहूं")
    
    def test_crop_and_location_override_known(self):
        message = "क्या rice का भाव Gorakhpur में है?"
        location = extract_location_from_message(message)
        crop = extract_crop_from_message(message)
        self.assertEqual(location, "gorakhpur")
        self.assertEqual(crop, "rice")

if __name__ == '__main__':
    unittest.main()
