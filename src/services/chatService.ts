// ChatService.ts - Handles all chat-related functionality
import axios from 'axios';

// Types
export interface Message {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

export interface TriageCase {
  id: string;
  patientName: string;
  priority: string;
  type: string;
  createdAt: string;
  status: string;
}

export interface PatientInformation {
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  medicationList?: string[];
  allergyList?: string[];
  chiefComplaint?: string;
  lastVisit?: string;
}

export const PRIORITIES = {
  "High": "Urgent attention required",
  "Medium": "Standard triage",
  "Low": "Non-urgent request"
};

export const CASE_TYPES = {
  "New": "New patient inquiry",
  "Prescription": "Medication refill or change",
  "Appointment": "Scheduling or rescheduling",
  "Results": "Test results inquiry",
  "Insurance": "Insurance verification or billing",
  "General": "General medical questions"
};

class ChatService {
  /**
   * Process user messages with AI and get appropriate responses
   */
  async processMessage(
    message: string,
    conversationHistory: Message[],
    caseType: string,
    patientInfo?: PatientInformation
  ): Promise<string> {
    try {
      const processedHistory = conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      processedHistory.push({
        role: 'user',
        content: message
      });
      
      const patientInfoString = this.formatPatientInfoForPrompt(patientInfo);
      
      const systemPrompt = `
You are a Chat Assistant, an intelligent medical triage assistant for a healthcare provider.
Your primary goals are to:
1. Efficiently triage patient requests
2. Handle administrative tasks
3. Provide accurate information
4. Collect relevant patient information

Case type: ${caseType}

${patientInfoString}

Be professional, empathetic, and HIPAA compliant at all times. 
Ask ONE question at a time.
Keep your responses concise and conversational.
For prescription refills, collect: medication name, dosage, pharmacy details.
For appointments, determine urgency and collect availability.
For insurance questions, gather provider information and specific concerns.
For test results, verify patient identity before discussing any results.

Do not ask for information you already have in the patient details.
`;
      
      const response = await axios.post('/api/chat_route', {
        systemPrompt,
        conversationHistory: processedHistory
      });
      
      return response.data.message;
    } catch (error) {
      console.error('Error processing message:', error);
      throw new Error(`Failed to process message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format patient information for inclusion in the system prompt
   */
  private formatPatientInfoForPrompt(patientInfo?: PatientInformation): string {
    if (!patientInfo || Object.keys(patientInfo).length === 0) {
      return "No patient information collected yet.";
    }
    
    let infoString = "Current patient information:\n";
    
    if (patientInfo.fullName) infoString += `- Name: ${patientInfo.fullName}\n`;
    if (patientInfo.dateOfBirth) infoString += `- DOB: ${patientInfo.dateOfBirth}\n`;
    if (patientInfo.phone) infoString += `- Phone: ${patientInfo.phone}\n`;
    if (patientInfo.email) infoString += `- Email: ${patientInfo.email}\n`;
    if (patientInfo.address) infoString += `- Address: ${patientInfo.address}\n`;
    if (patientInfo.insuranceProvider) infoString += `- Insurance: ${patientInfo.insuranceProvider}\n`;
    if (patientInfo.policyNumber) infoString += `- Policy #: ${patientInfo.policyNumber}\n`;
    
    if (patientInfo.medicationList && patientInfo.medicationList.length > 0) {
      infoString += `- Medications: ${patientInfo.medicationList.join(", ")}\n`;
    }
    
    if (patientInfo.allergyList && patientInfo.allergyList.length > 0) {
      infoString += `- Allergies: ${patientInfo.allergyList.join(", ")}\n`;
    }
    
    if (patientInfo.chiefComplaint) infoString += `- Chief Complaint: ${patientInfo.chiefComplaint}\n`;
    if (patientInfo.lastVisit) infoString += `- Last Visit: ${patientInfo.lastVisit}\n`;
    
    return infoString;
  }

  /**
   * Extract patient information from conversation
   */
  extractPatientInfo(userMessage: string, aiResponse: string): PatientInformation {
    const info: PatientInformation = {};
    const combinedText = `${userMessage} ${aiResponse}`;
    
    // Extract name
    const nameRegex = /(?:my name is|this is|i am|i'm) ([A-Za-z\s]+?)(?:,|\.|and|i)/i;
    const nameMatch = combinedText.match(nameRegex);
    if (nameMatch && nameMatch[1].trim().length > 2) {
      info.fullName = nameMatch[1].trim();
    }
    
    // Extract phone number
    const phoneRegex = /(\+?1?[ -]?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4})/;
    const phoneMatch = combinedText.match(phoneRegex);
    if (phoneMatch) {
      info.phone = phoneMatch[1];
    }
    
    // Extract email
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = combinedText.match(emailRegex);
    if (emailMatch) {
      info.email = emailMatch[1];
    }
    
    // Extract DOB
    const dobRegex = /(?:birth|born|dob|birthday).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},? \d{4})/i;
    const dobMatch = combinedText.match(dobRegex);
    if (dobMatch) {
      info.dateOfBirth = dobMatch[1];
    }
    
    // Extract insurance provider
    const insuranceRegex = /(?:insurance|covered by|policy with) ([A-Za-z\s]+)(?:,|\.|and|$)/i;
    const insuranceMatch = combinedText.match(insuranceRegex);
    if (insuranceMatch && insuranceMatch[1].trim().length > 2) {
      info.insuranceProvider = insuranceMatch[1].trim();
    }
    
    // Extract policy number
    const policyRegex = /(?:policy|member|id)(?:\s+number|\s+#|\s+id)?(?:\s+is)?\s+([A-Za-z0-9\-]+)/i;
    const policyMatch = combinedText.match(policyRegex);
    if (policyMatch) {
      info.policyNumber = policyMatch[1];
    }
    
    // Extract medications (simple approach)
    const medRegex = /(?:taking|medication|prescribe|medicine).*?((?:[A-Za-z]+(?:\s+\d+\s*mg)?(?:,\s+|\s+and\s+)?)+)/i;
    const medMatch = combinedText.match(medRegex);
    if (medMatch && medMatch[1]) {
      const meds = medMatch[1].split(/,|\sand\s/).map(med => med.trim()).filter(med => med.length > 2);
      if (meds.length > 0) {
        info.medicationList = meds;
      }
    }
    
    // Extract chief complaint
    const complaintRegex = /(?:problem is|suffering from|issue with|pain in|concerned about) ([^,.]+)/i;
    const complaintMatch = combinedText.match(complaintRegex);
    if (complaintMatch && complaintMatch[1].trim().length > 3) {
      info.chiefComplaint = complaintMatch[1].trim();
    }
    
    return info;
  }

  /**
   * Analyze message content to suggest appropriate priority
   */
  analyzePriority(userMessage: string, aiResponse: string): string | null {
    const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();
    
    // High priority keywords
    const highPriorityTerms = [
      'emergency', 'urgent', 'severe', 'extreme', 'unbearable',
      'chest pain', 'difficulty breathing', 'shortness of breath',
      'heart attack', 'stroke', 'bleeding', 'fainted', 'unconscious',
      'overdose', 'seizure', 'suicide', 'suicidal', 'self-harm',
      'acute', 'immediately', 'right away', 'asap'
    ];
    
    // Medium priority keywords
    const mediumPriorityTerms = [
      'refill', 'prescription', 'worsening', 'increasing',
      'moderate', 'concerning', 'fever', 'infection',
      'pain', 'discomfort', 'sick', 'injured', 'hurts',
      'symptoms', 'worried', 'concerned', 'anxious'
    ];
    
    // Low priority keywords
    const lowPriorityTerms = [
      'question', 'wondering', 'curious', 'information',
      'mild', 'slight', 'minor', 'little', 'routine',
      'checkup', 'followup', 'follow-up', 'follow up',
      'appointment', 'reschedule', 'cancel', 'insurance',
      'paperwork', 'forms', 'billing', 'records'
    ];
    
    // Count matches for each priority
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    highPriorityTerms.forEach(term => {
      if (combinedText.includes(term)) highCount++;
    });
    
    mediumPriorityTerms.forEach(term => {
      if (combinedText.includes(term)) mediumCount++;
    });
    
    lowPriorityTerms.forEach(term => {
      if (combinedText.includes(term)) lowCount++;
    });
    
    // Apply weighting (high priority terms count for more)
    if (highCount >= 1) {
      return "High";
    } else if (mediumCount > lowCount) {
      return "Medium";
    } else if (lowCount > 0) {
      return "Low";
    }
    
    // Default case - no change
    return null;
  }

  /**
   * Upload files to the server
   */
  async uploadFiles(files: File[]): Promise<string[]> {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`file-${index}`, file);
      });
      
      const response = await axios.post('/api/upload_route', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.fileUrls;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch previous case history
   */
  async fetchCaseHistory(caseId: string): Promise<Message[]> {
    try {
      const response = await axios.get(`/api/case_history_route?caseId=${caseId}`);
      return response.data.messages;
    } catch (error) {
      console.error('Error fetching case history:', error);
      throw new Error(`Failed to fetch case history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update case status or details
   */
  async updateCase(caseId: string, updates: Partial<TriageCase>): Promise<TriageCase> {
    try {
      const response = await axios.post('/api/update_case_route', {
        caseId,
        updates
      });
      
      return response.data.case;
    } catch (error) {
      console.error('Error updating case:', error);
      throw new Error(`Failed to update case: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const chatService = new ChatService();
export default ChatService;