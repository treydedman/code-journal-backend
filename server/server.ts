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
app.use(express.json());

// get all entries
app.get('/api/entries', async (req, res, next) => {
  try {
    const sql = `
    select *
    from "entries"
    `;

    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// get specific entry
app.get('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId) || +entryId <= 0) {
      throw new ClientError(400, 'entryId must be a positive number');
    }

    const sql = `
    select *
    from "entries"
    where "entryId" = $1;
    `;

    const result = await db.query(sql, [entryId]);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// add new entry
app.post('/api/entries', async (req, res, next) => {
  try {
    const { title, notes, photoUrl } = req.body;
    if (!title || !notes || !photoUrl) {
      throw new ClientError(400, 'all fields are required');
    }

    const sql = `
      insert into "entries"
      ("title", "notes", "photoUrl")
      values ($1, $2, $3)
      returning *;
    `;

    const result = await db.query(sql, [title, notes, photoUrl]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// update an entry
app.put('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const { title, notes, photoUrl } = req.body;
    console.log('title:', title);
    if (!title || !notes || !photoUrl) {
      throw new ClientError(400, 'all fields are required');
    }

    const sql = `
      update "entries"
      set "title" = $1,
          "notes" = $2,
          "photoUrl" = $3
      where "entryId" = $4
      returning *;
    `;

    const result = await db.query(sql, [title, notes, photoUrl, entryId]);
    console.log('result', result);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// delete an entry
app.delete('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId) || +entryId <= 0) {
      throw new ClientError(400, 'entryId must be a positive number');
    }

    const sql = `
    delete
    from "entries"
    where "entryId" = $1
    returning *;
    `;

    const result = await db.query(sql, [entryId]);
    res.status(204).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});
