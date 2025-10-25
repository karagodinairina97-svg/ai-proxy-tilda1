const cors = require('cors');

// Разрешенные домены Тильды - ЗАМЕНИТЕ на ваши реальные домены!
const allowedOrigins = [
  'https://your-site.tilda.ws',
  'https://your-domain.tilda.ws', 
  'https://your-site.tilda.ru',
  'https://your-domain.tilda.ru',
  'https://your-custom-domain.com'
];

const corsHandler = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
});

module.exports = async (req, res) => {
  await new Promise((resolve, reject) => {
    corsHandler(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve(result);
    });
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userQuery, systemPrompt, featureType } = req.body;

  console.log('AI Proxy Request:', { 
    featureType,
    queryLength: userQuery?.length 
  });

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || `API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    
    res.json({ 
      success: true, 
      text: data.choices[0].message.content 
    });

  } catch (error) {
    console.error('Proxy server error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
