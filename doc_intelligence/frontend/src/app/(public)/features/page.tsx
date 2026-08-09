export default function FeaturesPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/featuresPage.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 border-b border-gray-700/40">
        <h1 className="text-5xl font-bold text-white mb-6">
          Features
        </h1>

        <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
          Powerful tools designed to help you extract meaning, retrieve context,
          and generate verified answers from any document.
        </p>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-24 flex justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

            {/* Feature 1 */}
            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Smart Document Upload
              </h2>
              <p className="text-gray-700">
                Upload PDFs, DOCX, TXT, or images. Your files are instantly prepared
                for processing with secure handling.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Intelligent Processing
              </h2>
              <p className="text-gray-700">
                Automatic text extraction, chunking, and embedding optimized for
                high-accuracy semantic retrieval.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Natural Language Questions
              </h2>
              <p className="text-gray-700">
                Ask questions conversationally — no formatting or special syntax
                required.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Semantic Context Retrieval
              </h2>
              <p className="text-gray-700">
                Retrieve the most relevant passages using advanced vector search
                and document understanding.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Grounded Answer Generation
              </h2>
              <p className="text-gray-700">
                AI-generated answers that stay grounded in your document's content
                — no hallucinations.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-white/95 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Verified Citations
              </h2>
              <p className="text-gray-700">
                Every answer includes exact citations so you can verify the source
                instantly.
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
