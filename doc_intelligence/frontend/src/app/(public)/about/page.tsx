export default function AboutPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/aboutPage.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 border-b border-gray-700/40">
        <h1 className="text-5xl font-bold text-white mb-6">
          About Doc Intelligence
        </h1>

        <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
          Doc Intelligence transforms your documents into clear, verified answers.
          Built for professionals who need accuracy, speed, and trustworthy citations.
        </p>
      </section>

      {/* Mission Section */}
      <section className="px-6 py-24 flex justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-4xl">
          <h2 className="text-3xl font-semibold text-white mb-6">
            Our Mission
          </h2>

          <p className="text-gray-300 leading-relaxed text-lg mb-10">
            Information is locked inside documents — reports, PDFs, manuals,
            research papers, contracts, and more. Doc Intelligence exists to make
            that information accessible. Ask a question, and our system retrieves
            the exact context, generates a grounded answer, and verifies every
            citation. No hallucinations. No guesswork. Just clarity.
          </p>

          <h2 className="text-3xl font-semibold text-white mb-6">
            Why We Built This
          </h2>

          <p className="text-gray-300 leading-relaxed text-lg mb-10">
            Modern AI tools are powerful, but they often struggle with accuracy.
            When dealing with critical documents, you need answers you can trust.
            Doc Intelligence was designed to bridge that gap — combining semantic
            retrieval, structured processing, and citation verification to deliver
            reliable results every time.
          </p>

          <h2 className="text-3xl font-semibold text-white mb-6">
            What Makes Doc Intelligence Different
          </h2>

          <ul className="space-y-4 text-gray-300 text-lg">
            <li>• **Verified citations** for every answer</li>
            <li>• **Semantic retrieval** that understands meaning, not keywords</li>
            <li>• **Fast document processing** for PDFs, DOCX, TXT, and images</li>
            <li>• **Clear, concise answers** grounded in your content</li>
            <li>• **Privacy‑focused architecture** — your documents stay yours</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-gray-400 border-t border-gray-700/40">
        © {new Date().getFullYear()} Doc Intelligence. All rights reserved.
      </footer>
    </div>
  );
}
