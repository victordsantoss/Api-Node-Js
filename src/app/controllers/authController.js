const express = require('express');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto');
const mailer = require('../../modules/mailer')
const authConfig = require('../../config/auth');
const router = express.Router();

const User = require('../models/User');
const { getMaxListeners } = require('../../modules/mailer');

// Função responsável por gerar um token a cada autenticação de usuário baseado em um hash md5 que será a chave da aplicação
function generateToken(params = {}) {
    return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400,
    });
}

// Rota de Registro de Usuário
router.post('/register', async (req, res) => {
    const { email } = req.body;
    try {
        if (await User.findOne({ email }))
            return res.status(400).send({ error: 'User already exists' });

        const user = await User.create(req.body);

        user.password = undefined;

        return res.send({
            user,
            token: generateToken({ id: user.id }),
        });
    } catch (err) {
        return res.status(400).send({ error: 'Registration failed' })
    }
});

// Rota para autenticação de Usuário
router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user)
        return res.status(400).send({ error: 'User not found' });

    // Compara senhas criptografadas
    if (!await bcrypt.compare(password, user.password))
        return res.status(400).send({ error: 'Invalid password' });

    user.password = undefined;

    res.send({
        user,
        token: generateToken({ id: user.id }),
    });
});

// Rota para Listar todos Usuários
router.get('/list_user', async (req, res) => {
    try {
        const user = await User.find();
        return res.send({ user });
    } catch (err) {
        return res.status(400).send({ error: 'Error loading Users' });
    }
});

// Rota para Buscar Usuário por Id
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        return res.send({ user });
    } catch (err) {
        return res.status(400).send({ error: 'Error loading User' });
    }
});

// Rota 'Esqueci minha senha' que serve para soliciatção de Token para a mudança 
router.post('/forgot_password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user)
            return res.status(400).send({ error: 'User not found' });

        const token = crypto.randomBytes(20).toString('hex');

        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now,
            }
        }, { new: true, useFindAndModify: false });

        /*
        mailer.sendMail({
            to: email,
            from: 'victor.samuelsantoss@gmail.com',
            template: 'auth/forgot_passwrod',
            context: { token },
        }, (err) => {
            if (err)
                return res.status(400).send({ error: 'Cannot send forgot password email'});
        });
        */

        console.log(token, now);
        return res.send ({token: token})

    } catch (err) {
        console.log(err);
        res.status(400).send({ error: 'Error on forgot password, try again' })
    }

});

// Rota Para mudança de Senha
router.post('/reset_password', async (req, res) => {
    const { email, token, password } = req.body;

    try {

        const user = await User.findOne({ email })
            .select('+passwordResetToken passwordResetExpires');

        if (!user)
            return res.status(400).send({ error: 'User not found' });

        if (token !== user.passwordResetToken)
            return res.status(400).send({ error: 'Token Invalid' });

        const now = new Date();

        if (now > user.passwordResetExpires)
            return res.status(400).send({ error: 'Token expired, generate a new one' });

        user.password = password;

        await user.save();

        res.send();

    } catch (err) {
        res.status(400).send({ error: 'Cannot reset password, try again' });
    }

});

// Rota para Deletar Usuário 
router.delete('/:userId', async (req, res) => {
    try {
        await User.findByIdAndRemove(req.params.userId);
        return res.send();
    } catch (err) {
        return res.status(400).send({ error: 'Error deleting User' });
    }
});

module.exports = app => app.use('/auth', router)
