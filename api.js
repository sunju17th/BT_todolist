require('dotenv').config();

const moongose = require('mongoose');
const express = require('express');
const { User, Task } = require('./model');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

moongose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Could not connect to MongoDB...', err));

// api get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({}) 
            .sort ({ createAt: -1 })
            .populate('assignees', 'name')
            .populate('assignedBy', 'name');
        res.json(tasks);
        res.status(200).send('all task : ' + tasks);
    }
    catch (err) {
        res.status(500).send({ err: err.message });
    }
});

