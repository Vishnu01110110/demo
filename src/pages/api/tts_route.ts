// At the top of each API route file (before any other imports)
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables directly from the file
const envFilePath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFilePath)) {
  console.log('Loading environment variables from:', envFilePath);
  const envConfig = dotenv.parse(fs.readFileSync(envFilePath));
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
  console.log('After dotenv load, OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
}

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Make sure we have an API key
    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) {
      console.error('Missing OpenAI API key');
      return res.status(500).json({ error: 'Server configuration error - missing API key' });
    }

    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing text parameter' });
    }
    
    console.log('Calling OpenAI TTS API with text:', text.substring(0, 50) + '...');
    
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: "tts-1",
        voice: "nova",
        input: text
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    // Set proper headers for audio content
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error in TTS API route:', error);
    
    // Provide more detailed error information
    if (axios.isAxiosError(error) && error.response) {
      console.error('OpenAI API error:', {
        status: error.response.status,
        data: error.response.data ? error.response.data.toString() : null
      });
      
      return res.status(error.response.status).json({ 
        error: `OpenAI API error: ${error.response.status}`,
        details: error.response.data ? error.response.data.toString() : 'No details available'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate speech',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}