const moongose =  require('moongose');

const userSchema = new moongose.Schema({
    name: String,
    password: String,
    role: { type: String, enum: ['admin', 'user'] }
});
    
const taskSchema = new moongose.Schema({
    title: String,
    status: {type:String, enum: ['pending', 'completed'], default: 'pending'},
    assignedTo: { type: moongose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = { User, Task };