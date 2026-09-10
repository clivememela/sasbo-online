import PageTitle from '../../components/common/PageTitle';
export default function MembershipApplication() {
    const pdfUrl = "/src/assets/documents/Membership Application.pdf";

    return (
        <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
            <PageTitle title="Membership Application" />
            <p className="mx-auto mb-8 max-w-prose text-center text-ink-muted leading-relaxed">
                Join Sasbo, The Finance Union, and become part of the strongest and most influential union in the South African financial services sector. Download or complete the application form below to start your journey towards better workplace representation and support.
            </p>

            <div className="mt-5 rounded-lg bg-surface p-6 shadow-(--shadow-1)">
                <iframe
                src={pdfUrl}
                className="w-full h-dvh rounded-lg border border-line"
                title="Membership Application PDF"
            />
            </div>
        </div>
    );
}
