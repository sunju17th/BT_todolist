const mongoose =  require('mongoose');

const userSchema = new mongoose.Schema({
    username: {type : String, required: true, unique: true},
    fullname: String,
    password: String,
    role: { type: String, enum: ['admin', 'normal'], default : 'normal' }
});
    
const taskSchema = new mongoose.Schema({
    title: String,
    status: {type:Boolean, enum: [true, false], default: false},
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // có thể có nhiều người được giao nhiệm vụ, nên dùng mảng
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    progress : [{
        userId : {type : mongoose.Schema.Types.ObjectId, ref: 'User'},
        isDone : {type : Boolean, default : false}
    }],
    createAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = { User, Task };