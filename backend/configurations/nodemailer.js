import nodemailer from "nodemailer";

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com", // Brevo's official SMTP server
      port: 587,
      secure: false, 
      auth: {
        user: process.env.BREVO_SMTP_LOGIN, // Your Brevo login email
        pass: process.env.BREVO_SMTP_KEY,   // The long password Brevo generated for you
      },
    });

    const mailOptions = {
      from: '"AISS Exam Portal" <aissaes0203@gmail.com>', // Must be the email you used to sign up for Brevo
      to: to,
      subject: subject,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);

  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

export default sendEmail;