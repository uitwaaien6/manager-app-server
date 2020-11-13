const nodemailer = require('nodemailer');

async function sendWarningEmail(email) {
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
        subject: 'Your Account Password has been changed!',
        text: `You Account "${email}" Password has been changed. If you didn't do that action please take action immediatelly`
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

module.exports = { sendWarningEmail };