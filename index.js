import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import { jwtVerify, createRemoteJWKSet } from "jose";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

const JWKS = createRemoteJWKSet(new URL(process.env.PUBLIC_CLIENT_URL + "/api/auth/jwks"));

// Middlewares
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Unauthorized" });
    
    const token = authHeader.split(" ")[1];
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const checkRoleMiddleware = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
};

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    // Database access
    const db = client.db("book-verse");
    
    app.get("/", (req, res) => res.send("Server is running fine!"));

    // Example Route
    app.get("/api/example", authMiddleware, checkRoleMiddleware(["admin"]), (req, res) => {
      res.send("Success");
    });

    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

export default app;