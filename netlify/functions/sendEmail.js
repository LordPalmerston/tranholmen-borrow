

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { toEmail, toName, subject, htmlContent } = JSON.parse(event.body);

    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!googleScriptUrl) {
      console.error("Missing GOOGLE_SCRIPT_URL in environment variables.");
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toEmail: toEmail,
        toName: toName,
        subject: subject,
        htmlContent: htmlContent
      })
    });

    // Google Apps Script always returns 200 OK for successful executions if configured correctly
    const responseData = await response.json().catch(() => ({ status: 'success' }));
    
    return { statusCode: 200, body: JSON.stringify(responseData) };
  } catch (error) {
    console.error("Function Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
