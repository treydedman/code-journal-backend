/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import { ClientError, errorMiddleware } from './lib/index.js';

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();

// get all entries
app.get('/api/entries', async (req, res, next) => {
  try {
    const sql = `
    select *
    from "entries"
    `;

    const result = await db.query(sql);
    console.log(result);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});
