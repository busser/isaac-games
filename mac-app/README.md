# Kiosk wrapper

A small macOS app that shows https://games.f4t.dev in a fullscreen web view
and puts the system in kiosk mode while it runs. This stops the accidental
trackpad gestures (three-finger swipes, Mission Control) that pull the child
out of the game. The app needs a network connection; it does not bundle the
games.

## Build

```
./build.sh
ln -sfn "$PWD/build/IsaacGames.app" /Applications/IsaacGames.app
```

The app is ad-hoc signed. It is built locally, not distributed. The symlink
makes every rebuild take effect immediately; create it once. Known symlink
quirk: Spotlight and Launchpad may not index the app, but Finder, the Dock,
and `open -a IsaacGames` work.

## Use

Launch it like any app: Finder, Dock, Spotlight, or `open -a IsaacGames`.
It goes fullscreen immediately. While it is frontmost, macOS blocks Cmd-Tab,
the Spaces and Mission Control trackpad gestures, force quit, and log out.

To quit: hold the Escape key for 3 seconds. An on-screen progress bar shows
while you hold. A short press does nothing. Escape never reaches the games.

The mouse cursor hides after 3 seconds without movement and comes back when
the trackpad moves.

Escape hatches if the app misbehaves: SSH from another machine, or hold the
power button.
