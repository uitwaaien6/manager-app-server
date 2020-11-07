const nodemailer = require('nodemailer');

async function sendVerificationEmail(email, text) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ruzgarata6@gmail.com',
            pass: process.env.GMAIL_PASSWORD
        }
    });
      
    const mailOptions = {
        from: 'no-reply@konsolgetir.com',
        to: email,
        subject: 'Thank you for using our app, please verify your email address by cliking the link below',
        text
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    }); 
}

module.exports = { sendVerificationEmail };