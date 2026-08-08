const UPDATE_URL = "/data/latest.json";

const GITHUB_REPO = "fahdazaiez/TS4_Server";
const GITHUB_BRANCH = "main";

async function loadLatestVersion() {

    try {

        // ====================================================
        // GET LATEST VERSION
        // ====================================================

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
            throw new Error("Version not found in latest.json");
        }


        // ====================================================
        // CREATE FILE NAME
        // ====================================================

        const fileName =
            `TS4_Updater_v${version}.exe`;


        // ====================================================
        // CREATE GITHUB DOWNLOAD URL
        // ====================================================

        const downloadUrl =
            `https://github.com/${GITHUB_REPO}/raw/refs/heads/${GITHUB_BRANCH}/downloads/${fileName}`;


        // ====================================================
        // DISPLAY VERSION
        // ====================================================

        const versionElement =
            document.getElementById("latestVersion");

        if (versionElement) {

            versionElement.textContent = version;

        }


        // ====================================================
        // DISPLAY FILE NAME
        // ====================================================

        const fileElement =
            document.getElementById("latestFile");

        if (fileElement) {

            fileElement.textContent = fileName;

        }


        // ====================================================
        // SET DOWNLOAD BUTTON
        // ====================================================

        const downloadButton =
            document.getElementById("downloadButton");

        if (downloadButton) {

            downloadButton.href = downloadUrl;

            downloadButton.setAttribute(
                "download",
                fileName
            );

        }


        // ====================================================
        // RELEASE VERSION
        // ====================================================

        const releaseElement =
            document.getElementById("releaseDate");

        if (releaseElement) {

            releaseElement.textContent =
                "Version " + version;

        }


        // ====================================================
        // DEBUG
        // ====================================================

        console.log(
            "Latest version:",
            version
        );

        console.log(
            "File:",
            fileName
        );

        console.log(
            "GitHub download:",
            downloadUrl
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

            downloadButton.removeAttribute("href");

            downloadButton.textContent =
                "Download unavailable";

        }

    }

}


// ========================================================
// START
// ========================================================

loadLatestVersion();