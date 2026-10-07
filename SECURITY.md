# Security

Please report a vulnerability privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**. If private reporting is not available to you, open an issue that says only that you have a security report, without the details, and we will get back to you.

What this server does with secrets: it reads your Apify API token from the `APIFY_TOKEN` environment variable and sends it only to `https://api.apify.com`, in the `Authorization` header. It writes nothing to disk and has no telemetry.
