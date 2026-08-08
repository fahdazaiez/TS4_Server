import { createHash } from "crypto";


// =========================================================
// CONFIGURATION
// =========================================================

const GITHUB_API =
    "https://api.github.com";

const GITHUB_API_VERSION =
    "2026-03-10";


// =========================================================
// ENVIRONMENT VARIABLES
// =========================================================

const GITHUB_TOKEN =
    process.env.GITHUB_TOKEN;

const GITHUB_OWNER =
    process.env.GITHUB_OWNER;

const GITHUB_REPO =
    process.env.GITHUB_REPO;

const GITHUB_FILE =
    process.env.GITHUB_FILE;

const DEVICE_SALT =
    process.env.DEVICE_SALT;


// =========================================================
// CORS
// =========================================================

function setCors(res) {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );
}


// =========================================================
// GITHUB HEADERS
// =========================================================

function githubHeaders() {

    return {

        "Accept":
            "application/vnd.github+json",

        "Authorization":
            `Bearer ${GITHUB_TOKEN}`,

        "X-GitHub-Api-Version":
            GITHUB_API_VERSION,

        "User-Agent":
            "TS4-License-Server"
    };
}


// =========================================================
// GITHUB FILE URL
// =========================================================

function getGithubFileURL() {

    return (
        `${GITHUB_API}/repos/` +
        `${encodeURIComponent(GITHUB_OWNER)}/` +
        `${encodeURIComponent(GITHUB_REPO)}/` +
        `contents/` +
        `${GITHUB_FILE}`
    );
}


// =========================================================
// SHA-256 DEVICE HASH
// =========================================================

function hashDevice(deviceId) {

    return createHash("sha256")
        .update(
            DEVICE_SALT +
            ":" +
            deviceId
        )
        .digest("hex");
}


// =========================================================
// GET KEYS.JSON FROM GITHUB
// =========================================================

async function getLicenseFile() {

    const response =
        await fetch(
            getGithubFileURL(),
            {
                method: "GET",
                headers: githubHeaders()
            }
        );

    const text =
        await response.text();


    if (!response.ok) {

        return {

            ok: false,

            status:
                response.status,

            response:
                text
        };
    }


    let data;

    try {

        data =
            JSON.parse(text);

    } catch {

        return {

            ok: false,

            status: 500,

            response:
                "Invalid GitHub JSON response."
        };
    }


    if (
        data.type !== "file" ||
        !data.content ||
        !data.sha
    ) {

        return {

            ok: false,

            status: 500,

            response:
                "GitHub file data is invalid."
        };
    }


    let jsonText;

    try {

        jsonText =
            Buffer.from(
                data.content.replace(/\s/g, ""),
                "base64"
            ).toString("utf8");

    } catch {

        return {

            ok: false,

            status: 500,

            response:
                "Could not decode keys.json."
        };
    }


    let licenseData;

    try {

        licenseData =
            JSON.parse(jsonText);

    } catch {

        return {

            ok: false,

            status: 500,

            response:
                "keys.json contains invalid JSON."
        };
    }


    if (
        !licenseData ||
        !Array.isArray(
            licenseData.keys
        )
    ) {

        return {

            ok: false,

            status: 500,

            response:
                "keys.json must contain a keys array."
        };
    }


    return {

        ok: true,

        sha:
            data.sha,

        data:
            licenseData
    };
}


// =========================================================
// UPDATE KEYS.JSON ON GITHUB
// =========================================================

