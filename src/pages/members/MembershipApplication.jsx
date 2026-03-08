export default function MembershipApplication() {
    const pdfUrl = "/src/assets/documents/Membership Application.pdf";

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
                Membership Application
            </h2>

            <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <iframe
                src={pdfUrl}
                className="w-full h-screen rounded-lg border border-gray-200 dark:border-gray-700"
                title="Membership Application PDF"
            />
            </div>
        </div>
    );
}
