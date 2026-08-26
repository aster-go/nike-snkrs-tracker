# Security Policy

## 🛡️ Supported Versions

We maintain the latest `main` branch.

---

## 🚨 Vulnerability Reporting

If you discover any security issue, token leakage, or vulnerability:

1. **Do NOT open a public issue.**
2. Report privately via GitHub Security Advisories or contact the repository maintainers.
3. We acknowledge and patch issues within **48 hours**.

---

## 🔒 Security Best Practices

- **Never Commit Secrets:** Ensure `.env` is listed in `.gitignore` and webhook tokens are kept confidential.
- **Rate Limit Compliance:** Keep polling intervals above 10 seconds to avoid unnecessary strain on upstream APIs.
