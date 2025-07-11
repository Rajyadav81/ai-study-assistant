import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const ALGOLIA_INDEX_NAME = "study_notes";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Upload records to Algolia
app.post("/upload", async (req, res) => {
  const { records } = req.body;
  try {
    const response = await axios.post(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch`,
      {
        requests: records.map(record => ({
          action: 'addObject',
          body: record
        }))
      },
      {
        headers: {
          'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY,
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Search + OpenAI answer
app.post("/search", async (req, res) => {
  const { query } = req.body;

  try {
    const algoliaRes = await axios.post(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`,
      { query, hitsPerPage: 3 },
      {
        headers: {
          'X-Algolia-API-Key': ALGOLIA_ADMIN_KEY,
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'Content-Type': 'application/json'
        }
      }
    );

    const context = algoliaRes.data.hits.map(hit => hit.text).join("\n\n");

    const openaiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful AI study assistant." },
          { role: "user", content: context }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const answer = openaiRes.data.choices[0].message.content.trim();
    res.json({ answer });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
