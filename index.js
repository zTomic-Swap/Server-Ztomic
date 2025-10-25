const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const INTENTS_FILE = path.join(DATA_DIR, "intents.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PORT = process.env.PORT || 3001;

async function readJSON(file) {
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

async function writeJSON(file, data) {
  const tmp = file + ".tmp";
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

const app = express();
app.use(cors());
app.use(express.json());

// Intents
app.get("/intents", async (req, res) => {
  const intents = await readJSON(INTENTS_FILE);
  res.json(intents);
});

app.post("/intents", async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.initiator || !body.fromToken || !body.toToken || typeof body.amount !== "number") {
      return res.status(400).json({ error: "Invalid intent payload" });
    }
    const newIntent = {
      ...body,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: body.status ?? "pending",
      interestedParties: body.interestedParties ?? [],
    };
    const intents = await readJSON(INTENTS_FILE);
    const updated = [newIntent, ...intents];
    await writeJSON(INTENTS_FILE, updated);
    res.status(201).json(newIntent);
  } catch (err) {
    console.error("POST /intents error", err);
    res.status(500).json({ error: "Failed to save intent" });
  }
});

// Users
app.get("/users", async (req, res) => {
  const users = await readJSON(USERS_FILE);
  res.json(users);
});

app.get("/users/:id", async (req, res) => {
  const users = await readJSON(USERS_FILE);
  const user = users.find((u) => u.id === req.params.id || u.userName === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.post("/users", async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.userName) return res.status(400).json({ error: "Invalid user payload" });
    const users = await readJSON(USERS_FILE);
    const existing = users.find((u) => u.userName === body.userName);
    if (existing) return res.status(409).json({ error: "User already exists" });

    const newUser = {
      ...body,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newUser, ...users];
    await writeJSON(USERS_FILE, updated);
    res.status(201).json(newUser);
  } catch (err) {
    console.error("POST /users error", err);
    res.status(500).json({ error: "Failed to save user" });
  }
});

app.listen(PORT, () => {
  console.log(`JSON API server listening on port ${PORT}`);
});
