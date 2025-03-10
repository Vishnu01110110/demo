// Updated VoiceService.ts to use API routes
import axios from 'axios';

// Types
export interface Message {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

export interface Task {
  name: string;
  completed: boolean;
}

export interface PatientDetails {
  phone?: string;
  fullName?: string;
}

export const LANGUAGES = {
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
};

export const INITIAL_TASKS = [
  { name: "Greeting, find out reason for call", completed: false },
  { name: "Collect patient demographic information", completed: false },
  { name: "Collect insurance information", completed: false },
  { name: "Verify insurance eligibility", completed: false },
  { name: "Confirm imaging requirements(Currently hard coded)", completed: false },
  { name: "Check availability for pre-op consult(Currently hard coded)", completed: false }
];

class VoiceService {
  /**
   * Generate a greeting based on the selected language
   */
  async generateGreeting(language: string): Promise<string> {
    try {
      const response = await axios.post('/api/chat_route', {
        systemPrompt: `You are a medical intake assistant for a clinic. Respond in ${language} only.`,
        userPrompt: `Generate a brief, friendly greeting in ${language} for a patient calling a medical clinic. Introduce yourself as an AI assistant who will help collect information for their radiology appointment.`
      });
      
      return response.data.message;
    } catch (error) {
      console.error('Error generating greeting:', error);
      throw new Error(`Failed to generate greeting: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(audioBlob: Blob, language: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      // Type-safe way to access LANGUAGES object
      const langCode = language in LANGUAGES 
        ? LANGUAGES[language as keyof typeof LANGUAGES]
        : 'en';
        
      formData.append('language', langCode);
      
      const response = await axios.post('/api/transcription_route', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process text with GPT to understand user input and generate responses.
   */
  async processWithLLM(
    text: string, 
    conversations: Message[], 
    language: string, 
    currentTask: string,
    patientDetails?: PatientDetails
  ): Promise<string> {
    try {
      const processedConversations = conversations
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      processedConversations.push({
        role: 'user',
        content: text
      });
      
      const detailsString = `
Already collected details:
  Phone: ${patientDetails?.phone || 'N/A'}
  Name: ${patientDetails?.fullName || 'N/A'}
`;

      const systemPrompt = `
You are a medical intake assistant for a clinic.
Respond in ${language} only.

Current task: ${currentTask}

${detailsString}

Complete these tasks in order:
- Collect the patient's phone number
- Collect patient demographic information (name, DOB, address)
- Collect insurance information (provider, policy number)
- Verify insurance eligibility
- Confirm imaging requirements
- Check availability for pre-op consultation

If you already have the phone number and name, DO NOT ask for them again.
Be professional, friendly, and HIPAA compliant. Ask ONE question at a time.
Keep responses brief and conversational.
`;
      
      const response = await axios.post('/api/chat_route', {
        systemPrompt,
        conversationHistory: processedConversations
      });
      
      return response.data.message;
    } catch (error) {
      console.error('Error processing with LLM:', error);
      throw new Error(`Failed to process with LLM: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert text to speech using OpenAI TTS API
   */
  async textToSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const response = await axios.post('/api/tts_route', {
        text
      }, {
        responseType: 'arraybuffer'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating speech:', error);
      throw new Error(`Speech error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // These client-side methods don't need API keys
  detectTaskCompletion(tasks: Task[], userText: string, assistantText: string, patientDetails: PatientDetails): Task[] {
    const updatedTasks = [...tasks];
    const combinedLower = (userText + ' ' + assistantText).toLowerCase();
    const currentTaskIndex = updatedTasks.findIndex(task => !task.completed);
    
    if (currentTaskIndex === -1) {
      return updatedTasks;
    }
    
    switch(currentTaskIndex) {
      case 0: // "Greeting, find out reason for call"
        if (patientDetails.phone) {
          updatedTasks[0].completed = true;
        }
        break;
      
      case 1: // "Collect patient demographic information"
        if (patientDetails.fullName) {
          updatedTasks[1].completed = true;
        }
        break;
      
      case 2: // "Collect insurance information"
        if (combinedLower.includes('insurance') && 
            (combinedLower.includes('policy') || combinedLower.includes('number') || 
             combinedLower.includes('provider'))) {
          updatedTasks[2].completed = true;
        }
        break;
      
      case 3: // "Verify insurance eligibility"
        if (combinedLower.includes('eligib') && combinedLower.includes('verify')) {
          updatedTasks[3].completed = true;
        }
        break;
      
      case 4: // "Confirm imaging requirements"
        if ((combinedLower.includes('imaging') || combinedLower.includes('mri') || 
             combinedLower.includes('ct') || combinedLower.includes('xray')) && 
            combinedLower.includes('confirm')) {
          updatedTasks[4].completed = true;
        }
        break;
      
      case 5: // "Check availability for pre-op consult"
        if (combinedLower.includes('consult') || combinedLower.includes('appointment') || 
            combinedLower.includes('schedule')) {
          updatedTasks[5].completed = true;
        }
        break;
    }
    
    return updatedTasks;
  }

  extractPatientDetails(userText: string, assistantText: string): PatientDetails {
    const details: PatientDetails = {};
    const combinedText = userText + " " + assistantText;
    
    // Extract phone number using a simple regex
    const phoneMatch = combinedText.match(/(\+?\d[\d\s\-]{7,}\d)/);
    if (phoneMatch) {
      details.phone = phoneMatch[0].trim();
    }
    
    // Extract full name (simple heuristic: look for "my name is" followed by words)
    const nameMatch = combinedText.match(/my name is ([A-Za-z\s]+)/i);
    if (nameMatch) {
      details.fullName = nameMatch[1].trim();
    }
    
    return details;
  }
}

export const voiceService = new VoiceService();
export default VoiceService;