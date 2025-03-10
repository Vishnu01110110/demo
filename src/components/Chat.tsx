'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef } from 'react';
import { chatService, Message, TriageCase, PRIORITIES, CASE_TYPES, PatientInformation } from '@/services/chatService';

const PRELOADED_MESSAGES: Record<string, string> = {
  "New": "Hi there! I'm your automated medical assistant. I'll help triage your request and get you the care you need. What brings you to message us today?",
  "Prescription": "I see you need help with a prescription. I'll help you get that sorted out quickly.",
  "Appointment": "I understand you want to schedule an appointment. I'll help manage that for you.",
  "Results": "You're looking for test results. I'll make sure you get the information you need.",
  "Insurance": "You have insurance questions. I'll help navigate that process.",
  "General": "Thanks for reaching out. How can I assist with your healthcare needs today?"
};

const ChatAssistant: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [currentCaseType, setCurrentCaseType] = useState<string>("New");
  const [messages, setMessages] = useState<Message[]>([]);
  const [triageCases, setTriageCases] = useState<TriageCase[]>([]);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Ready");
  
  // State for patient information
  const [patientInfo, setPatientInfo] = useState<PatientInformation>({});
  
  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setIsClient(true);
    loadCases();
  }, []);


  const loadCases = async () => {
    try {
      // In a real app, this would load from an API
      const mockCases: TriageCase[] = [
        { 
          id: "case-001", 
          patientName: "John Doe", 
          priority: "Medium", 
          type: "Prescription",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: "Open"
        },
        { 
          id: "case-002", 
          patientName: "Jane Smith", 
          priority: "High", 
          type: "Appointment",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          status: "Open"
        },
        { 
          id: "case-003", 
          patientName: "Robert Johnson", 
          priority: "Low", 
          type: "Insurance",
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          status: "Closed"
        }
      ];
      setTriageCases(mockCases);
    } catch (error) {
      console.error("Error loading cases:", error);
    }
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (role: 'assistant' | 'user' | 'system', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const addSystemMessage = (content: string) => {
    addMessage('system', content);
  };

  const startNewCase = () => {
    const caseId = `case-${Date.now().toString(36)}`;
    setCurrentCaseId(caseId);
    setMessages([]);
    const greeting = PRELOADED_MESSAGES[currentCaseType] || PRELOADED_MESSAGES["New"];
    addMessage('assistant', greeting);
    
    // Add to triage cases
    const newCase: TriageCase = {
      id: caseId,
      patientName: patientInfo.fullName || "New Patient",
      priority: "Medium", // Default priority
      type: currentCaseType,
      createdAt: new Date().toISOString(),
      status: "Open"
    };
    
    setTriageCases(prev => [newCase, ...prev]);
  };

  const selectCase = (caseId: string) => {
    if (caseId === currentCaseId) return;
    
    setCurrentCaseId(caseId);
    const selectedCase = triageCases.find(c => c.id === caseId);
    
    // In a real app, this would load messages from an API
    // Mocking conversation history based on case type
    const mockHistory: Message[] = [
      { role: 'assistant', content: PRELOADED_MESSAGES[selectedCase?.type || "General"] },
      { role: 'user', content: `I need help with my ${selectedCase?.type.toLowerCase()}.` },
      { role: 'assistant', content: `I'm here to help with your ${selectedCase?.type.toLowerCase()} request. Could you please provide more details?` }
    ];
    
    setMessages(mockHistory);
    setCurrentCaseType(selectedCase?.type || "General");
  };

  const handleCaseTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentCaseType(e.target.value);
  };

  const handlePriorityChange = (caseId: string, priority: string) => {
    setTriageCases(prev => prev.map(c => 
      c.id === caseId ? { ...c, priority } : c
    ));
  };

  const handleStatusChange = (caseId: string, status: string) => {
    setTriageCases(prev => prev.map(c => 
      c.id === caseId ? { ...c, status } : c
    ));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage("");
    addMessage('user', userMessage);
    setIsProcessing(true);
    setStatus("Processing...");
    
    try {
      // Process message with AI and get response
      const currentCase = triageCases.find(c => c.id === currentCaseId);
      const response = await chatService.processMessage(
        userMessage,
        messages,
        currentCase?.type || "General",
        patientInfo
      );
      
      addMessage('assistant', response);
      
      // Extract patient information
      const newInfo = chatService.extractPatientInfo(userMessage, response);
      if (Object.keys(newInfo).length > 0) {
        setPatientInfo(prev => ({...prev, ...newInfo}));
      }
      
      // Analyze priority based on content
      const suggestedPriority = chatService.analyzePriority(userMessage, response);
      if (suggestedPriority && currentCaseId) {
        handlePriorityChange(currentCaseId, suggestedPriority);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      addSystemMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
      setStatus("Ready");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // In a real app, this would upload to an API
    const fileNames = Array.from(files).map(file => file.name).join(", ");
    addSystemMessage(`Uploaded files: ${fileNames}`);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (!isClient) {
    return <div className="p-4">Loading chat assistant...</div>;
  }

  return (
    <div className="flex h-full bg-white rounded-2xl shadow-lg max-w-5xl mx-auto overflow-hidden">
      {/* Left sidebar - Cases */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-purple-800 text-white">
          <h2 className="font-bold text-lg">Chat Assistant</h2>
          <p className="text-sm text-purple-200">Patient Triage Assistant</p>
        </div>
        
        <div className="p-3 border-b border-gray-200 bg-purple-50">
          <button 
            onClick={startNewCase}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium"
          >
            New Conversation
          </button>
          <select
            className="w-full mt-2 border border-gray-300 rounded-md p-2 text-sm"
            value={currentCaseType}
            onChange={handleCaseTypeChange}
          >
            {Object.keys(CASE_TYPES).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-grow">
          <div className="px-3 py-2 bg-gray-100 text-xs font-medium text-gray-600 uppercase">
            Active Cases
          </div>
          {triageCases.filter(c => c.status === "Open").map(triageCase => (
            <div 
              key={triageCase.id} 
              className={`p-3 border-b border-gray-200 cursor-pointer ${
                currentCaseId === triageCase.id ? 'bg-purple-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => selectCase(triageCase.id)}
            >
              <div className="font-medium text-sm">{triageCase.patientName}</div>
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  triageCase.priority === "High" ? "bg-red-100 text-red-800" :
                  triageCase.priority === "Medium" ? "bg-yellow-100 text-yellow-800" :
                  "bg-green-100 text-green-800"
                }`}>
                  {triageCase.priority}
                </span>
                <span className="text-xs text-gray-500">{triageCase.type}</span>
              </div>
            </div>
          ))}
          
          <div className="px-3 py-2 bg-gray-100 text-xs font-medium text-gray-600 uppercase mt-2">
            Closed Cases
          </div>
          {triageCases.filter(c => c.status === "Closed").map(triageCase => (
            <div 
              key={triageCase.id} 
              className={`p-3 border-b border-gray-200 cursor-pointer ${
                currentCaseId === triageCase.id ? 'bg-purple-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => selectCase(triageCase.id)}
            >
              <div className="font-medium text-sm text-gray-500">{triageCase.patientName}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                  Closed
                </span>
                <span className="text-xs text-gray-400">{triageCase.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main chat area */}
      <div className="flex-grow flex flex-col bg-white">
        {currentCaseId ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-purple-700 text-white">
              <div>
                <h3 className="font-bold">
                  {triageCases.find(c => c.id === currentCaseId)?.patientName || "Patient"}
                </h3>
                <p className="text-sm text-purple-200">
                  {triageCases.find(c => c.id === currentCaseId)?.type || "General"} Case
                </p>
              </div>
              <div className="flex items-center">
                <select 
                  className="mr-2 text-sm bg-purple-800 text-white border border-purple-600 rounded p-1"
                  value={triageCases.find(c => c.id === currentCaseId)?.priority || "Medium"}
                  onChange={e => handlePriorityChange(currentCaseId, e.target.value)}
                >
                  {Object.keys(PRIORITIES).map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
                <select
                  className="text-sm bg-purple-800 text-white border border-purple-600 rounded p-1"
                  value={triageCases.find(c => c.id === currentCaseId)?.status || "Open"}
                  onChange={e => handleStatusChange(currentCaseId, e.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
            
            {/* Messages area */}
            <div className="flex-grow p-4 bg-white">
              {messages.map((msg, index) => (
                <div key={index} className={`mb-4 max-w-3xl ${
                  msg.role === 'assistant' 
                    ? 'ml-0 mr-auto' 
                    : msg.role === 'system' 
                      ? 'mx-auto text-center' 
                      : 'ml-auto mr-0'
                }`}>
                  <div className={`rounded-lg p-3 ${
                    msg.role === 'assistant' 
                      ? 'bg-white border border-purple-200' 
                      : msg.role === 'system' 
                        ? 'bg-gray-100 text-gray-500 text-sm' 
                        : 'bg-purple-600 text-white'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
            
            {/* Input area */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-center">
                <button 
                  onClick={triggerFileUpload}
                  className="mr-2 text-purple-600 hover:text-purple-800"
                  title="Upload files"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                />
                <div className="flex-grow relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={2}
                    disabled={isProcessing}
                  />
                  {isProcessing && (
                    <div className="absolute right-3 bottom-3 text-purple-600">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isProcessing}
                  className="ml-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {status === "Ready" ? (
                  <span>Press Enter to send, Shift+Enter for new line</span>
                ) : (
                  <span>{status}</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center bg-white p-8">
            <div className="text-purple-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Welcome to Chat Assistant</h3>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              Start a new conversation or select an existing case from the sidebar to begin triaging patient requests.
            </p>
            <button 
              onClick={startNewCase}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-full font-medium"
            >
              Start New Conversation
            </button>
          </div>
        )}
        
        {/* Patient information drawer - could be expanded with a toggle */}
        {currentCaseId && Object.keys(patientInfo).length > 0 && (
          <div className="border-t border-gray-200 p-3 bg-purple-50">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-purple-800">Patient Information</h4>
              <button className="text-purple-600 hover:text-purple-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {patientInfo.fullName && (
                <div>
                  <span className="font-medium text-gray-600">Name:</span> {patientInfo.fullName}
                </div>
              )}
              {patientInfo.dateOfBirth && (
                <div>
                  <span className="font-medium text-gray-600">DOB:</span> {patientInfo.dateOfBirth}
                </div>
              )}
              {patientInfo.phone && (
                <div>
                  <span className="font-medium text-gray-600">Phone:</span> {patientInfo.phone}
                </div>
              )}
              {patientInfo.email && (
                <div>
                  <span className="font-medium text-gray-600">Email:</span> {patientInfo.email}
                </div>
              )}
              {patientInfo.insuranceProvider && (
                <div>
                  <span className="font-medium text-gray-600">Insurance:</span> {patientInfo.insuranceProvider}
                </div>
              )}
              {patientInfo.policyNumber && (
                <div>
                  <span className="font-medium text-gray-600">Policy #:</span> {patientInfo.policyNumber}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatAssistant;