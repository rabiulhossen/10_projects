import axios from 'axios';
import { AuthorizationCode } from 'simple-oauth2';
import { saveToken, loadToken } from '../db.js';
import { getSessionUserId } from '../session.js';

const client = new AuthorizationCode({
	client: { id: process.env.LINKEDIN_CLIENT_ID, secret: process.env.LINKEDIN_CLIENT_SECRET },
	auth: {
		tokenHost: 'https://www.linkedin.com',
		tokenPath: '/oauth/v2/accessToken',
		authorizePath: '/oauth/v2/authorization',
	},
});

const scopes = ['r_liteprofile', 'w_member_social'];

export function start(req, res) {
	const state = getSessionUserId(req);
	const url = client.authorizeURL({ redirect_uri: process.env.LINKEDIN_REDIRECT_URI, scope: scopes.join(' '), state });
	res.redirect(url);
}

export async function callback(req, res) {
	const { code, state } = req.query;
	if (!code || state !== getSessionUserId(req)) return res.status(400).send('Invalid state');
	const tokenParams = { code, redirect_uri: process.env.LINKEDIN_REDIRECT_URI };
	const accessToken = await client.getToken(tokenParams);
	await saveToken(getSessionUserId(req), 'linkedin', accessToken.token);
	res.redirect(`${process.env.FRONTEND_URL}/connected?platform=linkedin`);
}

export async function getAuthorUrn(accessToken) {
	const me = await axios.get('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${accessToken}` } });
	return `urn:li:person:${me.data.id}`;
}

export async function uploadImage(req, imageUrl) {
	const tokens = await loadToken(getSessionUserId(req), 'linkedin');
	const accessToken = tokens?.access_token;
	if (!accessToken) throw new Error('Not connected to LinkedIn');
	const owner = await getAuthorUrn(accessToken);
	const register = await axios.post('https://api.linkedin.com/v2/assets?action=registerUpload', {
		registerUploadRequest: {
			owner,
			recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
			serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
		},
	}, { headers: { Authorization: `Bearer ${accessToken}` } });
	const uploadUrl = register.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
	const asset = register.data.value.asset;
	const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
	await axios.post(uploadUrl, imageResp.data, { headers: { 'Content-Type': 'application/octet-stream' } });
	return asset;
}

export async function post(req, { text, link, imageUrl }) {
	const tokens = await loadToken(getSessionUserId(req), 'linkedin');
	const accessToken = tokens?.access_token;
	if (!accessToken) throw new Error('Not connected to LinkedIn');
	const author = await getAuthorUrn(accessToken);
	const imageAssetUrn = imageUrl ? await uploadImage(req, imageUrl) : undefined;
	const body = {
		author: author,
		lifecycleState: 'PUBLISHED',
		specificContent: {
			'com.linkedin.ugc.ShareContent': {
				shareCommentary: { text },
				shareMediaCategory: imageAssetUrn ? 'IMAGE' : 'NONE',
				media: imageAssetUrn ? [{ status: 'READY', media: imageAssetUrn }] : undefined,
			},
		},
		visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
	};
	const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
		headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
	});
	return { id: resp.data?.id || 'ok' };
}