import nodemailer from 'nodemailer';

const transporter=nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    }
});

const sendEmail=async(to,subject,text)=>{
    const mailOptions={
        from:'aissaes0203@gmail.com',
        to:to,
        subject:subject,
        text:text
    }
    await transporter.sendMail(mailOptions);
}
export default sendEmail;