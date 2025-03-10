'use client'

import dynamic from 'next/dynamic';

// Use dynamic import with ssr: false inside a Client Component
const VoiceAssistant = dynamic(() => import('@/components/voice'), {
  ssr: false,
  loading: () => <div className="p-4 bg-white rounded-lg shadow-md text-center">Loading voice assistant...</div>
});

export default function VoiceAssistantWrapper() {
  return <VoiceAssistant />;
}