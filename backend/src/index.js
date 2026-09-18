import express from "express";
import cors from "cors";
import "dotenv/config";

import { sleepRouter } from "./routes/sleep.js";
import { goalsRouter } from "./routes/goals.js";
import { checkinsRouter } from "./routes/checkins.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/sleep", sleepRouter);
app.use("/goals", goalsRouter);
app.use("/checkins", checkinsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`STrack backend listening on port ${port}`);
});
