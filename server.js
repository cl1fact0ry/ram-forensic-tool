import express from 'express';
import cors from 'cors';  // Make sure to install this package
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import agentRoutes from "./routes/agentRoutes.js"

dotenv.config();

// MongoDB connection
connectDB();

const app = express();

// Enable CORS for all routes and origins (adjust in production)
app.use(
  cors({
    origin: "*", // bütün domenlərə icazə ver (yalnız dev/test üçün!)
  })
);


app.use(express.json());

// Routes
app.get("/", (req, res)=>{
    res.json({"message": "Server is running"});
});

// Agent routes
app.use('/api/agents', agentRoutes);

// Error middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
