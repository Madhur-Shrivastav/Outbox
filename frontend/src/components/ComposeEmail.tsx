import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock3, Upload, X, Send, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSenders, uploadLeads, scheduleEmailsBulk } from "../lib/api";

type Sender = {
  id: string;
  email: string;
  displayName: string | null;
};

type ComposeEmailProps = {
  onBack: () => void;
  onScheduled: () => void;
};

export default function ComposeEmail({
  onBack,
  onScheduled,
}: ComposeEmailProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderEmail, setSenderEmail] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [delaySeconds, setDelaySeconds] = useState("2");
  const [hourlyLimit, setHourlyLimit] = useState("200");

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSenders() {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const result = await getSenders(token);

        setSenders(result);

        if (result.length > 0) {
          setSenderEmail(result[0].email);
        }
      } catch (error) {
        console.error("Failed to load senders:", error);
        setError("Unable to load senders.");
      }
    }

    loadSenders();
  }, [user]);

  function addRecipient(value: string) {
    const email = value.trim().replace(/,$/, "");

    if (!email) return;

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!recipients.includes(email)) {
      setRecipients((current) => [...current, email]);
    }

    setRecipientInput("");
    setError("");
  }

  function removeRecipient(email: string) {
    setRecipients((current) => current.filter((item) => item !== email));
  }

  function handleRecipientKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter" || event.key === "," || event.key === " ") {
      event.preventDefault();
      addRecipient(recipientInput);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const token = await user.getIdToken();
      const result = await uploadLeads(token, file);

      const uploadedRecipients = result.leads
        ?.map((lead: { email: string }) => lead.email)
        .filter(Boolean);

      setRecipients((current) => {
        return Array.from(new Set([...current, ...uploadedRecipients]));
      });

      setSuccess(
        `${uploadedRecipients && uploadedRecipients.length} leads detected and added.`,
      );
    } catch (error) {
      console.error("CSV upload failed:", error);
      setError("Unable to upload CSV.");
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function openScheduleModal() {
    setError("");
    setSuccess("");

    if (!senderEmail) {
      setError("Please select a sender.");
      return;
    }

    if (recipients && recipients.length === 0) {
      setError("Please add at least one recipient.");
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    if (!body.trim()) {
      setError("Please enter an email body.");
      return;
    }

    setShowScheduleModal(true);
  }

  async function handleSchedule() {
    if (!user) return;

    if (!scheduledAt) {
      setError("Please select when to send the emails.");
      return;
    }

    const selectedDate = new Date(scheduledAt);

    if (Number.isNaN(selectedDate.getTime())) {
      setError("Invalid scheduled date.");
      return;
    }

    if (selectedDate.getTime() <= Date.now()) {
      setError("Please select a future date and time.");
      return;
    }

    const delay = Number(delaySeconds);
    const limit = Number(hourlyLimit);

    if (!Number.isFinite(delay) || delay < 0) {
      setError("Delay must be a valid positive number.");
      return;
    }

    if (!Number.isFinite(limit) || limit <= 0) {
      setError("Hourly limit must be greater than zero.");
      return;
    }

    try {
      setSending(true);
      setError("");
      setSuccess("");

      const token = await user.getIdToken();

      const result = await scheduleEmailsBulk(token, {
        senderEmail,
        recipients,
        subject: subject.trim(),
        body: body.trim(),
        scheduledAt: selectedDate.toISOString(),
        delayBetweenEmails: delay,
        hourlyLimit: limit,
      });

      setShowScheduleModal(false);

      setSuccess(
        `${result.count} email${
          result.count === 1 ? "" : "s"
        } scheduled successfully.`,
      );

      setTimeout(() => {
        onScheduled();
      }, 800);
    } catch (error) {
      console.error("Scheduling failed:", error);

      setError("Unable to schedule the emails. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-[#171918]">
      {/* Header */}

      <header className="flex h-[72px] items-center justify-between border-b border-[#eeeeee] bg-white px-5 sm:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13px] text-gray-700 transition hover:text-black"
        >
          <ArrowLeft size={16} />
          Compose New Email
        </button>

        <button
          onClick={openScheduleModal}
          className="flex items-center gap-2 rounded-full border border-[#18a957] px-5 py-2 text-[11px] font-medium text-[#15994d] transition hover:bg-[#effaf3]"
        >
          <Clock3 size={13} />
          Send Later
        </button>
      </header>

      {/* Content */}

      <main className="mx-auto max-w-[950px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="overflow-hidden rounded-2xl border border-[#eeeeee] bg-white shadow-sm">
          {/* From */}

          <div className="flex items-center border-b border-[#eeeeee] px-5 py-4 sm:px-7">
            <label className="w-[60px] shrink-0 text-[11px] text-gray-500">
              From
            </label>

            <select
              value={senderEmail}
              onChange={(event) => setSenderEmail(event.target.value)}
              className="max-w-full rounded-lg bg-[#f5f7f6] px-3 py-2 text-[11px] outline-none focus:ring-1 focus:ring-[#18a957]"
            >
              {senders && senders.length === 0 ? (
                <option value="">No sender connected</option>
              ) : (
                senders.map((sender) => (
                  <option key={sender.id} value={sender.email}>
                    {sender.displayName
                      ? `${sender.displayName} <${sender.email}>`
                      : sender.email}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Recipients */}

          <div className="flex items-start border-b border-[#eeeeee] px-5 py-4 sm:px-7">
            <label className="w-[60px] shrink-0 pt-2 text-[11px] text-gray-500">
              To
            </label>

            <div className="flex min-h-[34px] min-w-0 flex-1 flex-wrap items-center gap-2">
              {recipients &&
                recipients.map((email) => (
                  <span
                    key={email}
                    className="flex max-w-full items-center gap-1 rounded-full border border-[#bde8cd] bg-[#effaf3] px-2.5 py-1 text-[10px] text-gray-700"
                  >
                    <span className="truncate">{email}</span>

                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="shrink-0 text-gray-400 hover:text-gray-700"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

              <input
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                onKeyDown={handleRecipientKeyDown}
                onBlur={() => {
                  if (recipientInput.trim()) {
                    addRecipient(recipientInput);
                  }
                }}
                placeholder={
                  recipients.length
                    ? "Add recipient..."
                    : "recipient@example.com"
                }
                className="min-w-[160px] flex-1 bg-transparent py-2 text-[11px] outline-none placeholder:text-gray-400"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-[#15994d] transition hover:bg-[#effaf3]"
              >
                <Upload size={12} />
                Upload List
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Subject */}

          <div className="flex items-center border-b border-[#eeeeee] px-5 py-4 sm:px-7">
            <label className="w-[60px] shrink-0 text-[11px] text-gray-500">
              Subject
            </label>

            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject"
              className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Settings */}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[#eeeeee] px-5 py-4 sm:px-7">
            <label className="flex items-center gap-2 text-[10px] text-gray-500">
              Delay between emails
              <input
                type="number"
                min="0"
                value={delaySeconds}
                onChange={(event) => setDelaySeconds(event.target.value)}
                className="w-[58px] rounded-md border border-gray-200 px-2 py-1.5 text-[10px] text-gray-800 outline-none focus:border-[#18a957]"
              />
              <span className="text-[9px] text-gray-400">sec</span>
            </label>

            <label className="flex items-center gap-2 text-[10px] text-gray-500">
              Hourly Limit
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(event) => setHourlyLimit(event.target.value)}
                className="w-[65px] rounded-md border border-gray-200 px-2 py-1.5 text-[10px] text-gray-800 outline-none focus:border-[#18a957]"
              />
            </label>
          </div>

          {/* Body */}

          <div>
            <div className="flex items-center gap-2 border-b border-[#eeeeee] bg-[#fafafa] px-5 py-3 text-[10px] text-gray-400 sm:px-7">
              <FileText size={12} />
              Email Body
            </div>

            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your email..."
              className="min-h-[350px] w-full resize-none p-5 text-[12px] leading-6 text-gray-700 outline-none placeholder:text-gray-400 sm:p-7"
            />
          </div>
        </div>

        {/* Status */}

        {uploading && (
          <div className="mt-4 rounded-xl bg-white px-4 py-3 text-[11px] text-gray-500 shadow-sm">
            Uploading CSV...
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl bg-[#effaf3] px-4 py-3 text-[11px] text-[#15994d]">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[11px] text-red-500">
            {error}
          </div>
        )}

        {recipients && recipients.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400">
            <Upload size={12} />
            {recipients.length} recipient
            {recipients.length === 1 ? "" : "s"} detected
          </div>
        )}
      </main>

      {/* Send Later Modal */}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-[430px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  Send Later
                </h2>

                <p className="mt-1 text-[10px] text-gray-400">
                  Choose when these emails should begin sending.
                </p>
              </div>

              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={15} />
              </button>
            </div>

            <div className="rounded-xl border border-[#eeeeee] bg-[#fafafa] p-4">
              <label className="mb-2 block text-[10px] font-medium text-gray-600">
                Start sending at
              </label>

              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#18a957]"
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-[9px] text-gray-400">Recipients</p>

                  <p className="mt-1 text-[13px] font-semibold text-gray-800">
                    {recipients && recipients.length}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-3">
                  <p className="text-[9px] text-gray-400">Hourly limit</p>

                  <p className="mt-1 text-[13px] font-semibold text-gray-800">
                    {hourlyLimit}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-full px-4 py-2 text-[10px] text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={handleSchedule}
                disabled={sending}
                className="flex items-center gap-2 rounded-full bg-[#18a957] px-5 py-2.5 text-[10px] font-medium text-white transition hover:bg-[#14954b] disabled:opacity-50"
              >
                <Send size={12} />

                {sending ? "Scheduling..." : "Schedule Emails"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
