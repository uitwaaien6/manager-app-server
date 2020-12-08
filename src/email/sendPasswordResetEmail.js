const nodemailer = require('nodemailer');

async function sendPasswordResetEmail(email, code) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'YOUR EMAIL ADDRESS',
            pass: process.env.GMAIL_PASSWORD
        }
    });
      
    const mailOptions = {
        from: 'no-reply@konsolgetir.com',
        to: email,
        subject: 'Your Password Reset Code for YOUR APP',
        text: `Please use the following code within the next 10 minutes to reset your password on Olay App: ${code}`
        //html: `<p>Please use the following code within the next 10 minutes to reset your password on Olay App: <strong>${code}</strong></p>`
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    }); 
}

module.exports = { sendPasswordResetEmail };