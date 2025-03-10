import os
import sys
import time
import threading
import tempfile
import tkinter as tk
from tkinter import ttk, messagebox
import pyaudio
import wave
import numpy as np
import pygame
from openai import OpenAI

# ========== API KEY CONFIGURATION ==========
# IMPORTANT: Delete this key after testing and use environment variables in production
API_KEY = "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"  # Set your API key here if not using environment variables

# Initialize OpenAI client with either environment variable or direct API key
try:
    if API_KEY:
        client = OpenAI(api_key=API_KEY)
    else:
        client = OpenAI()  # Will use OPENAI_API_KEY environment variable
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    print("\nPlease set your API key in one of these ways:")
    print("1. Edit this file and add your key to the API_KEY variable")
    print("2. Set the OPENAI_API_KEY environment variable and restart your terminal")
    print("   Windows: set OPENAI_API_KEY=your_api_key_here")
    print("   Mac/Linux: export OPENAI_API_KEY=your_api_key_here")
    sys.exit(1)

# Supported languages with corresponding language codes
LANGUAGES = {
    "English": "en",
    "Spanish": "es",
    "French": "fr",
    "German": "de", 
    "Mandarin": "zh",
    "Hindi": "hi",
    "Arabic": "ar",
    "Russian": "ru",
    "Japanese": "ja",
    "Portuguese": "pt"
}

# Define the tasks from your mockup
TASKS = [
    "Greeting,find out reason for call",
    "Collect patient demographic information",
    "Collect insurance information",
    "Verify insurance eligibility",
    "Confirm imaging requirements",
    "Check availability for pre-op consult"
]

# Audio recording parameters
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
CHUNK = 1024
SILENCE_THRESHOLD = 1000  # Adjust based on your microphone sensitivity
SILENCE_DURATION = 1  # Seconds of silence to consider speech ended

