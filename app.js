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
        const downloadUrl = data.downloadUrl;
        const releaseUrl = data.releaseUrl;

        if (!version) {
            throw new Error("Version missing");
        }

        if (!downloadUrl) {
            throw new Error("Download URL missing");
        }

        // ================================================
        // FILE NAME
        // ================================================

        const fileName =
            `TS4_Updater_v${version}.exe`;


        // ================================================
        // VERSION
        // ================================================

        const versionElement =
            document.getElementById("latestVersion");

        if (versionElement) {
            versionElement.textContent = version;
        }


        // ================================================
        // FILE NAME
        // ================================================

        const fileElement =
            document.getElementById("latestFile");

        if (fileElement) {
            fileElement.textContent = fileName;
        }


        // ================================================
        // RELEASE
        // ================================================

        const releaseElement =
            document.getElementById("releaseDate");

        if (releaseElement) {
            releaseElement.textContent =
                "Version " + version;
        }


        // ================================================
        // DOWNLOAD BUTTON
        // ================================================

        const downloadButton =
            document.getElementById("downloadButton");

        if (downloadButton) {

            downloadButton.href =
                downloadUrl;

            downloadButton.removeAttribute(
                "download"
            );

            downloadButton.textContent =
                "Download .EXE";

        }


        // ================================================
        // OPTIONAL RELEASE LINK
        // ================================================

        const releaseButton =
            document.getElementById("releaseButton");

        if (releaseButton && releaseUrl) {

            releaseButton.href =
                releaseUrl;

        }


        // ================================================
        // DEBUG
        // ================================================

        console.log(
            "Latest version:",
            version
        );

        console.log(
            "File:",
            fileName
        );

        console.log(
            "Download URL:",
            downloadUrl
        );

        console.log(
            "Release URL:",
            releaseUrl
        );

    } catch (error) {

        console.error(
            "Failed to load latest version:",
            error
        );


        const versionElement =
            document.getElementById("latestVersion");

        if (versionElement) {
            versionElement.textContent =
                "Unavailable";
        }


        const fileElement =
            document.getElementById("latestFile");

        if (fileElement) {
            fileElement.textContent =
                "Unavailable";
        }


        const downloadButton =
            document.getElementById("downloadButton");

        if (downloadButton) {

            downloadButton.removeAttribute(
                "href"
            );

            downloadButton.textContent =
                "Download unavailable";

        }

    }
}


// ========================================================
// START
// ========================================================

loadLatestVersion();