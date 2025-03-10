'use client'

import React, { useState, useEffect, useRef } from 'react';
import { voiceService, Message, Task, LANGUAGES, INITIAL_TASKS, PatientDetails } from '@/services/voiceService';

const PRELOADED_SCRIPTS: Record<string, string> = {
  "English": "Hello! I'm your AI clinic assistant. I'll help gather information for your clinic appointment. How can I assist you today?",
  "Spanish": "¡Hola! Soy su asistente virtual de la clínica. Le ayudaré a recopilar información para su cita en la clínica. ¿Cómo puedo ayudarle hoy?",
  "French": "Bonjour! Je suis votre assistant IA de la clinique. Je vais vous aider à collecter des informations pour votre rendez-vous à la clinique. Comment puis-je vous aider aujourd'hui?",
  "Chinese": "您好!我是您的AI医疗助理。我将帮助您收集诊所预约所需的信息。今天我能为您做些什么",
  "Hindi": "नमस्ते! मैं आपका AI क्लिनिक असिस्टेंट हूं। मैं आपके क्लिनिक अपॉइंटमेंट के लिए जानकारी एकत्र करने में आपकी सहायता करूंगा। आज मैं आपकी कैसे सहायता कर सकता हूँ?",
  "Japanese": "こんにちは!私はあなたのAIクリニックアシスタントです。診察予約に必要な情報収集をお手伝いします。本日はどのようにお手伝いできますか?",
  "German": "Hallo! Ich bin Ihr KI-Klinikassistent. Ich unterstütze Sie bei der Sammlung von Informationen für Ihren Kliniktermin. Wie kann ich Ihnen heute helfen?",
  "Arabic": "مرحبًا! أنا مساعد عيادة الذكاء الاصطناعي الخاص بك. سأساعدك في جمع المعلومات لموعدك في العيادة. كيف يمكنني مساعدتك اليوم?"
};

