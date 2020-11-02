const express = require('express');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Employee = mongoose.model('Employee');
const jwt = require('jsonwebtoken');
const validator = require('email-validator');
const nodemailer = require('nodemailer');
const { decryptPassword } = require('../encryption/coefficientFairEncryption');
const { authentication } = require('../middlewares/authentication');

const router = express.Router();

router.post('/employees', authentication, async (req, res) => {
    const { name, phone, shift } = req.body;
    const userId = req.user._id;
    const employee = new Employee({ userId, name, phone, shift });
    await employee.save();

    res.send({ success: 'true', msg: 'Employee has been saved' });
});

router.get('/employees', authentication, async (req, res) => {
    const userId = req.user._id;
    const employees = await Employee.find({ userId });
    res.send(employees);
});

module.exports = router;
