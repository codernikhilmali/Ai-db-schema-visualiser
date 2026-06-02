import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyCOU6w4VoOGNVXdcqyiqLBfYAGnHhqUF38';
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      console.log(data.models.map(m => m.name));
    } else {
      console.log(data);
    }
  } catch(e) {
    console.error(e);
  }
}

listModels();
