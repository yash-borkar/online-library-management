export function jsonError(res, message, status) {
    return res.status(status).json({ error: message });
}
//# sourceMappingURL=api-errors.js.map