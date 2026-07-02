import express, { ErrorRequestHandler } from "express";
import { basketRouter } from "./routes/basket";
import { ordersRouter } from "./routes/orders";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/basket", basketRouter);
app.use("/orders", ordersRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`purchase-service listening on ${port}`);
});
