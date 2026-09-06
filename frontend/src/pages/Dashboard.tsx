import { useEffect, useState } from "react";
import {
  Clock3,
  Send,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getScheduledEmails,
  getSentEmails,
  searchEmails,
  getSlackStatus,
  connectSlack,
  disconnectSlack,
} from "../lib/api";
import ComposeEmail from "../components/ComposeEmail";
import EmailDetail from "../components/EmailDetail";

type Tab = "scheduled" | "sent";

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

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("scheduled");

  const [scheduledEmails, setScheduledEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCompose, setShowCompose] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const [slackConnected, setSlackConnected] = useState(false);
  const [slackWorkspace, setSlackWorkspace] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [slackLoading, setSlackLoading] = useState(false);

  // Mobile sidebar drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadSlackStatus() {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const result = await getSlackStatus(token);

      setSlackConnected(result.connected);

      if (result.connected) {
        setSlackWorkspace(result.workspace || "");
        setSlackChannel(result.channel || "");
      }
    } catch (error) {
      console.error("Failed to load Slack status:", error);
    }
  }

  async function loadEmails() {
    if (!user) return;

    try {
      setLoading(true);
      setError("");

      const idToken = await user.getIdToken();

      const [scheduled, sent] = await Promise.all([
        getScheduledEmails(idToken),
        getSentEmails(idToken),
      ]);

      setScheduledEmails(scheduled);
      setSentEmails(sent);
    } catch (error) {
      console.error("Failed to load emails:", error);
      setError("Unable to load emails.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmails();
    loadSlackStatus();
  }, [user]);

  const emails = activeTab === "scheduled" ? scheduledEmails : sentEmails;

  async function handleSearch(value: string) {
    setSearchQuery(value);

    if (!user) return;

    if (!value.trim()) {
      loadEmails();
      return;
    }

    try {
      setSearching(true);
      setError("");

      const token = await user.getIdToken();
      const results = await searchEmails(token, value.trim());

      if (activeTab === "scheduled") {
        setScheduledEmails(results);
      } else {
        setSentEmails(results);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setError("Unable to search emails.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSlackConnect() {
    if (!user) return;

    try {
      setSlackLoading(true);

      const token = await user.getIdToken();

      await connectSlack(token);
    } catch (error) {
      console.error("Slack connection failed:", error);
      setSlackLoading(false);
    }
  }

  async function handleSlackDisconnect() {
    if (!user) return;

    try {
      setSlackLoading(true);

      const token = await user.getIdToken();

      await disconnectSlack(token);

      setSlackConnected(false);
      setSlackWorkspace("");
      setSlackChannel("");
    } catch (error) {
      console.error("Slack disconnect failed:", error);
    } finally {
      setSlackLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("slack") === "connected") {
      loadSlackStatus();

      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  // Close the mobile drawer whenever the user switches tabs/compose/detail
  function selectTab(tab: Tab) {
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  if (selectedEmail) {
    return (
      <EmailDetail
        email={selectedEmail}
        onBack={() => setSelectedEmail(null)}
      />
    );
  }

  if (showCompose) {
    return (
      <ComposeEmail
        onBack={() => setShowCompose(false)}
        onScheduled={() => {
          setShowCompose(false);
          loadEmails();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-[#171918]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] bg-white">
        {/* SIDEBAR BACKDROP (mobile only) */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[245px] max-w-[80vw] shrink-0 transform flex-col border-r border-[#eeeeee] bg-white px-5 py-6 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between px-2">
            <h1 className="text-[25px] font-black tracking-[-1.5px]">OUTBOX</h1>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Profile */}
          <div className="mb-4 rounded-xl bg-[#f5f7f6] p-2">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9dedb] text-sm font-semibold">
                  {user?.displayName?.charAt(0) || "U"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">
                  {user?.displayName || "User"}
                </p>

                <p className="truncate text-[10px] text-gray-400">
                  {user?.email}
                </p>
              </div>

              <span className="shrink-0 text-gray-400">⌄</span>
            </div>
          </div>

          {/* Compose */}
          <button
            onClick={() => {
              setShowCompose(true);
              setSidebarOpen(false);
            }}
            className="mb-7 flex h-9 w-full items-center justify-center rounded-full border border-[#18a957] text-[12px] font-medium text-[#15994d] transition hover:bg-[#effaf3]"
          >
            <Plus size={14} className="mr-1" />
            Compose
          </button>

          {/* Core */}
          <div>
            <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wider text-gray-400">
              Core
            </p>

            <button
              onClick={() => selectTab("scheduled")}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] ${
                activeTab === "scheduled"
                  ? "bg-[#e8f7ee] text-gray-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock3 size={13} />
                Scheduled
              </span>

              {scheduledEmails && scheduledEmails.length > 0 && (
                <span className="text-[10px] text-gray-400">
                  {scheduledEmails.length}
                </span>
              )}
            </button>

            <button
              onClick={() => selectTab("sent")}
              className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] ${
                activeTab === "sent"
                  ? "bg-[#e8f7ee] text-gray-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Send size={13} />
                Sent
              </span>

              {sentEmails && sentEmails.length > 0 && (
                <span className="text-[10px] text-gray-400">
                  {sentEmails.length}
                </span>
              )}
            </button>
          </div>
          <div className="mt-7">
            <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wider text-gray-400">
              Integrations
            </p>

            {!slackConnected ? (
              <button
                onClick={handleSlackConnect}
                disabled={slackLoading}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4A154B] text-[9px] font-bold text-white">
                    #
                  </span>

                  {slackLoading ? "Connecting..." : "Connect Slack"}
                </span>

                <span className="text-gray-300">→</span>
              </button>
            ) : (
              <div className="rounded-xl border border-[#eeeeee] bg-[#fafafa] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#4A154B] text-[10px] font-bold text-white">
                    #
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium text-gray-800">
                      {slackWorkspace || "Slack"}
                    </p>

                    <p className="truncate text-[9px] text-gray-400">
                      #{slackChannel || "Connected"}
                    </p>
                  </div>

                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#18a957]" />
                </div>

                <button
                  onClick={handleSlackDisconnect}
                  disabled={slackLoading}
                  className="mt-3 w-full rounded-lg border border-gray-200 py-1.5 text-[9px] text-gray-500 transition hover:bg-white hover:text-red-500 disabled:opacity-50"
                >
                  {slackLoading ? "Disconnecting..." : "Disconnect Slack"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-auto pt-10">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-500 hover:text-gray-900"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1">
          {/* Search bar */}
          <div className="flex h-[64px] items-center gap-2 border-b border-[#eeeeee] px-4 sm:h-[72px] sm:gap-3 sm:px-7">
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="relative min-w-0 max-w-[580px] flex-1">
              <Search
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Search"
                className="h-9 w-full rounded-full bg-[#f3f5f4] pl-10 pr-4 text-[11px] outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-[#18a957]"
              />
              {searching && (
                <span className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-[10px] text-gray-400 sm:inline">
                  Searching...
                </span>
              )}
            </div>

            <button className="hidden shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 sm:block">
              <SlidersHorizontal size={14} />
            </button>

            <button
              onClick={loadEmails}
              className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center text-sm text-gray-400">
              Loading emails...
            </div>
          ) : error ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-red-500">{error}</p>

                <button
                  onClick={loadEmails}
                  className="mt-3 rounded-full border border-gray-300 px-4 py-2 text-xs hover:bg-gray-50"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : emails && emails.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f5f4]">
                {activeTab === "scheduled" ? (
                  <Clock3 size={20} className="text-gray-400" />
                ) : (
                  <Send size={20} className="text-gray-400" />
                )}
              </div>

              <h2 className="text-sm font-medium text-gray-800">
                No {activeTab} emails
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                {activeTab === "scheduled"
                  ? "Your scheduled emails will appear here."
                  : "Emails you send will appear here."}
              </p>
            </div>
          ) : (
            <section>
              {emails &&
                emails.map((email) => (
                  <EmailRow
                    key={email.id}
                    email={email}
                    scheduled={activeTab === "scheduled"}
                    onClick={() => setSelectedEmail(email)}
                  />
                ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function EmailRow({
  email,
  scheduled,
  onClick,
}: {
  email: Email;
  scheduled: boolean;
  onClick: () => void;
}) {
  const date = scheduled
    ? new Date(email.scheduledAt)
    : email.sentAt
      ? new Date(email.sentAt)
      : null;

  return (
    <div
      onClick={onClick}
      className="flex min-h-[52px] cursor-pointer flex-wrap items-center gap-y-1 border-b border-[#f0f0f0] px-4 py-2 text-[11px] hover:bg-[#fafafa] sm:flex-nowrap sm:px-7 sm:py-0"
    >
      <div className="w-full shrink-0 truncate order-1 sm:order-none sm:w-[150px]">
        <span className="text-gray-800">To: {email.recipient}</span>
      </div>

      {scheduled ? (
        <div className="order-3 mr-3 shrink-0 rounded-full bg-[#fff0df] px-2 py-1 text-[9px] text-[#ed8b32] sm:order-none">
          ◷ {date ? formatDate(date) : "Scheduled"}
        </div>
      ) : (
        <div className="order-3 mr-3 shrink-0 rounded-full bg-[#f1f3f2] px-2 py-1 text-[9px] text-gray-500 sm:order-none">
          Sent
        </div>
      )}

      <div className="order-2 min-w-0 flex-1 truncate sm:order-none">
        <span className="font-medium text-gray-800">{email.subject}</span>

        <span className="ml-1 text-gray-400">- {email.body}</span>
      </div>

      <button className="order-4 ml-auto text-gray-300 hover:text-gray-600 sm:ml-4 sm:order-none">
        ☆
      </button>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
