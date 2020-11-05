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

router.use(authentication);

router.get('/employees', async (req, res) => {
    const userId = req.user._id;
    const employees = await Employee.find({ userId });
    res.send(employees);
});

router.post('/employees', async (req, res) => {
    const { name, phone, shift } = req.body;
    const userId = req.user._id;
    const employee = new Employee({ userId, name, phone, shift });
    await employee.save();

    res.send({ success: 'true', msg: 'Employee has been saved' });
});

router.post('/employees/edit', async (req, res) => {
    const { name, phone, shift, employeeId } = req.body;
    await Employee.updateOne({ _id: employeeId }, { $set: { name, phone, shift } });
    res.send({ success: 'true', msg: 'Employee has been edited' });
});

router.post('/employees/delete', async (req, res) => {
    const { employeeId } = req.body;
    Employee.deleteOne({ _id: employeeId }, (err) => {
        if (err) {
            return res.status(422).send({ error: 'delete-employe', msg: 'Error while deleting the employee' });
        }
    });
    res.send({ success: true });
})

module.exports = router;
