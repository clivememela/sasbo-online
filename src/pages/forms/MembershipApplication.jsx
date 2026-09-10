import PageTitle from '../../components/common/PageTitle';
export default function MembershipApplication() {
    const pdfUrl = "/src/assets/documents/Membership Application.pdf";

    return (
        <div className="p-6 text-ink">
            <PageTitle title="Membership Application" />
            <p className="mx-auto mb-8 max-w-prose text-center text-ink-muted leading-relaxed">
                Join Sasbo, The Finance Union, and become part of the strongest and most influential union in the South African financial services sector. Download or complete the application form below to start your journey towards better workplace representation and support.
            </p>

            <div className="max-w-6xl mx-auto bg-surface rounded-2xl shadow-lg p-6">
                <iframe
                src={pdfUrl}
                className="w-full h-dvh rounded-lg border border-line"
                title="Membership Application PDF"
            />
            </div>
        </div>
    );
}
