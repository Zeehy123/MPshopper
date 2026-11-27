import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { canScan, isValidGtin, normalizeBarcode, SCAN_FORMATS } from "../barcode";

// A pop-up that reads barcodes with the camera (where the browser can) and always lets
// the person type or paste a number instead (a USB scanner types it for you).
// onDetect(code) is called for every code read; the same code is ignored for 3 seconds.
export default function Scanner({ onDetect, onClose, children }) {
  const videoRef = useRef(null);
  const handlerRef = useRef(onDetect);
  const [cameraError, setCameraError] = useState("");
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState("");
  const cameraOk = canScan();

  // always call the newest handler, without restarting the camera
  useEffect(() => {
    handlerRef.current = onDetect;
  });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!cameraOk) return;
    let stream = null;
    let timer = null;
    let stopped = false;
    let last = { code: "", at: 0 };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        let detector;
        try {
          detector = new window.BarcodeDetector({ formats: SCAN_FORMATS });
        } catch {
          detector = new window.BarcodeDetector(); // some devices reject the format list
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        timer = setInterval(async () => {
          if (video.readyState < 2) return;
          try {
            const found = await detector.detect(video);
            const code = found[0]?.rawValue;
            if (!code) return;
            const t = Date.now();
            if (code === last.code && t - last.at < 3000) return;
            last = { code, at: t };
            handlerRef.current(code);
          } catch {
            /* a frame that could not be read: try the next one */
          }
        }, 300);
      } catch (e) {
        setCameraError(
          e?.name === "NotAllowedError"
            ? "Camera permission was denied. You can type the number instead."
            : "Could not start the camera. You can type the number instead.",
        );
      }
    })();

    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOk]);

  function submitManual(e) {
    e.preventDefault();
    const code = normalizeBarcode(manual);
    if (!isValidGtin(code)) {
      setManualError("That does not look like a valid barcode. Check the digits.");
      return;
    }
    setManualError("");
    setManual("");
    handlerRef.current(code);
  }

  return (
    <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label="Scan a barcode">
      <div className="scanner card">
        <div className="scanner-head">
          <h2>Scan a barcode</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close scanner">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {cameraOk && !cameraError ? (
          <video ref={videoRef} className="scanner-video" muted playsInline />
        ) : (
          <p className="muted">
            {cameraError ||
              "This browser cannot scan with the camera (Chrome on Android can). Type the number below."}
          </p>
        )}

        {children}

        <form className="scanner-manual" onSubmit={submitManual}>
          <label>
            Or type the number
            <input
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. 5449000000996"
              aria-label="Barcode number"
            />
          </label>
          {manualError && <span className="error">{manualError}</span>}
          <button type="submit" disabled={!manual.trim()}>
            Use this number
          </button>
        </form>
      </div>
    </div>
  );
}
