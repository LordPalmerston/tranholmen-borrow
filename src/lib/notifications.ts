export const sendEmailNotification = async (
  toEmail: string, 
  toName: string, 
  subject: string, 
  htmlContent: string
) => {
  try {
    // Calls the Netlify Serverless Function
    const response = await fetch('/.netlify/functions/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toEmail,
        toName,
        subject,
        htmlContent
      }),
    });

    if (!response.ok) {
      console.warn("Failed to send email notification", await response.text());
    }
  } catch (error) {
    console.warn("Error triggering email function:", error);
  }
};
