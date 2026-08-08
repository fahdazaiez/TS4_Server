const UPDATE_URL = "/data/latest.json";

async function loadLatestVersion() {
    try {
        const response = await fetch(
            UPDATE_URL + "?t=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Could not load latest.json");
        }

        const data = await response.json();

        const version = data.version;

        if (!version) {
            throw new Error("Version not found");
        }

        // Create automatic filename
        const fileName = `TS4_Updater_v${version}.exe`;

        // Create automatic download URL
        const downloadUrl = `/downloads/${fileName}`;

        // Display version
        const versionElement =
            document.getElementById("latestVersion");

        if (versionElement) {
            versionElement.textContent = version;
        }

        // Display filename
        const fileElement =
            document.getElementById("latestFile");

        if (fileElement) {
            fileElement.textContent = fileName;
        }

        // Configure download button
        const downloadButton =
            document.getElementById("downloadButton");

        if (downloadButton) {
            downloadButton.href = downloadUrl;
            downloadButton.setAttribute("download", fileName);
        }

        // Display release
        const releaseElement =
            document.getElementById("releaseDate");

        if (releaseElement) {
            releaseElement.textContent =
                "Version " + version;
        }

        console.log("Latest version:", version);
        console.log("File:", fileName);
        console.log("URL:", downloadUrl);

    } catch (error) {

        console.error(error);

        const versionElement =
            document.getElementById("latestVersion");

        if (versionElement) {
            versionElement.textContent = "Unavailable";
        }

        const fileElement =
            document.getElementById("latestFile");

        if (fileElement) {
            fileElement.textContent = "Unavailable";
        }

        const downloadButton =
            document.getElementById("downloadButton");

        if (downloadButton) {
            downloadButton.removeAttribute("href");
            downloadButton.textContent =
                "Download unavailable";
        }
    }
}

loadLatestVersion();