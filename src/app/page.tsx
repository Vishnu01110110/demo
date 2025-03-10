import { Navbar } from '@/components/Navbar';
import VoiceAssistantWrapper from '@/components/VoiceAssistantWrapper';
import ChatAssistant from '@/components/Chat'; // Import the new ChatAssistant component

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-gray-100">
        {/* Backend Section */}
        <section id="backend" className="min-h-screen py-12 px-4 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-semibold text-purple-800 mb-8 text-center shadow-sm">Backend Section</h1>
          <div className="max-w-4xl text-center mb-8 p-6 bg-white rounded-xl shadow-md border-l-4 border-purple-500">
            <p className="text-lg text-gray-700 italic">
              This is just a demo for me to practice typescript and front end stuff will be deleted soon. 
              <span className="block mt-2 font-medium text-purple-700">Currently uses api calls so everything might be slow.</span>
            </p>
          </div>
          
          {/* Pipeline Visualization */}
          <div className="w-full max-w-4xl bg-white p-8 rounded-2xl shadow-lg">
            <h3 className="text-xl font-medium text-gray-800 mb-6 text-center">Processing Pipeline</h3>
            
            {/* Voice Assistant Pipeline */}
            <div className="mb-12">
              <h4 className="text-lg font-medium text-purple-800 mb-4">Voice Assistant Pipeline</h4>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">Audio Input</div>
                  <div className="text-sm text-gray-600">Browser MediaRecorder API</div>
                </div>
                <div className="text-purple-800">→</div>
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">Speech-to-Text</div>
                  <div className="text-sm text-gray-600">Whisper API</div>
                </div>
                <div className="text-purple-800">→</div>
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">LLM Processing</div>
                  <div className="text-sm text-gray-600">GPT API</div>
                </div>
                <div className="text-purple-800">→</div>
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">Text-to-Speech</div>
                  <div className="text-sm text-gray-600">TTS API</div>
                </div>
              </div>
            </div>
            
            {/* Chat Assistant Pipeline */}
            <div>
              <h4 className="text-lg font-medium text-purple-800 mb-4">Chat Assistant Pipeline</h4>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">Text Input</div>
                  <div className="text-sm text-gray-600">React UI</div>
                </div>
                <div className="text-purple-800">→</div>
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">Case Management</div>
                  <div className="text-sm text-gray-600">Priority & Type Analysis</div>
                </div>
                <div className="text-purple-800">→</div>
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">LLM Processing</div>
                  <div className="text-sm text-gray-600">GPT API</div>
                </div>
                <div className="text-purple-800">→</div>
                <div className="bg-purple-100 p-4 rounded-lg text-center flex-1">
                  <div className="text-purple-800 font-medium mb-2">Patient Info Extraction</div>
                  <div className="text-sm text-gray-600">Regex & NLP Analysis</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Voice Section */}
        <section id="voice" className="min-h-screen py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-semibold text-gray-800 mb-8 text-center">Voice Assistant</h2>
            <VoiceAssistantWrapper />
          </div>
        </section>
        
        {/* Chat Section */}
        <section id="chat" className="min-h-screen py-12 px-4 flex items-center justify-center">
          <div className="w-full max-w-6xl mx-auto">
            <h2 className="text-3xl font-semibold text-gray-800 mb-8 text-center">Chat Assistant</h2>
            <div className="h-[80vh]">
              <ChatAssistant /> {/* Add the ChatAssistant component here */}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}