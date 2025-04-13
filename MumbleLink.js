const File = Java.type("java.io.File");
const URLClassLoader = Java.type("java.net.URLClassLoader");
const Thread = Java.type("java.lang.Thread");
const Float = Java.type("java.lang.Float");
const URL = Java.type("java.net.URL");
const Files = Java.type("java.nio.file.Files");
const Paths = Java.type("java.nio.file.Paths");

const workingDir = new File("").getAbsolutePath();
const mumbleFolderPath = new File(workingDir + "\\LiquidBounce\\Mumble");

if (!mumbleFolderPath.exists()) {
    try {
        mumbleFolderPath.mkdirs();
    } catch (error) {
        Client.displayChatMessage("§c§lERROR: §rFailed to create Mumble folder - " + error.message);
    }
}

function setupDependencies() {
    const dependencies = [
        {
            filePath: "\\LiquidBounce\\Mumble\\java-mumble-link-0.2.6.jar",
            downloadUrl: "https://github.com/liquidsquid1/MumbleLinkLB/raw/refs/heads/main/lib/java-mumble-link-0.2.6.jar"
        },
        {
            filePath: "\\LiquidBounce\\Mumble\\jvm-shared-memory-0.2.9.jar",
            downloadUrl: "https://github.com/liquidsquid1/MumbleLinkLB/raw/refs/heads/main/lib/jvm-shared-memory-0.2.9.jar"
        }
    ];

    dependencies.forEach(dependency => {
        const file = new File(workingDir + dependency.filePath);
        if (!file.exists()) {
            try {
                Client.displayChatMessage(`§cDownloading file: ${file.getName()}`);
                downloadFile(dependency.downloadUrl, file.getAbsolutePath());
            } catch (error) {
                throw new Error(`§c§lFailed to download ${file.getName()} - ${error.message}`);
            }
        }
    });

    const jarURLs = dependencies.map(dependency => new File(workingDir + dependency.filePath).toURI().toURL());
    const currentClassLoader = Thread.currentThread().getContextClassLoader();
    const classLoader = new URLClassLoader(jarURLs, currentClassLoader);
    Thread.currentThread().setContextClassLoader(classLoader);

    return {
        SharedMemory: classLoader.loadClass("com.skaggsm.sharedmemory.SharedMemory"),
        MumbleLinkImpl: classLoader.loadClass("com.skaggsm.jmumblelink.MumbleLinkImpl")
    };
}

function downloadFile(url, outputPath) {
    const connection = new URL(url).openConnection();
    const inputStream = connection.getInputStream();
    Files.copy(inputStream, Paths.get(outputPath));
    inputStream.close();
}

const { SharedMemory, MumbleLinkImpl } = setupDependencies();

const script = registerScript({
    name: "MumbleLink",
    version: "1.0.0",
    authors: ["@liquidsquid1"]
});

script.registerModule({
    name: "MumbleLink",
    category: "Misc",
    description: "Allows you to speak to other people on the same mumble channel."
}, (mod) => {
    let mumbleLink = null;

    mod.on("enable", () => {
        mumbleLink = new MumbleLinkImpl();
        Client.displayChatMessage("§aMumble linked successfully!");
    });

    mod.on("playerTick", () => {
        if (mumbleLink == null) return;

        const x = Float.valueOf((mc.player.x).toString());
        const y = Float.valueOf((mc.player.y + mc.player.height).toString());
        const z = Float.valueOf((mc.player.z).toString());
        const yaw = Float.valueOf((mc.player.yaw).toString());
        const sinYaw = Float.valueOf(Math.sin(yaw).toString());
        const cosYaw = Float.valueOf(Math.cos(yaw).toString());
        const pitch = Float.valueOf(mc.player.pitch.toString());

        const cameraPosition = [x, y, z];
        const cameraOrientation = [sinYaw, cosYaw, pitch];
        const cameraTopPoint = [0, 1, 0];

        mumbleLink.setUiVersion(2);
        mumbleLink.incrementUiTick();
        mumbleLink.setName("Minecraft");
        mumbleLink.setContext("Context");
        mumbleLink.setIdentity(mc.player.nameForScoreboard);
        mumbleLink.setAvatarPosition(cameraPosition);
        mumbleLink.setCameraPosition(cameraPosition);
        mumbleLink.setCameraTop(cameraTopPoint);
        mumbleLink.setAvatarTop(cameraTopPoint);
        mumbleLink.setCameraFront(cameraOrientation);
        mumbleLink.setAvatarFront(cameraOrientation);
    });

    mod.on("disable", () => {
        if (mumbleLink != null) {
            try {
                mumbleLink.close();
                Client.displayChatMessage("§aMumble unlinked successfully!");
            } catch (error) {
                Client.displayChatMessage("§c§lERROR: §rFailed to unlink Mumble - " + error.message);
            } finally {
                mumbleLink = null;
            }
        }
    });
});
