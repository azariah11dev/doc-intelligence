export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/landingPage.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 border-b border-gray-700/40">
        <h1 className="text-5xl font-bold text-white mb-6">
          Turn Documents Into Verified Answers
        </h1>

        <p className="text-lg text-gray-300 max-w-2xl leading-relaxed mb-10">
          Upload any document. Ask a question. Get a citation-verified answer powered by intelligent retrieval and analysis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/demo"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Try a Demo
          </a>

          <a
            href="/signup"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Make an Account
          </a>
        </div>
      </section>

      {/* Pipeline */}
      <section className="px-6 py-24 flex justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-5xl">
          <h2 className="text-3xl font-semibold text-white text-center mb-12">
            How It Works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                1. Upload Document
              </h3>
              <p className="text-gray-700">
                PDF, DOCX, TXT, or images — instantly ingested and prepared.
              </p>
            </div>

            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                2. Process Document
              </h3>
              <p className="text-gray-700">
                Extract text, chunk intelligently, embed, and index for retrieval.
              </p>
            </div>

            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                3. Ask Question
              </h3>
              <p className="text-gray-700">
                Natural language queries — no formatting required.
              </p>
            </div>

            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                4. Retrieve Context
              </h3>
              <p className="text-gray-700">
                Relevant passages pulled from your document using semantic search.
              </p>
            </div>

            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                5. Generate Answer
              </h3>
              <p className="text-gray-700">
                AI produces a clear, concise answer grounded in retrieved context.
              </p>
            </div>

            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                6. Verify Citation
              </h3>
              <p className="text-gray-700">
                Every answer includes exact source citations for verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-gray-400 border-t border-gray-700/40">
        © {new Date().getFullYear()} Doc Intelligence. All rights reserved.
      </footer>
    </div>
  );
}
