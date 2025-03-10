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

    const { systemPrompt, userPrompt, conversationHistory } = req.body;
    
    const messages = [];
    
    // Add system prompt
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    } 
    // Add single user message if provided
    else if (userPrompt) {
      messages.push({ role: 'user', content: userPrompt });
    }
    
    if (messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }
    
    console.log('Calling OpenAI Chat API with messages:', 
      messages.length > 0 ? `${messages.length} messages` : 'No messages');
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
        messages,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return res.status(200).json({
      message: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Provide more detailed error information
    if (axios.isAxiosError(error) && error.response) {
      console.error('OpenAI API error:', {
        status: error.response.status,
        data: error.response.data
      });
      
      return res.status(error.response.status).json({ 
        error: `OpenAI API error: ${error.response.status}`,
        details: error.response.data
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to process chat request',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}