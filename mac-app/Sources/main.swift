import AppKit
import WebKit

// Kiosk wrapper for the games at games.f4t.dev.
//
// While this app is frontmost, macOS suppresses process switching (Cmd-Tab,
// the three-finger Spaces/Mission Control trackpad gestures), force quit,
// and log out. The only way out is holding Escape for a few seconds.

let gameURL = URL(string: "https://games.f4t.dev")!
let quitHoldSeconds: TimeInterval = 3.0
let cursorIdleSeconds: TimeInterval = 3.0

// A borderless window refuses key status by default; the web view needs it
// to receive the child's key presses.
final class KioskWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: KioskWindow!
    private var webView: WKWebView!

    private var quitOverlay: NSView!
    private var quitProgress: NSProgressIndicator!
    private var quitStartedAt: Date?
    private var quitTimer: Timer?

    private var cursorTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.presentationOptions = [
            .hideDock,
            .hideMenuBar,
            .disableProcessSwitching,
            .disableForceQuit,
            .disableSessionTermination,
            .disableHideApplication,
        ]

        let screen = NSScreen.main ?? NSScreen.screens[0]
        window = KioskWindow(
            contentRect: screen.frame,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        // Above the menu bar layer, so nothing of the OS shows through.
        window.level = NSWindow.Level(rawValue: NSWindow.Level.mainMenu.rawValue + 1)
        window.backgroundColor = .black
        window.acceptsMouseMovedEvents = true

        webView = WKWebView(frame: screen.frame)
        webView.autoresizingMask = [.width, .height]
        webView.configuration.mediaTypesRequiringUserActionForPlayback = []
        webView.load(URLRequest(url: gameURL))
        window.contentView = webView

        buildQuitOverlay()
        installEventMonitors()
        scheduleCursorHide()

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationWillTerminate(_ notification: Notification) {
        NSApp.presentationOptions = []
        NSCursor.unhide()
    }

    // MARK: - Quit gate (hold Cmd-Q)

    private func buildQuitOverlay() {
        let overlay = NSView(frame: NSRect(x: 0, y: 0, width: 340, height: 90))
        overlay.wantsLayer = true
        overlay.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.75).cgColor
        overlay.layer?.cornerRadius = 12

        let label = NSTextField(labelWithString: "Keep holding Esc to quit\u{2026}")
        label.textColor = .white
        label.font = .systemFont(ofSize: 16, weight: .medium)
        label.frame = NSRect(x: 20, y: 48, width: 300, height: 24)
        overlay.addSubview(label)

        let progress = NSProgressIndicator(frame: NSRect(x: 20, y: 20, width: 300, height: 16))
        progress.style = .bar
        progress.isIndeterminate = false
        progress.minValue = 0
        progress.maxValue = quitHoldSeconds
        overlay.addSubview(progress)

        overlay.isHidden = true
        quitOverlay = overlay
        quitProgress = progress

        if let content = window.contentView {
            overlay.frame.origin = NSPoint(
                x: (content.bounds.width - overlay.frame.width) / 2,
                y: (content.bounds.height - overlay.frame.height) / 2
            )
            overlay.autoresizingMask = [.minXMargin, .maxXMargin, .minYMargin, .maxYMargin]
            content.addSubview(overlay)
        }
    }

    private func installEventMonitors() {
        NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp]) { [weak self] event in
            guard let self else { return event }
            let escapeKeyCode: UInt16 = 53
            switch event.type {
            case .keyDown where event.keyCode == escapeKeyCode:
                self.beginQuitHold()
                return nil // swallow: never reaches the web view
            case .keyUp where event.keyCode == escapeKeyCode:
                self.cancelQuitHold()
            default:
                break
            }
            return event
        }

        NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged]) { [weak self] event in
            self?.scheduleCursorHide()
            return event
        }
    }

    private func beginQuitHold() {
        guard quitStartedAt == nil else { return } // key-repeat fires keyDown again
        quitStartedAt = Date()
        quitOverlay.isHidden = false
        quitTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            guard let self, let start = self.quitStartedAt else { return }
            let held = Date().timeIntervalSince(start)
            self.quitProgress.doubleValue = held
            if held >= quitHoldSeconds {
                NSApp.terminate(nil)
            }
        }
    }

    private func cancelQuitHold() {
        guard quitStartedAt != nil else { return }
        quitStartedAt = nil
        quitTimer?.invalidate()
        quitTimer = nil
        quitProgress.doubleValue = 0
        quitOverlay.isHidden = true
    }

    // MARK: - Cursor idle-hide

    private func scheduleCursorHide() {
        cursorTimer?.invalidate()
        cursorTimer = Timer.scheduledTimer(withTimeInterval: cursorIdleSeconds, repeats: false) { _ in
            NSCursor.setHiddenUntilMouseMoves(true)
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
