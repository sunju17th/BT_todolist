const moongose =  require('moongose');

const userSchema = new moongose.Schema({
    name: String,
    password: String,
    role: { type: String, enum: ['admin', 'user'] }
});
    
const taskSchema = new moongose.Schema({
    title: String,
    status: {type:Boolean, enum: [true, false], default: false},
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }], // có thể có nhiều người được giao nhiệm vụ, nên dùng mảng
    assignedBy: { type: moongose.Schema.Types.ObjectId, ref: 'User' },
    createAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = { User, Task };