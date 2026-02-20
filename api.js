require('dotenv').config();

const mongoose = require('mongoose'); 
const express = require('express');
const { User, Task } = require('./model');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Could not connect to MongoDB...', err));

// 1. API lấy tất cả task, sắp xếp theo thời gian tạo mới nhất và hiển thị tên người được giao và người giao
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({}) 
            .sort({ createdAt: -1 }) 
            .populate('assignees', 'name')
            .populate('assignedBy', 'name');
            
        res.json(tasks); 
    }
    catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// 2. API tạo task mới cho user
app.post('/api/tasks', async (req, res) => { 
    try {
        const { title, assignees, assignedBy } = req.body;
        
        const creator = await User.findById(assignedBy);
        if(!creator) {
            return res.status(400).send({ err: 'User assignedBy not found' });
        }

        let assigneesArr = [];

        if (creator.role === 'admin') {
            if (!assignees || assignees.length === 0) {
                return res.status(400).send({ err: 'Admin must assign the task to at least one user' });
            }

            const validAssignees = await User.find({ _id: { $in: assignees } }); // kiểm tra xem các user được giao có tồn tại không
            if (validAssignees.length !== assignees.length) {
                return res.status(400).send({ err: 'One or more assignees not found' });
            }

            const uniqueAssignees = [...new Set(validAssignees.map(user => user._id.toString()))]; // tránh trùng lặp
            if (uniqueAssignees.length !== assignees.length) {
                return res.status(400).send({ err: 'One or more assignees are duplicated' });
            }

            assigneesArr = assignees;
        } else {
            if (assignees && assignees.length > 0) {
                if (assignees.length > 1 || assignees[0] !== assignedBy) {
                    return res.status(400).send({ err: 'Normal user can only assign the task to themselves' });
                } else {
                    assigneesArr = [assignedBy];
                }
            } 
        }
    }
    catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// 3. API lấy tất cả task của một user, sắp xếp theo thời gian tạo mới nhất và hiển thị tên người được giao và người giao
app.get('/api/tasks/user/:userId', async (req, res) => {
    try {
        const tasks = await Task.find({ assignees: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('assignees', 'name')
            .populate('assignedBy', 'name');
            
        res.json(tasks);
    } catch (err) {
        res.status(500).send({ err: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});