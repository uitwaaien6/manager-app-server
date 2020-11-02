const mongoose = require('mongoose');

const employeeSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        default: "",
        required: true
    },
    phone: {
        type: Number,
        unique: true,
        required: true
    },
    shift: {
        type: String,
        required: true
    }
});

mongoose.model('Employee', employeeSchema);