class HealthcareVoiceAssistant:
    def __init__(self, root):
        self.root = root
        self.root.title("Healthcare Voice Assistant")
        self.root.geometry("900x650")
        self.root.configure(bg="#f0f0f0")
        
        # Initialize PyAudio
        try:
            self.audio = pyaudio.PyAudio()
        except Exception as e:
            tk.messagebox.showerror("Error", f"Could not initialize audio: {e}\n\nMake sure you have a working microphone.")
            sys.exit(1)
        
        # Set the desired input device (default to 5 but will be customizable)
        self.input_device_index = 5  # Your headset is device 5
        
        # List audio devices to console
        self.list_audio_devices()
        
        # Initialize pygame for audio playback
        try:
            pygame.mixer.init()
        except Exception as e:
            tk.messagebox.showerror("Error", f"Could not initialize audio playback: {e}")
            sys.exit(1)
        
        # Setup UI
        self.setup_ui()
        
        # Initialize conversation state
        self.conversation_history = []
        self.current_task_index = 0
        self.recording = False
        self.current_language = "English"
        
        # Translations for UI elements (would be more extensive in a real app)
        self.translations = {
            "en": {"start": "Start Assistant", "stop": "Stop Assistant"},
            "es": {"start": "Iniciar Asistente", "stop": "Detener Asistente"},
            "fr": {"start": "Démarrer l'Assistant", "stop": "Arrêter l'Assistant"},
            "de": {"start": "Assistent Starten", "stop": "Assistent Stoppen"},
            "zh": {"start": "启动助手", "stop": "停止助手"},
            "hi": {"start": "सहायक प्रारंभ करें", "stop": "सहायक रोकें"},
            "ar": {"start": "بدء المساعد", "stop": "إيقاف المساعد"},
            "ru": {"start": "Запустить Ассистента", "stop": "Остановить Ассистента"},
            "ja": {"start": "アシスタントを開始", "stop": "アシスタントを停止"},
            "pt": {"start": "Iniciar Assistente", "stop": "Parar Assistente"}
        }
        
        # Test OpenAI connection
        self.test_openai_connection()

    def list_audio_devices(self):
        """List all available audio input devices"""
        info = self.audio.get_host_api_info_by_index(0)
        numdevices = info.get('deviceCount')
        
        print("\nAvailable audio input devices:")
        for i in range(0, numdevices):
            if self.audio.get_device_info_by_host_api_device_index(0, i).get('maxInputChannels') > 0:
                print(f"Input Device id {i} - {self.audio.get_device_info_by_host_api_device_index(0, i).get('name')}")
        print(f"Currently using device: {self.input_device_index}\n")

    def get_input_devices(self):
        """Get a list of available input devices"""
        devices = []
        info = self.audio.get_host_api_info_by_index(0)
        numdevices = info.get('deviceCount')
        
        for i in range(0, numdevices):
            if self.audio.get_device_info_by_host_api_device_index(0, i).get('maxInputChannels') > 0:
                name = self.audio.get_device_info_by_host_api_device_index(0, i).get('name')
                devices.append((i, name))
        
        return devices

    def test_openai_connection(self):
        """Test the OpenAI connection to make sure the API key works"""
        try:
            self.status_var.set("Testing OpenAI connection...")
            self.root.update()
            
            # Simple test API call
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            
            self.status_var.set("OpenAI connection successful. Ready.")
        except Exception as e:
            self.status_var.set("OpenAI connection failed!")
            tk.messagebox.showerror("API Error", f"OpenAI API connection failed: {e}\n\nPlease check your API key.")

    def setup_ui(self):
        # Top frame for language selection
        top_frame = tk.Frame(self.root, bg="#f0f0f0")
        top_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Language selector
        lang_label = tk.Label(top_frame, text="Select Language:", bg="#f0f0f0", font=("Arial", 12))
        lang_label.pack(side=tk.LEFT, padx=5)
        
        self.language_var = tk.StringVar(value="English")
        language_dropdown = ttk.Combobox(top_frame, textvariable=self.language_var, values=list(LANGUAGES.keys()), state="readonly", width=15)
        language_dropdown.pack(side=tk.LEFT, padx=5)
        language_dropdown.bind("<<ComboboxSelected>>", self.change_language)
        
        # Audio device selector
        device_frame = tk.Frame(top_frame, bg="#f0f0f0")
        device_frame.pack(side=tk.LEFT, padx=20)

        device_label = tk.Label(device_frame, text="Microphone:", bg="#f0f0f0", font=("Arial", 12))
        device_label.pack(side=tk.LEFT, padx=5)

        # Get device list
        input_devices = self.get_input_devices()
        device_names = [f"Device {idx}: {name}" for idx, name in input_devices]

        self.device_var = tk.StringVar()
        if input_devices:
            # Find name for current device index
            device_name = next((name for idx, name in input_devices if idx == self.input_device_index), "Unknown")
            self.device_var.set(f"Device {self.input_device_index}: {device_name}")

        device_dropdown = ttk.Combobox(device_frame, textvariable=self.device_var, values=device_names, state="readonly", width=25)
        device_dropdown.pack(side=tk.LEFT, padx=5)
        device_dropdown.bind("<<ComboboxSelected>>", self.change_device)
        
        # Test Mode button
        self.test_button = tk.Button(top_frame, text="Test Mode", command=self.test_mode, 
                                    bg="#FFA500", fg="white", font=("Arial", 12), padx=10)
        self.test_button.pack(side=tk.RIGHT, padx=5)
        
        # Start/Stop button
        self.start_button = tk.Button(top_frame, text="Start Assistant", command=self.toggle_assistant, 
                                      bg="#4CAF50", fg="white", font=("Arial", 12), padx=10)
        self.start_button.pack(side=tk.RIGHT, padx=5)
        
        # Middle frame for conversation display
        self.conversation_frame = tk.Frame(self.root, bg="white")
        self.conversation_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Conversation text area
        self.conversation_text = tk.Text(self.conversation_frame, wrap=tk.WORD, bg="white", font=("Arial", 12))
        self.conversation_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Add scrollbar
        scrollbar = tk.Scrollbar(self.conversation_text)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.conversation_text.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.conversation_text.yview)
        
        # Status bar
        self.status_var = tk.StringVar(value="Ready")
        status_bar = tk.Label(self.root, textvariable=self.status_var, bd=1, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Task progress frame
        task_frame = tk.Frame(self.root, bg="#f0f0f0")
        task_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Task checkboxes
        self.task_vars = []
        for task in TASKS:
            var = tk.IntVar(value=0)
            self.task_vars.append(var)
            cb = tk.Checkbutton(task_frame, text=task, variable=var, bg="#f0f0f0", 
                                font=("Arial", 10), state=tk.DISABLED)
            cb.pack(anchor=tk.W, padx=5, pady=2)

    def change_language(self, event=None):
        """Handle language change"""
        self.current_language = self.language_var.get()
        lang_code = LANGUAGES[self.current_language]
        
        # Update UI text elements based on selected language
        self.start_button.config(text=self.translations[lang_code]["start" if not self.recording else "stop"])
        
        # Add a message about language change
        self.add_to_conversation("System", f"Language changed to {self.current_language}")

    def change_device(self, event=None):
        """Handle audio device change"""
        selected = self.device_var.get()
        try:
            device_index = int(selected.split(':')[0].replace('Device ', ''))
            self.input_device_index = device_index
            print(f"Changed input device to {device_index}")
            self.add_to_conversation("System", f"Microphone changed to {selected}")
        except Exception as e:
            print(f"Error changing device: {e}")

    def test_mode(self):
        """Process a test input without using the microphone"""
        if not self.recording:
            self.start_assistant()
        
        # Simulate user input
        test_input = "Hello, I'm calling about my MRI appointment next week."
        
        # Add to conversation display
        self.add_to_conversation("You (Test)", test_input)
        
        # Process with LLM
        response = self.process_with_llm(test_input)
        
        # Add to conversation display
        self.add_to_conversation("Assistant", response)
        
        # Speak the response
        self.speak_text(response)
        
        # Update task progress
        self.update_task_progress()

    def toggle_assistant(self):
        if not self.recording:
            self.start_assistant()
        else:
            self.stop_assistant()

    def start_assistant(self):
        """Start the voice assistant"""
        self.recording = True
        lang_code = LANGUAGES[self.current_language]
        self.start_button.config(text=self.translations[lang_code]["stop"], bg="#F44336")
        self.status_var.set("Assistant active - listening...")
        
        # Clear previous conversation if starting fresh
        if not self.conversation_history:
            self.conversation_text.delete(1.0, tk.END)
        
        # Start with a greeting based on the selected language
        try:
            greeting = self.get_greeting()
            self.add_to_conversation("Assistant", greeting)
            self.speak_text(greeting)
        except Exception as e:
            self.status_var.set(f"Error generating greeting: {str(e)}")
            self.add_to_conversation("System", f"Error: {str(e)}")
            self.recording = False
            return
        
        # Start listening thread
        self.listen_thread = threading.Thread(target=self.listen_loop)
        self.listen_thread.daemon = True
        self.listen_thread.start()

    def stop_assistant(self):
        """Stop the voice assistant"""
        self.recording = False
        lang_code = LANGUAGES[self.current_language]
        self.start_button.config(text=self.translations[lang_code]["start"], bg="#4CAF50")
        self.status_var.set("Assistant stopped")

    def get_greeting(self):
        """Generate an appropriate greeting based on the current language"""
        lang_code = LANGUAGES[self.current_language]
        
        try:
            # Use LLM to generate a natural greeting in the selected language
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": f"You are a medical intake assistant for a clinic. Respond in {self.current_language} only."},
                    {"role": "user", "content": f"Generate a brief, friendly greeting in {self.current_language} for a patient calling a medical clinic. Introduce yourself as an AI assistant who will help collect information for their radiology appointment."}
                ],
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.status_var.set(f"API Error: {str(e)}")
            raise

    def listen_loop(self):
        """Main loop for listening and processing speech"""
        while self.recording:
            self.status_var.set("Listening...")
            
            # Record audio
            try:
                audio_data = self.record_audio()
            except Exception as e:
                self.status_var.set(f"Recording error: {str(e)}")
                self.add_to_conversation("System", f"Recording error: {str(e)}")
                continue
            
            if not self.recording:  # Check if stopped while recording
                break
                
            if audio_data:
                self.status_var.set("Processing speech...")
                
                # Save audio to temporary file
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                try:
                    with wave.open(temp_file.name, 'wb') as wf:
                        wf.setnchannels(CHANNELS)
                        wf.setsampwidth(self.audio.get_sample_size(FORMAT))
                        wf.setframerate(RATE)
                        wf.writeframes(b''.join(audio_data))
                
                    # Process the audio
                    try:
                        # 1. Transcribe speech to text
                        transcript = self.transcribe_audio(temp_file.name)
                        
                        if transcript.strip():
                            # Add to conversation display
                            self.add_to_conversation("You", transcript)
                            
                            # 2. Process with LLM
                            response = self.process_with_llm(transcript)
                            
                            # 3. Add to conversation display
                            self.add_to_conversation("Assistant", response)
                            
                            # 4. Speak the response
                            self.speak_text(response)
                            
                            # 5. Update task progress
                            self.update_task_progress()
                    except Exception as e:
                        self.status_var.set(f"Processing error: {str(e)}")
                        self.add_to_conversation("System", f"Error: {str(e)}")
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_file.name)
                    except:
                        pass

    def record_audio(self):
        """Record audio until silence is detected"""
        try:
            # Open stream with the specified device index
            stream = self.audio.open(
                format=FORMAT, 
                channels=CHANNELS,
                rate=RATE, 
                input=True,
                input_device_index=self.input_device_index,  # Use selected device
                frames_per_buffer=CHUNK
            )
            print(f"Recording from device {self.input_device_index}")
        except Exception as e:
            self.status_var.set(f"Microphone error: {str(e)}")
            self.add_to_conversation("System", f"Could not access microphone: {str(e)}\nTry changing the device index.")
            self.recording = False
            return None
        
        frames = []
        silent_chunks = 0
        silent_threshold = int(SILENCE_DURATION * RATE / CHUNK)
        has_speech = False
        volume_levels = []
        recording_start_time = time.time()
        MAX_RECORDING_TIME = 5  # Force processing after 5 seconds
        
        self.root.update()  # Update UI
        
        try:
            # Pre-listen to calibrate
            for _ in range(10):
                if not self.recording:
                    stream.stop_stream()
                    stream.close()
                    return None
                
                data = stream.read(CHUNK, exception_on_overflow=False)
                
            # Main recording loop    
            while self.recording:
                data = stream.read(CHUNK, exception_on_overflow=False)
                frames.append(data)
                
                # Check audio level
                audio_data = np.frombuffer(data, dtype=np.int16)
                volume_norm = np.linalg.norm(audio_data / 32768.0) * 10
                volume_levels.append(volume_norm)
                
                # Debug output
                if len(frames) % 10 == 0:  # Only update every 10 frames
                    avg_volume = sum(volume_levels[-10:]) / min(len(volume_levels), 10)
                    self.status_var.set(f"Listening... (Vol: {avg_volume:.2f}, Silent: {silent_chunks})")
                    print(f"Volume: {volume_norm:.4f}, Silent chunks: {silent_chunks}, Has speech: {has_speech}")
                
                # Detect speech/silence (lower threshold for more sensitivity)
                if volume_norm > 0.05:  # More sensitive threshold
                    silent_chunks = 0
                    has_speech = True
                else:
                    silent_chunks += 1
                
                # If we've collected speech and detected silence, stop recording
                if has_speech and silent_chunks > silent_threshold:
                    print("Speech followed by silence detected - processing")
                    break
                         
                self.root.update()  # Keep UI responsive
                
        except Exception as e:
            self.status_var.set(f"Recording error: {str(e)}")
            print(f"Recording exception: {e}")
        finally:
            stream.stop_stream()
            stream.close()
            
        # Provide feedback about speech detection
        if not has_speech and len(frames) > 0:
            print("No speech detected in recording")
            self.status_var.set("No speech detected - Try speaking louder")
            max_volume = max(volume_levels) if volume_levels else 0
            print(f"Maximum volume detected: {max_volume:.4f}")
            return None
            
        return frames if (has_speech or len(frames) > 20) else None

    def transcribe_audio(self, audio_file_path):
        """Transcribe audio file to text using Whisper API"""
        try:
            with open(audio_file_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=LANGUAGES[self.current_language]
                )
            return transcript.text
        except Exception as e:
            self.status_var.set(f"Transcription error: {str(e)}")
            raise

    def process_with_llm(self, text):
        """Process text with GPT to understand intent and extract information"""
        try:
            # Add the user's text to the conversation history
            self.conversation_history.append({"role": "user", "content": text})
            
            # Determine which task we're working on
            current_task = TASKS[self.current_task_index] if self.current_task_index < len(TASKS) else "Follow-up"
            
            # System message to guide the AI's behavior
            system_message = {
                "role": "system", 
                "content": f"""
                You are a medical intake assistant for a radiology clinic.
                Respond in {self.current_language} only.
                
                Current task: {current_task}
                
                Complete these tasks in order:
                - Confirm the patient's phone number
                - Collect patient demographic information (name, DOB, address)
                - Collect insurance information (provider, policy number)
                - Verify insurance eligibility
                - Confirm imaging requirements
                - Check availability for pre-op consultation
                
                Be professional, friendly, and HIPAA compliant. Ask ONE question at a time.
                Keep responses brief and conversational.
                """
            }
            
            # Generate a response from the LLM
            messages = [system_message] + self.conversation_history
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.7
            )
            
            # Extract the AI's response
            ai_message = response.choices[0].message.content
            
            # Add the AI's response to the conversation history
            self.conversation_history.append({"role": "assistant", "content": ai_message})
            
            return ai_message
        except Exception as e:
            self.status_var.set(f"Processing error: {str(e)}")
            raise

    def speak_text(self, text):
        """Convert text to speech and play it"""
        try:
            self.status_var.set("Speaking...")
            
            # Determine which voice to use based on language
            voice = "nova"  # Default English voice
            
            # Use TTS to generate audio
            response = client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text
            )
            
            # Save to temporary file and play
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            temp_file.close()
            
            with open(temp_file.name, 'wb') as f:
                for chunk in response.iter_bytes(chunk_size=1024 * 1024):
                    f.write(chunk)
            
            # Play the audio
            pygame.mixer.music.load(temp_file.name)
            pygame.mixer.music.play()
            
            # Wait for playback to finish
            while pygame.mixer.music.get_busy():
                self.root.update()
                time.sleep(0.1)
            
            # Clean up temp file
            try:
                os.unlink(temp_file.name)
            except:
                pass
                
            self.status_var.set("Listening...")
        except Exception as e:
            self.status_var.set(f"Speech error: {str(e)}")
            self.add_to_conversation("System", f"Speech error: {str(e)}")

    def add_to_conversation(self, speaker, text):
        """Add a message to the conversation display"""
        self.conversation_text.config(state=tk.NORMAL)
        self.conversation_text.insert(tk.END, f"\n{speaker}: ", f"speaker_{speaker.lower()}")
        self.conversation_text.insert(tk.END, f"{text}\n")
        self.conversation_text.tag_configure("speaker_assistant", foreground="blue", font=("Arial", 12, "bold"))
        self.conversation_text.tag_configure("speaker_you", foreground="green", font=("Arial", 12, "bold"))
        self.conversation_text.tag_configure("speaker_system", foreground="gray", font=("Arial", 10, "italic"))
        self.conversation_text.see(tk.END)
        self.conversation_text.config(state=tk.DISABLED)
        self.root.update()

    def update_task_progress(self):
        """Update the task progress based on conversation"""
        # This would be more sophisticated in a real app
        # For this demo, we'll use a simple approach
        
        conversation_text = " ".join([msg["content"] for msg in self.conversation_history])
        
        # Check for task completion markers in the conversation
        if "phone" in conversation_text.lower() and "confirm" in conversation_text.lower():
            self.task_vars[0].set(1)
            
        if any(term in conversation_text.lower() for term in ["name", "birth", "address"]):
            self.task_vars[1].set(1)
            
        if any(term in conversation_text.lower() for term in ["insurance", "policy", "coverage"]):
            self.task_vars[2].set(1)
            
        if "eligib" in conversation_text.lower():
            self.task_vars[3].set(1)
            
        if any(term in conversation_text.lower() for term in ["imaging", "mri", "ct", "xray", "x-ray"]):
            self.task_vars[4].set(1)
            
        if any(term in conversation_text.lower() for term in ["consult", "appointment", "schedule"]):
            self.task_vars[5].set(1)
            
        # Update the current task index
        completed_tasks = sum(var.get() for var in self.task_vars)
        if completed_tasks > self.current_task_index:
            self.current_task_index = completed_tasks

def main():
    # Check for required libraries
    try:
        import pyaudio
        import pygame
    except ImportError:
        print("Error: Required libraries not installed.")
        print("Please install them with: pip install pyaudio pygame numpy")
        sys.exit(1)
        
    # Create and run the application
    root = tk.Tk()
    app = HealthcareVoiceAssistant(root)
    root.mainloop()

if __name__ == "__main__":
    main()