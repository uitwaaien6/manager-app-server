const mongoose = require('mongoose');

const employeeSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        unique: true
    },
    shift: {
        type: String
    }
});

mongoose.model('Employee', employeeSchema);