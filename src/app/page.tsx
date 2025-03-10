import { Navbar } from '@/components/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-gray-100 min-h-screen">
        {/* Chat Section */}
        <section id="chat" className="min-h-screen flex items-center justify-center">
          <h2 className="text-3xl font-semibold text-gray-800">Chat Section</h2>
        </section>

        {/* Voice Section */}
        <section id="voice" className="min-h-screen flex items-center justify-center">
          <h2 className="text-3xl font-semibold text-gray-800">Voice Agent Section</h2>
        </section>

        {/* Backend Section */}
        <section id="backend" className="min-h-screen flex items-center justify-center">
          <h2 className="text-3xl font-semibold text-gray-800">Backend Section</h2>
        </section>
      </main>
    </>
  );
}