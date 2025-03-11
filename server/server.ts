/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import { ClientError, errorMiddleware, authMiddleware } from './lib/index.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

type User = {
  userId: number;
  username: string;
  hashedPassword: string;
};
type Auth = {
  username: string;
  password: string;
};

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const hashKey = process.env.TOKEN_SECRET;
if (!hashKey) throw new Error('TOKEN_SECRET not found in .env');

const app = express();
app.use(express.json());

app.post('/api/auth/sign-up', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new ClientError(400, 'username and password are required fields');
    }
    const hashedPassword = await argon2.hash(password);
    const sql = `
      insert into "users" ("username", "hashedPassword")
      values ($1, $2)
      returning "userId", "username", "createdAt"
    `;
    const params = [username, hashedPassword];
    const result = await db.query<User>(sql, params);
    const [user] = result.rows;
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/sign-in', async (req, res, next) => {
  try {
    const { username, password } = req.body as Partial<Auth>;
    if (!username || !password) {
      throw new ClientError(401, 'invalid login');
    }
    const sql = `
    select "userId",
           "hashedPassword"
      from "users"
     where "username" = $1
  `;
    const params = [username];
    const result = await db.query<User>(sql, params);
    const [user] = result.rows;
    if (!user) {
      throw new ClientError(401, 'invalid login');
    }
    const { userId, hashedPassword } = user;
    if (!(await argon2.verify(hashedPassword, password))) {
      throw new ClientError(401, 'invalid login');
    }
    const payload = { userId, username };
    const token = jwt.sign(payload, hashKey);
    res.json({ token, user: payload });
  } catch (err) {
    next(err);
  }
});

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
app.delete('/api/entries/:entryId', authMiddleware, async (req, res, next) => {
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