const VoiceAssistant: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>("English");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Ready");
  const [conversations, setConversations] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  // New state for captured patient details
  const [patientDetails, setPatientDetails] = useState<PatientDetails>({});

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const volumeMonitorRef = useRef<number | null>(null);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    setIsClient(true);
    checkMicPermission();
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (volumeMonitorRef.current) {
        cancelAnimationFrame(volumeMonitorRef.current);
      }
    };
  }, []);

  const checkMicPermission = async () => {
    if (!isClient) return;
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(permissionStatus.state as 'granted' | 'denied' | 'prompt');
        permissionStatus.onchange = () => {
          setMicPermission(permissionStatus.state as 'granted' | 'denied' | 'prompt');
          if (permissionStatus.state === 'granted') {
            getAudioDevices();
          }
        };
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setMicPermission('granted');
          getAudioDevices();
        } catch (error) {
          console.error('Error accessing microphone in fallback method:', error);
          setMicPermission('denied');
        }
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      setMicPermission('unknown');
    }
  };

  const getAudioDevices = async () => {
    if (!isClient) return;
    try {
      console.log("Attempting to get audio devices...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      audioStreamRef.current = stream;
      console.log("Got initial audio stream:", stream);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log("Found audio devices:", audioInputs);
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
        console.log("Selected device:", audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      addSystemMessage('Error accessing microphone. Please check browser permissions.');
    }
  };

  const requestMicrophonePermission = async () => {
    if (!isClient) return;
    try {
      console.log("Manually requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      audioStreamRef.current = stream;
      setMicPermission('granted');
      getAudioDevices();
      addSystemMessage('Microphone access granted.');
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setMicPermission('denied');
      addSystemMessage('Microphone access denied. Please enable it in your browser settings.');
    }
  };

  const addMessage = (role: 'assistant' | 'user' | 'system', content: string) => {
    setConversations(prev => [...prev, { role, content }]);
  };

  const addSystemMessage = (content: string) => {
    addMessage('system', content);
  };

  const startAssistant = async () => {
    if (!isClient) return;
    if (micPermission !== 'granted') {
      await requestMicrophonePermission();
    }
    setConversations([]);
    setTasks(INITIAL_TASKS.map(task => ({ ...task, completed: false })));
    setIsRecording(true);
    try {
      const greeting = PRELOADED_SCRIPTS[currentLanguage] || PRELOADED_SCRIPTS["English"];
      addMessage('assistant', greeting);
      setStatus("Speaking greeting...");
      await speakText(greeting);
      startListening();
    } catch (error) {
      console.error('Error starting assistant:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      addSystemMessage(`Error starting assistant: ${error instanceof Error ? error.message : String(error)}`);
      setIsRecording(false);
    }
  };

  const stopAssistant = () => {
    if (!isClient) return;
    setIsRecording(false);
    setIsListening(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (volumeMonitorRef.current) {
      cancelAnimationFrame(volumeMonitorRef.current);
      volumeMonitorRef.current = null;
    }
    setStatus("Assistant stopped");
    setVolume(0);
  };

  const toggleAssistant = () => {
    if (isRecording) {
      stopAssistant();
    } else {
      startAssistant();
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setCurrentLanguage(newLanguage);
    addSystemMessage(`Language changed to ${newLanguage}`);
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    if (isListening) {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      startListening();
    }
    const deviceName = audioDevices.find(d => d.deviceId === newDeviceId)?.label || 'Unknown device';
    addSystemMessage(`Microphone changed to ${deviceName}`);
  };

  const speakText = async (text: string): Promise<void> => {
    if (!isClient) return Promise.resolve();
    try {
      setIsSpeaking(true);
      setStatus("Speaking...");
      const audioData = await voiceService.textToSpeech(text);
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.play();
      });
    } catch (error) {
      console.error('Error generating speech:', error);
      addSystemMessage(`Speech error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSpeaking(false);
      setStatus(isListening ? "Listening..." : "Ready");
    }
  };

  const startVolumeMonitoring = (analyser: AnalyserNode) => {
    if (volumeMonitorRef.current) {
      cancelAnimationFrame(volumeMonitorRef.current);
    }
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const checkVolume = () => {
      if (!isListening) {
        volumeMonitorRef.current = null;
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedVolume = Math.min(average / 128, 1);
      setVolume(normalizedVolume);
      volumeMonitorRef.current = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  };

  const startListening = async () => {
    if (!isClient) return;
    console.log("startListening called, isRecording:", isRecording);
    try {
      setIsListening(true);
      setStatus("Listening...");
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      audioStreamRef.current = stream;
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const analyser = audioContextRef.current.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      startVolumeMonitoring(analyser);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          setStatus("No audio recorded");
          if (isRecordingRef.current) {
            startListening();
          }
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        try {
          setStatus("Processing speech...");
          const transcript = await voiceService.transcribeAudio(audioBlob, currentLanguage);
          if (transcript.trim()) {
            addMessage('user', transcript);
            const currentTaskIndex = tasks.findIndex(task => !task.completed);
            const currentTask = currentTaskIndex >= 0 ? tasks[currentTaskIndex].name : "Follow-up";
            
            // Pass in patientDetails so far into the LLM prompt
            setStatus("Generating response...");
            const response = await voiceService.processWithLLM(
              transcript, 
              conversations, 
              currentLanguage, 
              currentTask,
              patientDetails
            );
            addMessage('assistant', response);
            await speakText(response);

            // Update tasks
            const updatedTasks = voiceService.detectTaskCompletion(tasks, transcript, response, patientDetails);
            setTasks(updatedTasks);
            
            // Extract and merge new patient details
            const newDetails = voiceService.extractPatientDetails(transcript, response);
            setPatientDetails(prev => ({ ...prev, ...newDetails }));
          } else {
            setStatus("No speech detected");
          }
        } catch (error) {
          console.error('Error processing audio:', error);
          setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
          addSystemMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                console.log("Restarting listening...");
                startListening();
              } else {
                console.log("Not restarting - recording turned off");
              }
            }, 1000);
          } else {
            console.log("Recording stopped - not restarting listening");
          }
        }
      };
      
      let silenceStart: number | null = null;
      let hasSpeech = false;
      const SILENCE_THRESHOLD = 0.05;
      const MAX_SILENCE_DURATION = 500; // ms
      const MAX_RECORDING_DURATION = 10000; // ms
      
      const silenceDetector = setInterval(() => {
        if (!isListening || !mediaRecorder || mediaRecorder.state !== 'recording') {
          clearInterval(silenceDetector);
          return;
        }
        const now = Date.now();
        if (volume > SILENCE_THRESHOLD) {
          hasSpeech = true;
          silenceStart = null;
        } else if (hasSpeech) {
          if (silenceStart === null) {
            silenceStart = now;
          } else if (now - silenceStart > MAX_SILENCE_DURATION) {
            clearInterval(silenceDetector);
            mediaRecorder.stop();
            setStatus("Processing...");
          }
        }
      }, 100);
      
      mediaRecorder.start();
      
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, MAX_RECORDING_DURATION);
      
    } catch (error) {
      console.error('Error starting to listen:', error);
      setStatus(`Microphone error: ${error instanceof Error ? error.message : String(error)}`);
      addSystemMessage(`Could not access microphone: ${error instanceof Error ? error.message : String(error)}`);
      setIsListening(false);
    }
  };

  if (!isClient) {
    return <div className="p-4">Loading voice assistant...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 rounded-lg shadow-md max-w-4xl mx-auto">
      {/* Header Controls */}
      <div className="flex flex-wrap justify-between items-center mb-4 p-2 bg-white rounded-md shadow-sm">
        {/* Language Selector */}
        <div className="flex items-center mr-4 mb-2 sm:mb-0">
          <label htmlFor="language" className="mr-2 font-medium">Language:</label>
          <select 
            id="language" 
            value={currentLanguage}
            onChange={handleLanguageChange}
            className="border rounded px-2 py-1"
          >
            {Object.keys(LANGUAGES).map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        {/* Device Selector */}
        <div className="flex items-center flex-grow mr-4 mb-2 sm:mb-0">
          <label htmlFor="device" className="mr-2 font-medium">Microphone:</label>
          <select 
            id="device" 
            value={selectedDeviceId}
            onChange={handleDeviceChange}
            className="border rounded px-2 py-1 flex-grow"
            disabled={audioDevices.length === 0}
          >
            {audioDevices.length === 0 ? (
              <option value="">No microphones found</option>
            ) : (
              audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.substr(0,4)}`}
                </option>
              ))
            )}
          </select>
          {(micPermission === 'denied' || micPermission === 'prompt' || audioDevices.length === 0) && (
            <button
              onClick={requestMicrophonePermission}
              className="ml-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-2 rounded text-sm"
            >
              Grant Access
            </button>
          )}
        </div>
        {/* Call Button */}
        <div className="flex">
          <button
            onClick={toggleAssistant}
            className={`${isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
            } text-white font-bold rounded-full w-12 h-12 flex items-center justify-center`}
            disabled={micPermission !== 'granted'}
            title={isRecording ? 'End Call' : 'Start Call'}
          >
            {isRecording ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Microphone Permission Status */}
      {(micPermission === 'denied' || micPermission === 'unknown') && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Microphone Access Required</p>
          <p>Please allow microphone access in your browser to use the voice assistant.</p>
          <button
            onClick={requestMicrophonePermission}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-3 rounded"
          >
            Request Microphone Access
          </button>
        </div>
      )}
      {/* Conversation Display */}
      <div className="flex-grow bg-white rounded-md shadow-sm mb-4 overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto p-4">
          {conversations.length === 0 ? (
            <div className="text-gray-400 text-center mt-10">
              Start the assistant to begin a conversation
            </div>
          ) : (
            conversations.map((msg, index) => (
              <div key={index} className={`mb-4 ${
                msg.role === 'assistant' 
                  ? 'pl-2 border-l-4 border-blue-500' 
                  : msg.role === 'system' 
                    ? 'text-gray-500 text-sm italic' 
                    : 'pl-2 border-l-4 border-green-500'
              }`}>
                <div className="font-bold mb-1">
                  {msg.role === 'assistant' 
                    ? 'Assistant' 
                    : msg.role === 'user' 
                      ? 'You' 
                      : 'System'}
                </div>
                <div>{msg.content}</div>
              </div>
            ))
          )}
          <div ref={conversationEndRef} />
        </div>
        {/* Status Bar */}
        <div className="px-4 py-2 bg-gray-100 border-t flex items-center">
          <div className="text-gray-700 mr-2">{status}</div>
          {isListening && (
            <div className="flex-grow flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(volume * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Task Progress */}
      <div className="bg-white rounded-md shadow-sm p-4 mb-4">
        <h3 className="font-medium mb-2">Task Progress</h3>
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <div key={index} className="flex items-center">
              <input 
                type="checkbox" 
                checked={task.completed} 
                readOnly 
                className="mr-2"
              />
              <span className={task.completed ? 'line-through text-gray-500' : ''}>
                {task.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Patient Details Box */}
      <div className="bg-white rounded-md shadow-sm p-4 mb-4">
        <h3 className="font-medium mb-2">Patient Details</h3>
        {Object.keys(patientDetails).length === 0 ? (
          <p className="text-gray-500">No details captured yet.</p>
        ) : (
          <ul className="list-disc pl-5">
            {patientDetails.phone && <li><strong>Phone:</strong> {patientDetails.phone}</li>}
            {patientDetails.fullName && <li><strong>Name:</strong> {patientDetails.fullName}</li>}
            {/* Add more fields as needed */}
          </ul>
        )}
      </div>
      {/* Debug Info */}
      <div className="mt-4 p-2 bg-gray-100 text-xs text-gray-600 rounded">
        <p>Microphone Permission: {micPermission}</p>
        <p>Devices Found: {audioDevices.length}</p>
        <p>Selected Device: {selectedDeviceId || 'None'}</p>
        <p>Current Volume: {Math.round(volume * 100)}%</p>
      </div>
    </div>
  );
};

export default VoiceAssistant;
