import { TwitterApi } from 'twitter-api-v2';
import { saveToken, loadToken } from '../db.js';
import { getSessionUserId } from '../session.js';

const appClient = new TwitterApi({
	clientId: process.env.TWITTER_CLIENT_ID,
	clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

export async function start(req, res) {
	const { url, codeVerifier, state } = appClient.generateOAuth2AuthLink(process.env.TWITTER_REDIRECT_URI, { scope: scopes });
	req.session.twitterCodeVerifier = codeVerifier;
	req.session.twitterState = state;
	res.redirect(url);
}

export async function callback(req, res) {
	const { state, code } = req.query;
	if (state !== req.session.twitterState) return res.status(400).send('Invalid state');
	const { accessToken, refreshToken, expiresIn } = await appClient.loginWithOAuth2({
		code,
		codeVerifier: req.session.twitterCodeVerifier,
		redirectUri: process.env.TWITTER_REDIRECT_URI,
	});
	await saveToken(getSessionUserId(req), 'twitter', { accessToken, refreshToken, expiresIn });
	res.redirect(`${process.env.FRONTEND_URL}/connected?platform=twitter`);
}

export async function post(req, { text }) {
	const tokens = await loadToken(getSessionUserId(req), 'twitter');
	if (!tokens?.accessToken) throw new Error('Not connected to Twitter');
	const client = new TwitterApi(tokens.accessToken);
	const resp = await client.v2.tweet({ text });
	return { id: resp.data?.id || 'ok' };
}