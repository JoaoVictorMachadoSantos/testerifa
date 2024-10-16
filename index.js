const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para obter os números disponíveis
app.get('/numeros', async (req, res) => {
    try {
        const result = await pool.query('SELECT numero, reservado FROM numeros');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro no servidor');
    }
});

// Rota para reservar números
app.post('/reservar', async (req, res) => {
    const { nome, whatsapp, numerosReservados } = req.body;
    try {
        const client = await pool.connect();

        // Verifica se os números estão disponíveis
        const result = await client.query(
            'SELECT * FROM numeros WHERE numero = ANY($1::int[]) AND reservado = FALSE',
            [numerosReservados]
        );

        if (result.rows.length !== numerosReservados.length) {
            return res.status(400).json({ error: 'Alguns números já foram reservados.' });
        }

        // Associa os números ao usuário e marca como reservados
        const updateQuery = `
            UPDATE numeros
            SET reservado = TRUE, nome = $2, whatsapp = $3
            WHERE numero = ANY($1::int[])
        `;
        await client.query(updateQuery, [numerosReservados, nome, whatsapp]);

        client.release();
        res.json({ message: 'Números reservados com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro no servidor');
    }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});


