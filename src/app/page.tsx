import { Navbar } from '@/components/Navbar';
import VoiceAssistantWrapper from '@/components/VoiceAssistantWrapper';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-gray-100">
        {/* Chat Section */}
        <section id="chat" className="min-h-screen flex items-center justify-center">
          <h2 className="text-3xl font-semibold text-gray-800">Chat Section</h2>
        </section>
        
        {/* Voice Section */}
        <section id="voice" className="min-h-screen py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-semibold text-gray-800 mb-8 text-center">Voice Assistant</h2>
            <VoiceAssistantWrapper />
          </div>
        </section>
        
        {/* Backend Section */}
        <section id="backend" className="min-h-screen flex items-center justify-center">
          <h2 className="text-3xl font-semibold text-gray-800">Backend Section</h2>
        </section>
      </main>
    </>
  );
}