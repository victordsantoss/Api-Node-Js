const express = require('express');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

const Project = require('../models/project');
const Task = require('../models/task');

router.use(authMiddleware);

// Rota para Criar Projetos
router.post('/', async (req, res) => {
    try {
        const { title, description, tasks } = req.body;

        const project = await Project.create({ title, description, user: req.userId });

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id });

            await projectTask.save();

            project.tasks.push(projectTask);
        }));

        await project.save();

        return res.send({ project });
    } catch (err) {
        console.log(err)
        return res.status(400).send({ error: 'Error creating new project' });
    }
});

// Rota para Listar Projetos
router.get('/', async (req, res) => {
    try {
        const project = await Project.find().populate(['user', 'tasks']);

        return res.send({ project });
    } catch (err) {
        return res.status(400).send({ error: 'Error loading projects' });
    }
});

// Rota pra Listar Projetos por Id
router.get('/:projectId', async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId).populate(['user', 'tasks']);

        return res.send({ project });
    } catch (err) {
        return res.status(400).send({ error: 'Error loading projects' });
    }
});

// Rota para atualizar Projetos
router.put('/:projectId', async (req, res) => {
    try {
        const { title, description, tasks } = req.body;

        const project = await Project.findByIdAndUpdate(req.params.projectId, {
            title,
            description
        }, { new: true });

        project.tasks = [];

        await Task.remove({ project: project._id });

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id });

            await projectTask.save();

            project.tasks.push(projectTask);
        }));


        await project.save();

        return res.send({ project });
    } catch (err) {
        console.log(err)
        return res.status(400).send({ error: 'Error updating new project' });
    }
});

// Rota para deletar projetos por Id
router.delete('/:projectId', async (req, res) => {
    try {
        await Project.findByIdAndRemove(req.params.projectId).populate('user');

        return res.send();
    } catch (err) {
        return res.status(400).send({ error: 'Error deleting projects' });
    }
});

module.exports = app => app.use('/projects', router);
