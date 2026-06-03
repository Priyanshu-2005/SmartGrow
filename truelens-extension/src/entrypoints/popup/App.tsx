import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import TLLogo from "@/assets/icon.png";
import { Shield, CircleDot, Settings, Save } from "lucide-react";

export default function App() {
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:8000");
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [editing, setEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState("");

  useEffect(() => {
    chrome.storage.local.get(
      { backendUrl: "http://127.0.0.1:8000" },
      (res) => {
        setBackendUrl(res.backendUrl as string);
        setTempUrl(res.backendUrl as string);
        checkConnection(res.backendUrl as string);
      },
    );
  }, []);

  const checkConnection = async (url: string) => {
    setBackendStatus("checking");
    try {
      const response = await chrome.runtime.sendMessage({
        action: "PING",
      });
      setBackendStatus(response?.ok ? "connected" : "disconnected");
    } catch {
      setBackendStatus("disconnected");
    }
  };

  const saveUrl = async () => {
    const cleanUrl = tempUrl.replace(/\/+$/, ""); // Remove trailing slashes
    setBackendUrl(cleanUrl);
    await chrome.storage.local.set({ backendUrl: cleanUrl });
    setEditing(false);
    checkConnection(cleanUrl);
  };

  const statusColor = {
    checking: "text-yellow-500",
    connected: "text-green-500",
    disconnected: "text-red-500",
  };

  const statusLabel = {
    checking: "Checking…",
    connected: "Connected",
    disconnected: "Disconnected",
  };

  return (
    <div className="dark" style={{ width: 360, minHeight: 280 }}>
      <div className="bg-background text-foreground flex h-full w-full flex-col font-sans">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <img
            src={TLLogo}
            alt="TrueLens Logo"
            className="h-7 w-7 rounded-sm"
          />
          <div>
            <p className="text-[13px] leading-none font-semibold">TrueLens</p>
            <p className="text-muted-foreground mt-0.5 text-[10px]">
              Content Authenticity Verification
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`ml-auto text-[10px] ${statusColor[backendStatus]}`}
          >
            <CircleDot className="mr-1 h-2.5 w-2.5" />
            {statusLabel[backendStatus]}
          </Badge>
        </div>

        <Separator />

        {/* How to Use */}
        <div className="px-4 py-3.5">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Shield className="text-muted-foreground h-4 w-4" />
            <Label className="text-[13px] font-medium">How to Use</Label>
          </div>
          <div className="space-y-2.5 text-[11px] leading-relaxed">
            <div className="bg-muted/50 flex items-start gap-2.5 rounded-lg p-2.5">
              <span className="mt-0.5 text-[13px]">1.</span>
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  Select any text
                </span>{" "}
                on a webpage (at least 20 characters)
              </p>
            </div>
            <div className="bg-muted/50 flex items-start gap-2.5 rounded-lg p-2.5">
              <span className="mt-0.5 text-[13px]">2.</span>
              <p className="text-muted-foreground">
                Click{" "}
                <span className="text-foreground font-medium">
                  Text Analysis
                </span>{" "}
                to check if text is AI-generated, or{" "}
                <span className="text-foreground font-medium">Fact Check</span>{" "}
                to verify claims
              </p>
            </div>
            <div className="bg-muted/50 flex items-start gap-2.5 rounded-lg p-2.5">
              <span className="mt-0.5 text-[13px]">3.</span>
              <p className="text-muted-foreground">
                Results appear inline. You can{" "}
                <span className="text-foreground font-medium">minimize</span> or{" "}
                <span className="text-foreground font-medium">close</span> them
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Backend URL Setting */}
        <div className="px-4 py-3.5">
          <div className="mb-2 flex items-center gap-1.5">
            <Settings className="text-muted-foreground h-3.5 w-3.5" />
            <Label className="text-[11px] font-medium tracking-wide uppercase">
              Backend Server
            </Label>
          </div>

          {editing ? (
            <div className="flex gap-1.5">
              <Input
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                className="h-8 text-[11px]"
                placeholder="http://127.0.0.1:8000"
                onKeyDown={(e) => e.key === "Enter" && saveUrl()}
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-2.5 text-[10px]"
                onClick={saveUrl}
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <code className="text-muted-foreground rounded bg-muted/50 px-2 py-1 text-[10px]">
                {backendUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-auto px-2 py-1 text-[10px]"
                onClick={() => {
                  setTempUrl(backendUrl);
                  setEditing(true);
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto px-4 py-2.5">
          <p className="text-muted-foreground text-center text-[9px]">
            TrueLens v1.0.0 — Content Authenticity Verification
          </p>
        </div>
      </div>
    </div>
  );
}
