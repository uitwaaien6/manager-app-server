const express = require('express');
const mongoose = require('mongoose');
const Employee = mongoose.model('Employee');
const { authentication } = require('../middlewares/authentication');
const router = express.Router();

router.use(authentication);

// #route:  GET /employees
// #desc:   Get employees from database
// #access: Private
router.get('/employees', async (req, res) => {
    const userId = req.user._id;

    if (!userId) {
        return res.status(422).send({ error: 'userId-null' });
    } else {
        try {
            const employees = await Employee.find({ userId });
    
            if (!employees) {
                return res.status(422).send({ error: 'employees-null', msg: 'employees with this userId couldnt be found' });
            } else {
                res.json({ success: true, employees });
            }
    
        } catch (error) {
            console.log(error.message);
            return res.status(422).send({ error: 'cant-get-employees' });
        }
    }

});

// #route:  POST /employees
// #desc:   Create an employee
// #access: Private
router.post('/employees', async (req, res) => {
    const { name, phone, shift } = req.body;
    const userId = req.user._id;

    if (!name || !phone || !shift || !userId) {
        return res.status(422).send({ error: 'bad-credentials-employees', msg: 'Please provide required sections' });
    } else {
        try {
            const employee = new Employee({ userId, name, phone, shift });

            if (!employee) {
                return res.status(422).send({ error: 'cant-create-employee', msg: 'Couldnt create employee with these credentials' });
            } else {
                await employee.save();
                res.json({ success: true });
            }
        } catch (error) {
            console.log(error.message);
            return res.status(422).send({ error: 'error-in-create-employees' });
        }
    }

});

// #route:  POST /employees/edit
// #desc:   Edit an employee
// #access: Private
router.post('/employees/edit', async (req, res) => {
    const { name, phone, shift, employeeId } = req.body;

    if (!name || !phone || !shift || !employeeId) {
        return res.status(422).send({ error: 'bad-credentials-employees', msg: 'Please provide valid employee to edit' });
    } else {
        try {
            await Employee.updateOne({ _id: employeeId }, { $set: { name, phone, shift } });
            res.json({ success: true });
        } catch (error) {
            return res.status(422).send({ error: 'error-in-employees-edit' });
        }
    }

});


// #route:  POST /employees/delete
// #desc:   Delete an employee
// #access: Private
router.post('/employees/delete', async (req, res) => {
    const { employeeId } = req.body;

    if (!employeeId) {
        return res.status(422).send({ error: 'employeeId-null' });
    } else {
        try {
            Employee.deleteOne({ _id: employeeId }, (err) => {
                if (err) {
                    return res.status(422).send({ error: 'delete-employe', msg: 'Error while deleting the employee' });
                }
            });
            res.json({ success: true });
        } catch (error) {
            console.log(error.message);
            return res.status(422).send({ error: 'error-in-employee-delete' });
        }
    }

});

module.exports = router;
