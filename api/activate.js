export default async function handler(req, res) {

    // =====================================================
    // CORS
    // =====================================================

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).json({
            ok: true
        });
    }


    // =====================================================
    // ENVIRONMENT VARIABLES
    // =====================================================

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const file = process.env.GITHUB_FILE;


    // =====================================================
    // DIAGNOSTIC GET
    //
    // Opening /api/activate in browser will show whether
    // Vercel received the environment variables and whether
    // GitHub can be accessed.
    // =====================================================

    if (req.method === "GET") {

        if (!token || !owner || !repo || !file) {

            return res.status(500).json({
                ok: false,
                githubToken: !!token,
                githubOwner: !!owner,
                githubRepo: !!repo,
                githubFile: !!file,
                message: "One or more environment variables are missing."
            });
        }


        const githubURL =
            "https://api.github.com/repos/" +
            encodeURIComponent(owner) +
            "/" +
            encodeURIComponent(repo) +
            "/contents/" +
            file;


        try {

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


            const githubText =
                await githubResponse.text();


            if (!githubResponse.ok) {

                return res.status(500).json({
                    ok: false,

                    githubToken: true,
                    githubOwner: owner,
                    githubRepo: repo,
                    githubFile: file,

                    githubStatus:
                        githubResponse.status,

                    githubResponse:
                        githubText,

                    message:
                        "Vercel reached GitHub, but GitHub returned an error."
                });
            }


            let githubData;

            try {

                githubData =
                    JSON.parse(githubText);

            } catch {

                return res.status(500).json({
                    ok: false,
                    message:
                        "GitHub returned invalid JSON."
                });
            }


            return res.status(200).json({

                ok: true,

                githubToken: true,

                githubOwner: owner,

                githubRepo: repo,

                githubFile: file,

                githubStatus:
                    githubResponse.status,

                fileType:
                    githubData.type,

                fileName:
                    githubData.name,

                message:
                    "GitHub connection works."
            });

        } catch (error) {

            console.error(
                "Diagnostic GitHub error:",
                error
            );

            return res.status(500).json({
                ok: false,
                message:
                    "Could not connect to GitHub.",
                error:
                    String(error)
            });
        }
    }


    // =====================================================
    // ONLY POST FOR ACTIVATION
    // =====================================================

    if (req.method !== "POST") {

        return res.status(405).json({
            valid: false,
            message: "Method not allowed."
        });
    }


    try {

        // =================================================
        // CHECK ENVIRONMENT VARIABLES
        // =================================================

        if (!token || !owner || !repo || !file) {

            console.error(
                "Missing GitHub environment variables."
            );

            return res.status(500).json({
                valid: false,
                message:
                    "License server configuration error."
            });
        }


        // =================================================
        // GET REQUEST BODY
        // =================================================

        let body = req.body;

        if (typeof body === "string") {

            try {

                body =
                    JSON.parse(body);

            } catch {

                body = {};
            }
        }


        const enteredKey =
            String(
                body?.key || ""
            ).trim();


        // =================================================
        // EMPTY KEY
        // =================================================

        if (!enteredKey) {

            return res.status(400).json({
                valid: false,
                message:
                    "Please enter an activation key."
            });
        }


        // =================================================
        // KEY FORMAT
        //
        // KS-001-48RANDOMCHARACTERS-YYYYMMDD
        // =================================================

        const keyPattern =
            /^KS-\d{3}-[A-Za-z0-9]{48}-\d{8}$/;


        if (!keyPattern.test(enteredKey)) {

            return res.status(200).json({
                valid: false,
                message:
                    "Invalid activation key format."
            });
        }


        // =================================================
        // GITHUB URL
        // =================================================

        const githubURL =
            "https://api.github.com/repos/" +
            encodeURIComponent(owner) +
            "/" +
            encodeURIComponent(repo) +
            "/contents/" +
            file;


        // =================================================
        // REQUEST GITHUB
        // =================================================

        const githubResponse =
            await fetch(
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


        const githubText =
            await githubResponse.text();


        // =================================================
        // GITHUB ERROR
        // =================================================

        if (!githubResponse.ok) {

            console.error(
                "GitHub API error:",
                githubResponse.status,
                githubText
            );

            return res.status(500).json({

                valid: false,

                message:
                    "License server could not access the license database.",

                githubStatus:
                    githubResponse.status
            });
        }


        // =================================================
        // PARSE GITHUB RESPONSE
        // =================================================

        let githubData;

        try {

            githubData =
                JSON.parse(githubText);

        } catch {

            return res.status(500).json({
                valid: false,
                message:
                    "Invalid response from GitHub."
            });
        }


        // =================================================
        // CHECK FILE
        // =================================================

        if (
            githubData.type !== "file" ||
            !githubData.content
        ) {

            return res.status(500).json({
                valid: false,
                message:
                    "keys.json could not be read."
            });
        }


        // =================================================
        // DECODE BASE64
        // =================================================

        const jsonText =
            Buffer.from(
                githubData.content
                    .replace(/\s/g, ""),
                "base64"
            ).toString("utf8");


        // =================================================
        // PARSE KEYS JSON
        // =================================================

        let licenseData;

        try {

            licenseData =
                JSON.parse(jsonText);

        } catch {

            return res.status(500).json({
                valid: false,
                message:
                    "keys.json contains invalid JSON."
            });
        }


        // =================================================
        // CHECK KEYS ARRAY
        // =================================================

        if (
            !licenseData ||
            !Array.isArray(
                licenseData.keys
            )
        ) {

            return res.status(500).json({
                valid: false,
                message:
                    "keys.json has an invalid format."
            });
        }


        // =================================================
        // FIND LICENSE
        // =================================================

        const license =
            licenseData.keys.find(
                item =>
                    typeof item?.key === "string" &&
                    item.key.trim() === enteredKey
            );


        // =================================================
        // KEY NOT FOUND
        // =================================================

        if (!license) {

            return res.status(200).json({
                valid: false,
                message:
                    "Invalid activation key."
            });
        }


        // =================================================
        // DISABLED
        // =================================================

        if (license.active !== true) {

            return res.status(200).json({
                valid: false,
                message:
                    "This activation key is disabled."
            });
        }


        // =================================================
        // EXPIRATION
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
                Date.now() >
                expiration.getTime()
            ) {

                return res.status(200).json({
                    valid: false,
                    message:
                        "This activation key has expired."
                });
            }
        }


        // =================================================
        // SUCCESS
        // =================================================

        return res.status(200).json({

            valid: true,

            message:
                "Key activated successfully."
        });


    } catch (error) {

        console.error(
            "Activation error:",
            error
        );

        return res.status(500).json({

            valid: false,

            message:
                "An unexpected server error occurred."
        });
    }
}