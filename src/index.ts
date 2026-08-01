import express, { Application } from "express";
import swaggerUi from "swagger-ui-express";     
import YAML from "yamljs";                        
import healthRouter from "./routes/health";
import app from "./app";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
});