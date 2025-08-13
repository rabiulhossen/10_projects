import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import { sessionMiddleware, getSessionUserId } from './session.js';
import { initDb } from './db.js';
import * as li from './providers/linkedin.js';
import * as fb from './providers/facebook.js';
import * as ig from './providers/instagram.js';
import * as tw from './providers/twitter.js';
import { errorPayload } from './utils.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());
app.use(sessionMiddleware);

app.get('/health', (_, res) => res.send('ok'));

// Auth routes
app.get('/auth/linkedin/start', li.start);
app.get('/auth/linkedin/callback', li.callback);

app.get('/auth/facebook/start', fb.start);
app.get('/auth/facebook/callback', fb.callback);

app.get('/auth/twitter/start', tw.start);
app.get('/auth/twitter/callback', tw.callback);

// Unified post route
app.post('/api/post', async (req, res) => {
	const { text, link, imageUrl, targets = { linkedin: true, facebook: true, twitter: true, instagram: true }, pageId } = req.body;
	const results = {};
	const tasks = [];

	if (targets.linkedin) {
		tasks.push((async () => {
			try {
				const out = await li.post(req, { text, link, imageUrl });
				results.linkedin = { ok: true, id: out.id };
			} catch (err) {
				results.linkedin = { ok: false, error: errorPayload(err) };
			}
		})());
	}
	if (targets.facebook) {
		tasks.push((async () => {
			try {
				const out = await fb.postPage(req, { text, link, imageUrl, pageId });
				results.facebook = { ok: true, id: out.id };
			} catch (err) {
				results.facebook = { ok: false, error: errorPayload(err) };
			}
		})());
	}
	if (targets.twitter) {
		tasks.push((async () => {
			try {
				const out = await tw.post(req, { text });
				results.twitter = { ok: true, id: out.id };
			} catch (err) {
				results.twitter = { ok: false, error: errorPayload(err) };
			}
		})());
	}
	if (targets.instagram) {
		tasks.push((async () => {
			try {
				const out = await ig.post(req, { caption: text, imageUrl, pageId });
				results.instagram = { ok: true, id: out.id };
			} catch (err) {
				results.instagram = { ok: false, error: errorPayload(err) };
			}
		})());
	}

	await Promise.allSettled(tasks);
	res.json({ results });
});

const port = 3000;
initDb().then(() => {
	app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
});