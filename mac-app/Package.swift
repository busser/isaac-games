// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "IsaacGames",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "IsaacGames", path: "Sources")
    ]
)
