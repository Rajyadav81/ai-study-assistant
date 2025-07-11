const ALGOLIA_APP_ID = "7AFABIR9PY";
const ALGOLIA_INDEX_NAME = "study_notes";

// 📄 Extract text from PDF and upload chunks to Algolia
async function extractPDFText() {
  const file = document.getElementById('pdf-upload').files[0];
  const output = document.getElementById('output');

  if (!file) {
    alert("Please upload a PDF file first.");
    return;
  }

  const fileReader = new FileReader();

  fileReader.onload = async function () {
    const typedarray = new Uint8Array(this.result);
    const pdf = await pdfjsLib.getDocument(typedarray).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ');
      fullText += `\n\n--- Page ${i} ---\n\n` + text;
    }

    output.textContent = fullText;

    const chunks = splitTextIntoChunks(fullText, 1000);
    await uploadChunksToAlgolia(chunks);
  };

  fileReader.readAsArrayBuffer(file);
}

// 🧩 Chunk text into 1000 characters
function splitTextIntoChunks(text, maxLength) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.substring(i, i + maxLength));
  }
  return chunks;
}

// ☁️ Upload chunks to Algolia
async function uploadChunksToAlgolia(chunks) {
  const records = chunks.map((chunk, i) => ({
    objectID: `chunk_${i}_${Date.now()}`,
    text: chunk
  }));

  const response = await fetch(`/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records })
  });

  if (response.ok) {
    alert("✅ Chunks uploaded to Algolia successfully!");
  } else {
    alert("❌ Failed to upload chunks to Algolia.");
  }
}

// 🔍 Search question and get real AI answer from OpenAI
async function searchQuestion() {
  const question = document.getElementById('question').value.trim();
  const answerBox = document.getElementById('answerBox');

  if (!question) {
    alert("Please enter a question.");
    return;
  }

  const searchRes = await fetch(`/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: question })
  });

  const data = await searchRes.json();
  if (!data || !data.answer) {
    answerBox.textContent = "😢 No answer found.";
    return;
  }

  answerBox.textContent = data.answer;
}

async function searchQuestion() {
  const question = document.getElementById('question').value.trim();
  const answerBox = document.getElementById('answerBox');
  const loadingBox = document.getElementById('loadingBox');

  if (!question) {
    alert("Please enter a question.");
    return;
  }

  answerBox.innerHTML = '';
  loadingBox.style.display = 'block';

  const searchRes = await fetch(`/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: question })
  });

  loadingBox.style.display = 'none';
  const data = await searchRes.json();

  if (!data || !data.answer) {
    answerBox.textContent = "😢 No answer found.";
    return;
  }

  typeAnswer(data.answer, answerBox);
}

// ✨ Typing animation function
function typeAnswer(text, element) {
  element.innerHTML = '';
  element.classList.add('typing');
  let i = 0;
  const speed = 25;

  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else {
      element.classList.remove('typing');
    }
  }
  type();
}
