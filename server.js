import express from "express";
import handler from "./api/verify.js";

const app = express();
app.use(express.json());

app.all("/api/verify", (req, res) => {
  handler(req, res);
});

app.listen(3000, () => console.log("Server on http://localhost:3000"));
