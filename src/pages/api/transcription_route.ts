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
// Fix the formidable import
import { formidable } from 'formidable';
import FormData from 'form-data';

// Tell Next.js not to parse the body as JSON
export const config = {
  api: {
    bodyParser: false,
  },
};

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

    // Parse form data using formidable
    const form = formidable({ 
      maxFileSize: 10 * 1024 * 1024, // 10MB max file size
      keepExtensions: true
    });
    
    const parseForm = async (): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });
    };

    const { fields, files } = await parseForm();
    
    // Get the uploaded file
    const fileField = files.file;
    if (!fileField) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // Get the first file if it's an array
    const file = Array.isArray(fileField) ? fileField[0] : fileField;
    
    // Get language from fields
    const languageField = fields.language;
    const language = Array.isArray(languageField) ? languageField[0] : (languageField || 'en');
    
    // Read the file content
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Create form data for OpenAI API
    const openAiFormData = new FormData();
    openAiFormData.append('file', fileBuffer, {
      filename: 'recording.webm',
      contentType: file.mimetype || 'audio/webm',
    });
    openAiFormData.append('model', 'whisper-1');
    
    if (language) {
      openAiFormData.append('language', language);
    }
    
    console.log(`Sending file (${fileBuffer.length} bytes) to OpenAI for transcription with language: ${language}`);
    
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      openAiFormData,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          ...openAiFormData.getHeaders(),
        }
      }
    );
    
    // Clean up the temporary file
    fs.unlinkSync(file.filepath);
    
    return res.status(200).json({
      text: response.data.text
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Provide more detailed error information
    if (axios.isAxiosError(error) && error.response) {
      console.error('OpenAI API error:', {
        status: error.response.status,
        data: error.response.data
      });
      
      return res.status(error.response.status || 500).json({ 
        error: `OpenAI API error: ${error.response.status}`,
        details: error.response.data
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}