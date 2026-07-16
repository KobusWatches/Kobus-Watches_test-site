#!/usr/bin/env python3
"""Kobus screenshot tool — Chrome DevTools Protocol, no Node required.

Usage: python3 screenshot.py <url> [label] [--width 1440] [--height 900] [--full]

Saves to ./temporary screenshots/screenshot-N[-label].png (auto-incremented).
--full captures the whole page (reveals are forced visible first).
"""
import base64, json, os, re, subprocess, sys, time, urllib.request

import websocket

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temporary screenshots")
DEBUG_PORT = 9333

def next_path(label):
    os.makedirs(OUT_DIR, exist_ok=True)
    nums = [int(m.group(1)) for f in os.listdir(OUT_DIR)
            if (m := re.match(r"screenshot-(\d+)", f))]
    n = max(nums, default=0) + 1
    suffix = f"-{label}" if label else ""
    return os.path.join(OUT_DIR, f"screenshot-{n}{suffix}.png")

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    url = args[0]
    label = args[1] if len(args) > 1 else ""
    def opt(name, default):
        for a in sys.argv[1:]:
            if a.startswith(f"--{name}="):
                return int(a.split("=")[1])
        return default
    width, height = opt("width", 1440), opt("height", 900)
    full = "--full" in sys.argv

    proc = subprocess.Popen([
        CHROME, "--headless=new", f"--remote-debugging-port={DEBUG_PORT}",
        "--remote-allow-origins=*",
        "--no-first-run", "--hide-scrollbars", f"--window-size={width},{height}",
        "--user-data-dir=/tmp/kobus-chrome-profile", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://localhost:{DEBUG_PORT}/json"))
                page = next(t for t in tabs if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.2)
        ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30)
        mid = [0]
        def send(method, params=None):
            mid[0] += 1
            ws.send(json.dumps({"id": mid[0], "method": method, "params": params or {}}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get("id") == mid[0]:
                    return msg.get("result", {})

        send("Page.enable")
        # The persistent profile caches CSS/JS across runs; always fetch fresh.
        send("Network.enable")
        send("Network.setCacheDisabled", {"cacheDisabled": True})
        send("Emulation.setDeviceMetricsOverride",
             {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": width < 500})
        send("Page.navigate", {"url": url})
        deadline = time.time() + 15
        while time.time() < deadline:
            msg = json.loads(ws.recv())
            if msg.get("method") == "Page.loadEventFired":
                break
        time.sleep(1.5)  # fonts + load-fade animations

        shot_args = {"format": "png"}
        if full:
            send("Runtime.evaluate", {"expression":
                "document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-visible'))"})
            time.sleep(0.9)
            shot_args["captureBeyondViewport"] = True
        data = send("Page.captureScreenshot", shot_args)
        path = next_path(label)
        with open(path, "wb") as f:
            f.write(base64.b64decode(data["data"]))
        print(path)
        ws.close()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    main()
