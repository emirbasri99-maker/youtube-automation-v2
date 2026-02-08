"""
YouTube Shorts Factory - AI Video Production Engine
Uses Fal.ai for text-to-image and image-to-video generation
"""

import os
import time
import json
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass
from dotenv import load_dotenv
import fal_client
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure APIs
FAL_KEY = os.getenv("FAL_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not FAL_KEY:
    raise ValueError("FAL_KEY not found in environment variables")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)
os.environ["FAL_KEY"] = FAL_KEY


@dataclass
class SceneData:
    """Represents a single scene in the video"""
    scene_id: int
    voiceover: str
    image_prompt: str
    duration: int  # in seconds


@dataclass
class ScenarioOutput:
    """LLM scenario generation output"""
    master_style: str
    character_attributes: str
    total_duration: int
    scenes: List[SceneData]


@dataclass
class VideoScene:
    """Completed video scene with URLs"""
    scene_id: int
    voiceover: str
    image_url: str
    video_url: str
    duration: int


class ShortsFactory:
    """Main class for generating YouTube Shorts"""
    
    def __init__(self):
        self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        
    def _build_scenario_prompt(
        self, 
        user_input: str, 
        target_duration: int,
        scene_duration_range: tuple = (8, 15)
    ) -> str:
        """Build the LLM prompt for scenario generation"""
        
        min_dur, max_dur = scene_duration_range
        num_scenes = target_duration // ((min_dur + max_dur) // 2)
        
        return f"""You are a world-class cinematographer and visual storytelling expert.

TASK: Break down the following idea/story into {num_scenes} visual scenes optimized for AI video generation.

USER INPUT:
{user_input}

CRITICAL RULES FOR VISUAL CONSISTENCY:
1. Define ONE Master Visual Style for the ENTIRE video (e.g., "Cinematic 8k, photorealistic, warm golden hour lighting, film grain, shallow depth of field")
2. Identify main character(s) and their FIXED attributes (e.g., "25-year-old woman with long red curly hair, green eyes, wearing elegant blue silk dress")
3. REPEAT Master Style + Character Attributes in EVERY single scene prompt
4. Each scene duration: {min_dur}-{max_dur} seconds
5. Target total duration: ~{target_duration} seconds

OUTPUT FORMAT (Strict JSON):
{{
  "master_style": "Your defined master visual style",
  "character_attributes": "Detailed character description (if applicable, empty string if no characters)",
  "total_duration": {target_duration},
  "scenes": [
    {{
      "scene_id": 1,
      "voiceover": "What the narrator says or on-screen text",
      "image_prompt": "Detailed visual description + master_style + character_attributes. Be specific about composition, lighting, camera angle.",
      "duration": {min_dur}
    }}
  ]
}}

EXAMPLE SCENE PROMPT:
"Wide shot of a young woman with long red curly hair and green eyes wearing an elegant blue silk dress, standing on a misty mountain peak at sunrise, looking at the horizon. Cinematic 8k, photorealistic, warm golden hour lighting, film grain, shallow depth of field."

Generate the JSON now:"""

    def generate_scenario(
        self,
        user_input: str,
        target_duration: int = 60,
        scene_duration_range: tuple = (8, 15)
    ) -> ScenarioOutput:
        """Generate structured scenario using Gemini LLM"""
        
        print(f"🎬 Generating scenario for: {user_input[:50]}...")
        
        prompt = self._build_scenario_prompt(user_input, target_duration, scene_duration_range)
        
        try:
            response = self.gemini_model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON from markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            scenario_data = json.loads(response_text.strip())
            
            # Parse into dataclass
            scenes = [
                SceneData(
                    scene_id=scene['scene_id'],
                    voiceover=scene['voiceover'],
                    image_prompt=scene['image_prompt'],
                    duration=scene['duration']
                )
                for scene in scenario_data['scenes']
            ]
            
            output = ScenarioOutput(
                master_style=scenario_data['master_style'],
                character_attributes=scenario_data.get('character_attributes', ''),
                total_duration=scenario_data['total_duration'],
                scenes=scenes
            )
            
            print(f"✅ Scenario generated: {len(scenes)} scenes, Master Style: {output.master_style[:50]}...")
            return output
            
        except Exception as e:
            print(f"❌ Error generating scenario: {e}")
            raise

    def create_scene_image(
        self,
        prompt: str,
        scene_id: int,
        retry_count: int = 3
    ) -> str:
        """Generate image for scene using Fal.ai text-to-image"""
        
        print(f"🎨 Creating image for scene {scene_id}...")
        
        for attempt in range(retry_count):
            try:
                result = fal_client.subscribe(
                    "fal-ai/flux-pro/v1.1-ultra",
                    arguments={
                        "prompt": prompt,
                        "image_size": {
                            "width": 720,  # 9:16 aspect ratio
                            "height": 1280
                        },
                        "num_inference_steps": 28,
                        "guidance_scale": 3.5,
                        "num_images": 1,
                        "enable_safety_checker": True,
                        "output_format": "jpeg"
                    },
                )
                
                image_url = result['images'][0]['url']
                print(f"✅ Scene {scene_id} image created: {image_url[:50]}...")
                return image_url
                
            except Exception as e:
                print(f"⚠️ Attempt {attempt + 1}/{retry_count} failed: {e}")
                if attempt < retry_count - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    print(f"❌ Failed to create image for scene {scene_id}")
                    raise

    def animate_scene(
        self,
        image_url: str,
        scene_id: int,
        retry_count: int = 3
    ) -> str:
        """Convert image to video using Fal.ai image-to-video"""
        
        print(f"🎬 Animating scene {scene_id}...")
        
        for attempt in range(retry_count):
            try:
                result = fal_client.subscribe(
                    "fal-ai/kling-video/v1/standard/image-to-video",
                    arguments={
                        "prompt": "Smooth camera movement, subtle motion, cinematic",
                        "image_url": image_url,
                        "duration": 5,  # Kling supports 5 or 10 seconds
                        "aspect_ratio": "9:16"
                    },
                )
                
                video_url = result['video']['url']
                print(f"✅ Scene {scene_id} animated: {video_url[:50]}...")
                return video_url
                
            except Exception as e:
                print(f"⚠️ Attempt {attempt + 1}/{retry_count} failed: {e}")
                if attempt < retry_count - 1:
                    time.sleep(2 ** attempt)
                else:
                    print(f"❌ Failed to animate scene {scene_id}")
                    raise

    def process_shorts(
        self,
        user_input: str,
        mode: Literal["idea", "manual"] = "idea",
        target_duration: int = 60,
        scene_duration_range: tuple = (8, 15),
        progress_callback: Optional[callable] = None
    ) -> List[VideoScene]:
        """
        Main orchestrator function
        
        Args:
            user_input: Either an idea or structured manual scenario
            mode: 'idea' for auto-generation, 'manual' for user-provided scenario
            target_duration: Target video duration in seconds
            scene_duration_range: (min, max) duration per scene
            progress_callback: Optional function to report progress
            
        Returns:
            List of VideoScene objects with all URLs
        """
        
        print(f"\n{'='*60}")
        print(f"🚀 Starting Shorts Factory - Mode: {mode}")
        print(f"{'='*60}\n")
        
        # Step 1: Generate or parse scenario
        if mode == "idea":
            scenario = self.generate_scenario(user_input, target_duration, scene_duration_range)
        else:
            # For manual mode, expect JSON input
            scenario_data = json.loads(user_input)
            scenario = ScenarioOutput(
                master_style=scenario_data['master_style'],
                character_attributes=scenario_data.get('character_attributes', ''),
                total_duration=scenario_data['total_duration'],
                scenes=[
                    SceneData(**scene) for scene in scenario_data['scenes']
                ]
            )
        
        total_scenes = len(scenario.scenes)
        completed_scenes = []
        
        # Step 2: Process each scene
        for idx, scene in enumerate(scenario.scenes):
            try:
                if progress_callback:
                    progress_callback({
                        'stage': 'processing',
                        'current': idx + 1,
                        'total': total_scenes,
                        'message': f'Processing scene {idx + 1}/{total_scenes}'
                    })
                
                # Create image
                image_url = self.create_scene_image(scene.image_prompt, scene.scene_id)
                
                # Animate image
                video_url = self.animate_scene(image_url, scene.scene_id)
                
                # Store completed scene
                video_scene = VideoScene(
                    scene_id=scene.scene_id,
                    voiceover=scene.voiceover,
                    image_url=image_url,
                    video_url=video_url,
                    duration=scene.duration
                )
                completed_scenes.append(video_scene)
                
                print(f"✅ Scene {scene.scene_id} completed!")
                
            except Exception as e:
                print(f"❌ Scene {scene.scene_id} failed: {e}")
                # Continue with next scene instead of failing entire job
                continue
        
        if progress_callback:
            progress_callback({
                'stage': 'complete',
                'current': total_scenes,
                'total': total_scenes,
                'message': f'Completed {len(completed_scenes)}/{total_scenes} scenes'
            })
        
        print(f"\n{'='*60}")
        print(f"✅ Shorts Factory Complete! {len(completed_scenes)}/{total_scenes} scenes")
        print(f"{'='*60}\n")
        
        return completed_scenes


# CLI Example Usage
if __name__ == "__main__":
    factory = ShortsFactory()
    
    # Test with an idea
    idea = "A lone astronaut discovers a beautiful alien flower on Mars at sunset"
    
    results = factory.process_shorts(
        user_input=idea,
        mode="idea",
        target_duration=30,  # Short test
        scene_duration_range=(8, 12)
    )
    
    print("\n📊 RESULTS:")
    for scene in results:
        print(f"\nScene {scene.scene_id}:")
        print(f"  Voiceover: {scene.voiceover}")
        print(f"  Image: {scene.image_url}")
        print(f"  Video: {scene.video_url}")
        print(f"  Duration: {scene.duration}s")
