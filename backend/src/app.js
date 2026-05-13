const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const motoristasRoutes = require('./routes/motoristas');
const clientesRoutes = require('./routes/clientes');
const cargasRoutes = require('./routes/cargas');
const dashboardRoutes = require('./routes/dashboard');

const app = express(); // S.O.L API

const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origem não permitida'));
    }
  },
  credentials: true,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/motoristas', motoristasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/cargas', cargasRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

module.exports = app;
