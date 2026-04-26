import { useState } from "react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Share, X } from "lucide-react";

export function PWAInstallButton() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || !canInstall || dismissed) return null;

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      promptInstall();
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 text-xs h-8 px-2.5 border-primary/40 text-primary hover:bg-primary/10"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* iOS Installation Guide */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Install FinTrack
            </DialogTitle>
            <DialogDescription>
              Add FinTrack to your home screen for the best experience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Tap the</span>
                <Share className="h-4 w-4 text-primary inline" />
                <span>
                  <strong>Share</strong> button in Safari's toolbar
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <p className="text-sm">
                Scroll down and tap{" "}
                <strong>"Add to Home Screen"</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <p className="text-sm">
                Tap <strong>"Add"</strong> in the top right corner
              </p>
            </div>
          </div>
          <Button
            className="w-full mt-2"
            onClick={() => {
              setShowIOSGuide(false);
              setDismissed(true);
            }}
          >
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
