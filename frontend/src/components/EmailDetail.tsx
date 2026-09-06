import { ArrowLeft, Clock3, Send, Star } from "lucide-react";

type Email = {
  id: string;
  recipient: string;
  senderEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
};

type EmailDetailProps = {
  email: Email;
  onBack: () => void;
};

export default function EmailDetail({ email, onBack }: EmailDetailProps) {
  const date = email.sentAt
    ? new Date(email.sentAt)
    : new Date(email.scheduledAt);

  return (
    <div className="min-h-screen bg-white text-[#171918]">
      <header className="flex h-[64px] items-center justify-between border-b border-[#eeeeee] px-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
          <Star size={16} />
        </button>
      </header>

      <main className="mx-auto max-w-[900px] px-8 py-8">
        <div className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            {email.status === "SENT" ? (
              <span className="flex items-center gap-1 rounded-full bg-[#f1f3f2] px-3 py-1 text-[10px] text-gray-500">
                <Send size={11} />
                Sent
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-[#fff0df] px-3 py-1 text-[10px] text-[#ed8b32]">
                <Clock3 size={11} />
                Scheduled
              </span>
            )}
          </div>

          <h1 className="text-[22px] font-semibold tracking-[-0.5px]">
            {email.subject}
          </h1>
        </div>

        <div className="border-b border-[#eeeeee] pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-800">
                {email.senderEmail}
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                To: {email.recipient}
              </p>
            </div>

            <p className="text-[10px] text-gray-400">
              {date.toLocaleString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <article className="whitespace-pre-wrap py-8 text-[13px] leading-7 text-gray-700">
          {email.body}
        </article>
      </main>
    </div>
  );
}
