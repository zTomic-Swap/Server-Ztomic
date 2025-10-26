const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");
const { mulPointEscalar, Base8 } = require("@zk-kit/baby-jubjub");

const DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(__dirname, "data")
);
const INTENTS_FILE = path.join(DATA_DIR, "intents.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PORT = process.env.PORT || 3001;

// --- FIXED ---
// Deleted convertToHex function
// --- END FIX ---

// Helper function to derive public key from secret
function generateKeysFromSecret(secretValue) {
  // --- FIXED ---
  // Use the secret string directly with BigInt
  console.log("secret key string", secretValue);
  const privateKey = BigInt(secretValue);
  // --- END FIX ---

  const publicKey = mulPointEscalar(Base8, privateKey);
  return {
    // --- BEST PRACTICE ---
    // Pad the hex strings to 64 characters (32 bytes)
    pubKeyX: `0x${publicKey[0].toString(16).padStart(64, "0")}`,
    pubKeyY: `0x${publicKey[1].toString(16).padStart(64, "0")}`,
    // --- END BEST PRACTICE ---
  };
}

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

app.get("/intents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const intents = await readJSON(INTENTS_FILE);
    const intent = intents.find((i) => String(i.id) === String(id));

    if (!intent) {
      return res.status(404).json({ error: "Intent not found" });
    }

    res.json(intent);
  } catch (err) {
    console.error("GET /intents/:id error", err);
    res.status(500).json({ error: "Failed to fetch intent" });
  }
});

app.post("/intents", async (req, res) => {
  try {
    const body = req.body;
    if (
      !body ||
      !body.initiator ||
      !body.fromToken ||
      !body.toToken ||
      !body["on-chain"] ||
      typeof body.amount !== "string"
    ) {
      return res.status(400).json({ error: "Invalid intent payload" });
    }

    // Generate a simple numeric ID based on current timestamp
    const timestamp = Date.now();
    const orderId = (timestamp % 10000) + 1;

    const newIntent = {
      ...body,
      id: orderId, // Numeric ID
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

app.put("/intents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const intents = await readJSON(INTENTS_FILE);
    const intentIndex = intents.findIndex((i) => String(i.id) === String(id));

    if (intentIndex === -1) {
      return res.status(4404).json({ error: "Intent not found" });
    }

    const updatedIntent = {
      ...intents[intentIndex],
      ...updates,
      id, // Ensure ID cannot be changed
    };

    intents[intentIndex] = updatedIntent;
    await writeJSON(INTENTS_FILE, intents);
    res.json(updatedIntent);
  } catch (err) {
    console.error("PUT /intents/:id error", err);
    res.status(500).json({ error: "Failed to update intent" });
  }
});

app.delete("/intents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const intents = await readJSON(INTENTS_FILE);
    const newIntents = intents.filter((i) => String(i.id) !== String(id));

    if (intents.length === newIntents.length) {
      return res.status(404).json({ error: "Intent not found" });
    }

    await writeJSON(INTENTS_FILE, newIntents);
    res.json({ message: "Intent deleted" });
  } catch (err) {
    console.error("DELETE /intents/:id error", err);
    res.status(500).json({ error: "Failed to delete intent" });
  }
});

// Users
app.get("/users", async (req, res) => {
  const users = await readJSON(USERS_FILE);
  res.json(users);
});

app.get("/users/:userName", async (req, res) => {
  const users = await readJSON(USERS_FILE);
  const user = users.find((u) => u.userName === req.params.userName);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.post("/users", async (req, res) => {
  try {
    const { userName, secretValue } = req.body;
    if (!userName || !secretValue) {
      return res
        .status(400)
        .json({ error: "userName and secretValue are required" });
    }

    const users = await readJSON(USERS_FILE);
    const existing = users.find((u) => u.userName === userName);
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Generate public keys from secret
    const { pubKeyX, pubKeyY } = generateKeysFromSecret(secretValue);

    const newUser = {
      userName,
      pubKeyX,
      pubKeyY,
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

app.put("/users/:userName", async (req, res) => {
  try {
    const { userName } = req.params;
    const { secretValue, ...updates } = req.body;

    const users = await readJSON(USERS_FILE);
    const userIndex = users.findIndex((u) => u.userName === userName);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    let generatedKeys = {};
    if (secretValue) {
      generatedKeys = generateKeysFromSecret(secretValue);
    }

    // Remove pubKey fields from updates to prevent manual override
    delete updates.pubKeyX;
    delete updates.pubKeyY;

    const updatedUser = {
      ...users[userIndex],
      ...updates,
      ...generatedKeys,
      userName, // Ensure userName stays the same
    };

    users[userIndex] = updatedUser;
    await writeJSON(USERS_FILE, users);
    res.json(updatedUser);
  } catch (err) {
    console.error("PUT /users/:userName error", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/users/:userName", async (req, res) => {
  try {
    const { userName } = req.params;
    const users = await readJSON(USERS_FILE);
    const newUsers = users.filter((u) => u.userName !== userName);

    if (users.length === newUsers.length) {
      return res.status(404).json({ error: "User not found" });
    }

    await writeJSON(USERS_FILE, newUsers);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE /users/:userName error", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.listen(PORT, () => {
  console.log(`JSON API server listening on port ${PORT}`);
});