export default async function handler(req, res) {
    // =====================================================
    // CORS
    // =====================================================

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    // Browser preflight
    if (req.method === "OPTIONS") {
        return res.status(200).json({
            ok: true
        });
    }

    // =====================================================
    // ONLY POST
    // =====================================================

    if (req.method !== "POST") {
        return res.status(405).json({
            valid: false,
            message: "Method not allowed."
        });
    }

    try {

        // =================================================
        // ENVIRONMENT VARIABLES
        // =================================================

        const token = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const file = process.env.GITHUB_FILE;

        if (!token || !owner || !repo || !file) {

            console.error(
                "Missing GitHub environment variables."
            );

            return res.status(500).json({
                valid: false,
                message: "License server configuration error."
            });
        }

        // =================================================
        // GET KEY FROM REQUEST
        // =================================================

        let body = req.body;

        // Some requests may send the body as a string
        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch {
                body = {};
            }
        }

        const enteredKey = String(
            body?.key || ""
        ).trim();

        // =================================================
        // EMPTY KEY
        // =================================================

        if (!enteredKey) {

            return res.status(400).json({
                valid: false,
                message: "Please enter an activation key."
            });
        }

        // =================================================
        // BASIC KEY FORMAT CHECK
        //
        // KS-PERSON-48RANDOM-YYYYMMDD
        // =================================================

        const keyPattern =
            /^KS-\d{3}-[A-Za-z0-9]{48}-\d{8}$/;

        if (!keyPattern.test(enteredKey)) {

            return res.status(200).json({
                valid: false,
                message: "Invalid activation key."
            });
        }

        // =================================================
        // GITHUB CONTENTS API
        // =================================================

        const githubURL =
            `https://api.github.com/repos/` +
            `${encodeURIComponent(owner)}/` +
            `${encodeURIComponent(repo)}/` +
            `/contents/${file}`;

        const githubResponse = await fetch(
            githubURL,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/vnd.github+json",

                    "Authorization":
                        `Bearer ${token}`,

                    "X-GitHub-Api-Version":
                        "2026-03-10",

                    "User-Agent":
                        "TS4-License-Server"
                }
            }
        );

        // =================================================
        // GITHUB ERROR
        // =================================================

        if (!githubResponse.ok) {

            const errorText =
                await githubResponse.text();

            console.error(
                "GitHub API error:",
                githubResponse.status,
                errorText
            );

            return res.status(500).json({
                valid: false,
                message: "License server could not check the keys."
            });
        }

        const githubData =
            await githubResponse.json();

        // =================================================
        // FILE MUST EXIST
        // =================================================

        if (
            githubData.type !== "file" ||
            !githubData.content
        ) {

            console.error(
                "keys.json was not returned as a file."
            );

            return res.status(500).json({
                valid: false,
                message: "License database unavailable."
            });
        }

        // =================================================
        // DECODE BASE64 GITHUB CONTENT
        // =================================================

        const jsonText =
            Buffer.from(
                githubData.content.replace(/\s/g, ""),
                "base64"
            ).toString("utf8");

        let licenseData;

        try {

            licenseData =
                JSON.parse(jsonText);

        } catch (error) {

            console.error(
                "Invalid keys.json:",
                error
            );

            return res.status(500).json({
                valid: false,
                message: "License database is invalid."
            });
        }

        // =================================================
        // CHECK KEYS ARRAY
        // =================================================

        if (
            !licenseData ||
            !Array.isArray(licenseData.keys)
        ) {

            return res.status(500).json({
                valid: false,
                message: "License database format is invalid."
            });
        }

        // =================================================
        // FIND KEY
        // =================================================

        const license =
            licenseData.keys.find(
                item =>
                    typeof item?.key === "string" &&
                    item.key.trim() === enteredKey
            );

        // =================================================
        // KEY DOES NOT EXIST
        // =================================================

        if (!license) {

            return res.status(200).json({
                valid: false,
                message: "Invalid activation key."
            });
        }

        // =================================================
        // KEY DISABLED
        // =================================================

        if (license.active !== true) {

            return res.status(200).json({
                valid: false,
                message: "This activation key is disabled."
            });
        }

        // =================================================
        // CHECK EXPIRATION
        // =================================================

        if (
            license.expires &&
            license.expires !== null &&
            license.expires !== ""
        ) {

            const expiration =
                new Date(
                    `${license.expires}T23:59:59Z`
                );

            if (
                !Number.isNaN(
                    expiration.getTime()
                ) &&
                Date.now() > expiration.getTime()
            ) {

                return res.status(200).json({
                    valid: false,
                    message: "This activation key has expired."
                });
            }
        }

        // =================================================
        // SUCCESS
        // =================================================

        return res.status(200).json({
            valid: true,
            message: "Key activated successfully."
        });

    } catch (error) {

        console.error(
            "Activation error:",
            error
        );

        return res.status(500).json({
            valid: false,
            message: "An unexpected server error occurred."
        });
    }
}