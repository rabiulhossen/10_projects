import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const SQLiteStore = SQLiteStoreFactory(session);
const dataDir = path.resolve(process.cwd(), 'backend', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const sessionMiddleware = session({
	store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
	secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
	resave: false,
	saveUninitialized: false,
	cookie: { httpOnly: true, sameSite: 'lax' },
});

export function getSessionUserId(req) {
	if (!req.session.userId) req.session.userId = uuidv4();
	return req.session.userId;
}