async function updateLicenseFile(
    licenseData,
    currentSha
) {

    const jsonText =
        JSON.stringify(
            licenseData,
            null,
            2
        ) + "\n";


    const base64Content =
        Buffer.from(
            jsonText,
            "utf8"
        ).toString("base64");


    const body = {

        message:
            "Register license device",

        content:
            base64Content,

        sha:
            currentSha
    };


    const response =
        await fetch(
            getGithubFileURL(),
            {

                method: "PUT",

                headers: {
                    ...githubHeaders(),

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(body)
            }
        );


    const text =
        await response.text();


    if (!response.ok) {

        return {

            ok: false,

            status:
                response.status,

            response:
                text
        };
    }


    return {

        ok: true,

        status:
            response.status
    };
}


// =========================================================
// CHECK ENVIRONMENT
// =========================================================

function checkConfiguration() {

    if (
        !GITHUB_TOKEN ||
        !GITHUB_OWNER ||
        !GITHUB_REPO ||
        !GITHUB_FILE ||
        !DEVICE_SALT
    ) {

        return false;
    }

    return true;
}


// =========================================================
// GET REQUEST
//
// Diagnostic endpoint:
// /api/activate
// =========================================================

async function diagnostic() {

    if (
        !checkConfiguration()
    ) {

        return {

            ok: false,

            message:
                "Missing server configuration.",

            githubToken:
                !!GITHUB_TOKEN,

            githubOwner:
                !!GITHUB_OWNER,

            githubRepo:
                !!GITHUB_REPO,

            githubFile:
                !!GITHUB_FILE,

            deviceSalt:
                !!DEVICE_SALT
        };
    }


    const result =
        await getLicenseFile();


    if (!result.ok) {

        return {

            ok: false,

            githubToken: true,

            githubOwner:
                GITHUB_OWNER,

            githubRepo:
                GITHUB_REPO,

            githubFile:
                GITHUB_FILE,

            githubStatus:
                result.status,

            githubResponse:
                result.response,

            message:
                "Vercel reached GitHub, but GitHub returned an error."
        };
    }


    return {

        ok: true,

        githubToken: true,

        githubOwner:
            GITHUB_OWNER,

        githubRepo:
            GITHUB_REPO,

        githubFile:
            GITHUB_FILE,

        githubStatus:
            200,

        fileType:
            "file",

        fileName:
            GITHUB_FILE,

        message:
            "GitHub connection works."
    };
}


// =========================================================
// ACTIVATION
// =========================================================

async function activate(
    req,
    res
) {

    // =====================================================
    // CONFIGURATION
    // =====================================================

    if (
        !checkConfiguration()
    ) {

        return res.status(500).json({

            valid: false,

            message:
                "License server configuration error."
        });
    }


    // =====================================================
    // READ BODY
    // =====================================================

    let body =
        req.body;


    if (
        typeof body === "string"
    ) {

        try {

            body =
                JSON.parse(body);

        } catch {

            body = {};
        }
    }


    const key =
        String(
            body?.key || ""
        ).trim();


    const deviceId =
        String(
            body?.deviceId || ""
        ).trim();


    // =====================================================
    // CHECK KEY
    // =====================================================

    if (!key) {

        return res.status(400).json({

            valid: false,

            message:
                "Activation key is required."
        });
    }


    // =====================================================
    // CHECK DEVICE ID
    // =====================================================

    if (!deviceId) {

        return res.status(400).json({

            valid: false,

            message:
                "Device identification is required."
        });
    }


    // =====================================================
    // KEY FORMAT
    //
    // KS-001-48_RANDOM_CHARACTERS-YYYYMMDD
    // =====================================================

    const keyPattern =
        /^KS-\d{3}-[A-Za-z0-9]{48}-\d{8}$/;


    if (
        !keyPattern.test(key)
    ) {

        return res.status(200).json({

            valid: false,

            message:
                "Invalid activation key format."
        });
    }


    // =====================================================
    // GET CURRENT LICENSE FILE
    // =====================================================

    const file =
        await getLicenseFile();


    if (!file.ok) {

        console.error(
            "GitHub read error:",
            file.status,
            file.response
        );

        return res.status(500).json({

            valid: false,

            message:
                "Could not access the license database.",

            githubStatus:
                file.status
        });
    }


    const licenseData =
        file.data;


    // =====================================================
    // FIND KEY
    // =====================================================

    const licenseIndex =
        licenseData.keys.findIndex(
            item =>
                typeof item?.key === "string" &&
                item.key.trim() === key
        );


    if (
        licenseIndex === -1
    ) {

        return res.status(200).json({

            valid: false,

            message:
                "Invalid activation key."
        });
    }


    const license =
        licenseData.keys[
            licenseIndex
        ];


    // =====================================================
    // ACTIVE CHECK
    // =====================================================

    if (
        license.active !== true
    ) {

        return res.status(200).json({

            valid: false,

            message:
                "This activation key is disabled."
        });
    }


    // =====================================================
    // EXPIRATION CHECK
    // =====================================================

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
            )
        ) {

            if (
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
    }


    // =====================================================
    // DEVICE HASH
    // =====================================================

    const deviceHash =
        hashDevice(
            deviceId
        );


    // =====================================================
    // NORMALIZE DEVICES
    // =====================================================

    if (
        !Array.isArray(
            license.devices
        )
    ) {

        license.devices = [];
    }


    const maxDevices =
        Number(
            license.maxDevices || 1
        );


    // =====================================================
    // CHECK EXISTING DEVICE
    // =====================================================

    const existingDevice =
        license.devices.find(
            device =>
                device &&
                device.id ===
                deviceHash
        );


    // =====================================================
    // SAME DEVICE
    // =====================================================

    if (
        existingDevice
    ) {

        return res.status(200).json({

            valid: true,

            message:
                "Activation verified.",

            deviceBound:
                true
        });
    }


    // =====================================================
    // DEVICE LIMIT
    // =====================================================

    if (
        license.devices.length >=
        maxDevices
    ) {

        return res.status(200).json({

            valid: false,

            message:
                "This activation key is already bound to another device.",

            deviceLimit:
                true
        });
    }


    // =====================================================
    // REGISTER NEW DEVICE
    // =====================================================

    license.devices.push({

        id:
            deviceHash,

        activated:
            new Date().toISOString()
    });


    // =====================================================
    // SAVE UPDATED LICENSE FILE
    // =====================================================

    const updateResult =
        await updateLicenseFile(
            licenseData,
            file.sha
        );


    // =====================================================
    // GITHUB CONFLICT
    // =====================================================

    if (
        !updateResult.ok
    ) {

        console.error(
            "GitHub update error:",
            updateResult.status,
            updateResult.response
        );


        if (
            updateResult.status ===
            409
        ) {

            return res.status(409).json({

                valid: false,

                message:
                    "License database changed. Please try activation again."
            });
        }


        return res.status(500).json({

            valid: false,

            message:
                "Could not save device activation.",

            githubStatus:
                updateResult.status
        });
    }


    // =====================================================
    // SUCCESS
    // =====================================================

    return res.status(200).json({

        valid: true,

        message:
            "Key activated successfully.",

        deviceBound:
            true
    });
}


// =========================================================
// MAIN HANDLER
// =========================================================

export default async function handler(
    req,
    res
) {

    setCors(res);


    // =====================================================
    // OPTIONS
    // =====================================================

    if (
        req.method === "OPTIONS"
    ) {

        return res.status(200).json({

            ok: true
        });
    }


    // =====================================================
    // GET
    // =====================================================

    if (
        req.method === "GET"
    ) {

        try {

            const result =
                await diagnostic();

            return res.status(
                result.ok ? 200 : 500
            ).json(result);

        } catch (error) {

            console.error(
                "Diagnostic error:",
                error
            );

            return res.status(500).json({

                ok: false,

                message:
                    "Diagnostic request failed."
            });
        }
    }


    // =====================================================
    // POST
    // =====================================================

    if (
        req.method === "POST"
    ) {

        try {

            return await activate(
                req,
                res
            );

        } catch (error) {

            console.error(
                "Activation error:",
                error
            );

            return res.status(500).json({

                valid: false,

                message:
                    "An unexpected activation error occurred."
            });
        }
    }


    // =====================================================
    // OTHER METHODS
    // =====================================================

    return res.status(405).json({

        valid: false,

        message:
            "Method not allowed."
    });
}