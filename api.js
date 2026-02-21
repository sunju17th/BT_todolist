require('dotenv').config();

const mongoose = require('mongoose'); 
const express = require('express');
const { User, Task } = require('./model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Could not connect to MongoDB...', err));

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).send({ err: 'Access token is missing' });

    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decode;
        next();
    }
    catch (err) {
        res.status(403).send({ err: 'Invalid access token' });
    }
};

// API dăng ký user mới 
app.post('/api/register', async (req, res) => {
    try {
        const { username, fullname, password, role } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send({ err: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            fullname,
            password: hashedPassword,
            role: role || 'normal'
        })
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    }
    catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API đăng nhập và trả về token
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send({ err: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send({ err: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful', 
            token : token
         });
    }
    catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API lấy tất cả task, sắp xếp theo thời gian tạo mới nhất và hiển thị tên người được giao và người giao
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({}) 
            .sort({ createdAt: -1 }) 
            .populate('assignees', 'username')
            .populate('assignedBy', 'username');
            
        res.json(tasks); 
    }
    catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API tạo task mới cho user
app.post('/api/tasks', authenticateToken, async (req, res) => { 
    try {
        const { title, assignees } = req.body;

        const creatorId = req.user.id;
        const creatorRole = req.user.role;


        let assigneesArr = [];

        if (creatorRole === 'admin') {
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
                if (assignees.length > 1 || assignees[0] !== creatorId) {
                    return res.status(400).send({ err: 'Normal user can only assign the task to themselves' });
                } else {
                    assigneesArr = [creatorId];
                }
            } 
        }
        const progressArr = assigneesArr.map(id => {
            return { userId: id, isDone: false };
        });
            
        const newTask = new Task({
            title,
            assignees: assigneesArr,
            assignedBy : creatorId,
            progress: progressArr
        });

        await newTask.save();
        res.status(201).json({newTask});
    }
    catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API lấy tất cả task của một user, sắp xếp theo thời gian tạo mới nhất và hiển thị tên người được giao và người giao
app.get('/api/tasks/user/:userId', async (req, res) => {
    try {
        const tasks = await Task.find({ assignees: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('assignees', 'username')
            .populate('assignedBy', 'username');
            
        res.json(tasks);
    } catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API lấy task trong ngày hiện tại của một user
app.get('/api/tasks/user/:userId/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await Task.find({
            assignees: req.params.userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        })
        .sort({ createdAt: -1 })
        .populate('assignees', 'username')
        .populate('assignedBy', 'username');

        res.json(tasks);
    } catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API lấy task chưa hoàn thành của một user
app.get('/api/tasks/user/:userId/incomplete', async (req, res) => {
    try {
        const tasks = await Task.find({
            assignees: req.params.userId,
            status: false
        })
        .sort({ createdAt: -1 })
        .populate('assignees', 'username')
        .populate('assignedBy', 'username');
        
        res.json(tasks);
    } catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API cập nhật trạng thái hoàn thành của task
app.put('/api/tasks/:taskId/status', authenticateToken, async (req, res) => {
    try {
        const taskId  = req.params.taskId;
        const userId = req.user.id;
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).send({ err: 'Task not found' });
        }

        const userProgress = task.progress.find(p => p.userId.toString() === userId);

        if (!userProgress) {
            return res.status(403).send({ err: 'You are not assigned to this task' });
        }

        userProgress.isDone = true;

        const allDone = task.progress.every(p => p.isDone === true);

        if (allDone) {
            task.status = true;
        }

        await task.save();
        res.json({ message: 'Task status updated successfully', task });
    } catch (err) {
        res.status(500).send({ err: err.message });
    }
});

//API xóa task, admin có thể xóa tất cả task, user thường chỉ có thể xóa task do mình tạo ra
app.delete('/api/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const userId = req.user.id;
        const userRole = req.user.role;
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).send({ err: 'Task not found' });
        }

        if (userRole === 'admin' || task.assignedBy.toString() === userId) {
            await Task.findByIdAndDelete(taskId);
            res.json({ message: 'Task deleted successfully' });
        } else {
            res.status(403).send({ err: 'You do not have permission to delete this task' });
        }
    } catch (err) {
        res.status(500).send({ err: err.message });
    }
});

// API xuất các task với user họ Nguyễn
app.get('/api/tasks/nguyen', async (req, res) => {
    try {
        const tasks = await Task.find({})
            .populate({
                path: 'assignees',
                match: { username: { $regex: '^Nguyễn' } }
            })
            .populate('assignedBy', 'username');

        res.json(tasks);
    } catch (err) {
        res.status(500).send({ err: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});