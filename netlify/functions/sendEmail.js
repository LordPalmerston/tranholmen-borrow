exports.handler = async function (event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { toEmail, toName, subject, htmlContent } = JSON.parse(event.body);

    // Ensure the API key is set in Netlify Environment Variables
    if (!process.env.BREVO_API_KEY) {
      console.error("Missing BREVO_API_KEY environment variable");
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
    }

    // Call the Brevo (Sendinblue) API
    // Note: fetch is natively available in Node 18+ (which Netlify uses by default)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: "Tranholmen Tool Library", email: "noreply@tranholmen-borrow.com" }, // Brevo allows you to use a generic sender if configured, or you may need to verify this email in Brevo.
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Brevo API error:", errorData);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email via Brevo' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Function error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
