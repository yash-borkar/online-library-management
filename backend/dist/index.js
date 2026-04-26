import express from "express";
import { apiRouter } from "./routes/api.js";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
app.use("/api", apiRouter);
const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => {
    console.log(`API listening on ${port}`);
});
//# sourceMappingURL=index.js.map