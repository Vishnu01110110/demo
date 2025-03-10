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

// New type for patient details
export interface PatientDetails {
  phone?: string;
  fullName?: string;
  // You can add more fields as needed (address, DOB, etc.)
}

// Supported languages mapping
export const LANGUAGES: Record<string, string> = {
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

// Initial tasks list
export const INITIAL_TASKS: Task[] = [
  { name: "Greeting, find out reason for call", completed: false },
  { name: "Collect patient demographic information", completed: false },
  { name: "Collect insurance information", completed: false },
  { name: "Verify insurance eligibility", completed: false },
  { name: "Confirm imaging requirements(Currently hard coded)", completed: false },
  { name: "Check availability for pre-op consult(Currently hard coded)", completed: false }
];

/**
 * VoiceService class to handle all OpenAI API interactions
 */
class VoiceService {
  private apiKey: string;

  constructor() {
    // Get API key from environment variable
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key is not defined in environment variables');
    }
    
    this.apiKey = apiKey || '';
  }

  /**
   * Generate a greeting based on the selected language
   */
  async generateGreeting(language: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a medical intake assistant for a clinic. Respond in ${language} only.`
            },
            {
              role: "user",
              content: `Generate a brief, friendly greeting in ${language} for a patient calling a medical clinic. Introduce yourself as an AI assistant who will help collect information for their radiology appointment.`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
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
      formData.append('model', 'whisper-1');
      
      const langCode = LANGUAGES[language];
      if (langCode !== 'en') {
        formData.append('language', langCode);
      }
      
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response.data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process text with GPT to understand user input and generate responses.
   * Now includes already collected patient details in the system prompt.
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
      
      // Build a string to display already collected details
      const detailsString = `
  Already collected details:
    Phone: ${patientDetails?.phone || 'N/A'}
    Name: ${patientDetails?.fullName || 'N/A'}
      `;
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `
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
              `
            },
            ...processedConversations
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
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
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: "tts-1",
          voice: "nova",
          input: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error generating speech:', error);
      throw new Error(`Speech error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Detect task completion based on keywords.
   * (This function still marks tasks as completed; details are extracted separately.)
   */
  detectTaskCompletion(tasks: Task[], userText: string, assistantText: string, patientDetails: PatientDetails): Task[] {
    const updatedTasks = [...tasks];
    const combinedLower = (userText + ' ' + assistantText).toLowerCase();
    const currentTaskIndex = updatedTasks.findIndex(task => !task.completed);
    
    if (currentTaskIndex === -1) {
      return updatedTasks;
    }
    
    // Better task completion detection logic
    switch(currentTaskIndex) {
      case 0: // "Greeting, find out reason for call"
        // Mark as complete if we have a phone number
        if (patientDetails.phone) {
          updatedTasks[0].completed = true;
        }
        break;
      
      case 1: // "Collect patient demographic information"
        // Mark as complete if we have a name
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

  /**
   * Extract patient details such as phone number and full name from conversation text.
   */
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